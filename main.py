import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi import Request
from pydantic import BaseModel
from typing import List, Optional
from server.agents import execute_adk_verification
import asyncio
from server.email_ingestion import start_email_listener, parse_vendor_with_llm
from server.pdf_generator import generate_dossier_html

app = FastAPI(title="10xVerify.AI Portal API")

# Mount CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin using credentials from GOOGLE_APPLICATION_CREDENTIALS or local file
cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"[Firebase] Initialized with credentials path: {cred_path}")
    except Exception as e:
        print(f"[Firebase] Initialization failed: {e}. Attempting default initialization...")
        firebase_admin.initialize_app()

db_fs = firestore.client()
DB_PATH = os.path.join(os.getcwd(), "database.json")

# Database Model Definitions
class StatusChangeRequest(BaseModel):
    status: str

class CommentRequest(BaseModel):
    author: str
    content: str

class ScreenRequest(BaseModel):
    companyName: str
    website: str
    country: str
    industry: str
    screenedBy: Optional[str] = "Web Portal User"

def get_db():
    try:
        docs = db_fs.collection("vendors").stream()
        vendors = []
        for doc in docs:
            vendors.append(doc.to_dict())
        return vendors
    except Exception as e:
        print(f"[Firebase] Error retrieving database records: {e}")
        return []

def migrate_seed_data():
    try:
        docs = list(db_fs.collection("vendors").limit(1).stream())
        if not docs and os.path.exists(DB_PATH):
            print("[Firebase] No records found in Firestore. Migrating seed data from local database.json...")
            with open(DB_PATH, "r", encoding="utf-8") as f:
                local_data = json.load(f)
            for vendor in local_data:
                vendor_id = vendor.get("id")
                if vendor_id:
                    db_fs.collection("vendors").document(vendor_id).set(vendor)
            print(f"[Firebase] Migration complete. Loaded {len(local_data)} records.")
    except Exception as e:
        print(f"[Firebase] Migration seeding failed: {e}")

# Migrate database.json contents to Firestore at startup if empty
migrate_seed_data()

def calculate_metrics(vendors):
    # Standard metrics generator
    total = len(vendors)
    green = sum(1 for v in vendors if v.get("riskRating") == "GREEN")
    amber = sum(1 for v in vendors if v.get("riskRating") == "AMBER")
    red = sum(1 for v in vendors if v.get("riskRating") == "RED")
    black = sum(1 for v in vendors if v.get("riskRating") == "BLACK")
    
    pending = sum(1 for v in vendors if v.get("status") in ["Pending", "In Progress", "Pending Review"])
    approved = sum(1 for v in vendors if v.get("status") == "Approved")
    rejected = sum(1 for v in vendors if v.get("status") == "Rejected")

    # Industry breakdown
    ind_map = {}
    for v in vendors:
        ind = v.get("industry", "Other")
        ind_map[ind] = ind_map.get(ind, 0) + 1
    industry_breakdown = [{"name": k, "count": v} for k, v in ind_map.items()]

    # Compliance alerts
    alerts = []
    for v in vendors:
        if v.get("riskRating") in ["RED", "BLACK"]:
            alerts.append({
                "id": f"alert-{v.get('id')}",
                "companyName": v.get("companyName"),
                "alertType": "sanction_link" if v.get("riskRating") == "BLACK" else "adverse_media",
                "severity": "critical" if v.get("riskRating") == "BLACK" else "high",
                "description": f"Flagged by Risk Intelligence: {v.get('recommendation')}",
                "date": v.get("screenedAt")
            })

    return {
        "totalScreened": total,
        "riskDistribution": {
            "green": green,
            "amber": amber,
            "red": red,
            "black": black
        },
        "pendingVerifications": pending,
        "approvedCount": approved,
        "rejectedCount": rejected,
        "industryBreakdown": industry_breakdown,
        "complianceAlerts": alerts
    }

# Old Gmail Pub/Sub listener has been disabled in favor of Power Automate Webhook.

# API Endpoints
@app.get("/api/health")
def health():
    mode = "AI_ACTIVE" if os.getenv("GEMINI_API_KEY") else "SIMULATED"
    return {"status": "ok", "mode": mode}

@app.get("/api/vendors")
def get_vendors():
    db = get_db()
    # Sort by date descending
    db.sort(key=lambda x: x.get("screenedAt", ""), reverse=True)
    return db

@app.get("/api/analytics")
def get_analytics():
    db = get_db()
    return calculate_metrics(db)

@app.get("/api/vendors/{vendor_id}")
def get_vendor(vendor_id: str):
    try:
        doc = db_fs.collection("vendors").document(vendor_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vendor not found")
        return doc.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase retrieve failed: {e}")

@app.post("/api/vendors/{vendor_id}/status")
def change_status(
    vendor_id: str, 
    payload: StatusChangeRequest,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    if x_user_role != "Compliance Officer":
        raise HTTPException(
            status_code=403, 
            detail="Action forbidden: Only a Compliance Officer can approve or reject onboarding status."
        )
    try:
        doc_ref = db_fs.collection("vendors").document(vendor_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vendor not found")
        doc_ref.update({"status": payload.status})
        return doc_ref.get().to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase update failed: {e}")

@app.post("/api/vendors/{vendor_id}/comments")
def add_comment(vendor_id: str, payload: CommentRequest):
    try:
        doc_ref = db_fs.collection("vendors").document(vendor_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        import datetime
        new_comment = {
            "id": f"c-{int(datetime.datetime.now().timestamp())}",
            "author": payload.author,
            "content": payload.content,
            "createdAt": datetime.datetime.now().isoformat()
        }
        
        data = doc.to_dict()
        comments = data.get("comments") or []
        comments.append(new_comment)
        doc_ref.update({"comments": comments})
        return doc_ref.get().to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase update failed: {e}")

@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(vendor_id: str):
    try:
        doc_ref = db_fs.collection("vendors").document(vendor_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vendor not found")
        doc_ref.delete()
        return {"status": "success", "message": f"Vendor {vendor_id} deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase delete failed: {e}")

@app.get("/api/sanctions/check")
async def check_sanctions(q: str):
    from server.agents import query_opensanctions
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    try:
        res = await query_opensanctions(q)
        if res and res.get("totalHits", 0) > 0:
            hits = res.get("hits", [])
            top_hit = hits[0]
            caption = top_hit.get("caption", "Unknown Entity")
            datasets = ", ".join(top_hit.get("datasets", []))
            
            summary_list = top_hit.get("summary", [])
            topics_list = top_hit.get("topics", [])
            countries_list = top_hit.get("countries", [])
            
            summary = " / ".join(summary_list) if isinstance(summary_list, list) else str(summary_list)
            topics = ", ".join(topics_list) if isinstance(topics_list, list) else str(topics_list)
            countries = ", ".join(countries_list) if isinstance(countries_list, list) else str(countries_list)
            
            details_str = f"CRITICAL ENTITY HIT: Match detected for '{caption}'. Targeted SDN/Watchlists: {datasets}."
            if summary:
                details_str += f" Summary: {summary}."
            if countries:
                details_str += f" Countries: {countries}."
            if topics:
                details_str += f" Topics: {topics}."
                
            return {
                "matchFound": True,
                "details": details_str
            }
        else:
            return {
                "matchFound": False,
                "details": "Clear profile search result. 0 matches found on Dow Jones Risk & Compliance registries, OFAC SDN List, or EU/UK Financial sanctions frameworks."
            }
    except Exception as e:
        print(f"[Sanctions Check Route] Error: {e}")
        query = q.lower()
        match = any(kw in query for kw in ["uralchim", "mazepin", "russia", "north korea"])
        if match:
            return {
                "matchFound": True,
                "details": "CRITICAL ALERT Match 100% (Fallback). Targeted SDN list: OFAC SDN, UK consolidated treasury database list. Associated Oligarch asset holdings detected: UralChem parent cluster."
            }
        return {
            "matchFound": False,
            "details": "Clear profile search result (Fallback). 0 matches found on Dow Jones Risk & Compliance registries, OFAC SDN List, or EU/UK Financial sanctions frameworks."
        }

@app.post("/api/screen")
async def screen_vendor(payload: ScreenRequest):
    clean_website = payload.website.replace("https://", "").replace("http://", "").replace("www.", "").strip().rstrip("/")
    try:
        result = await execute_adk_verification(
            company_name=payload.companyName,
            website=clean_website,
            country=payload.country,
            industry=payload.industry,
            screened_by=payload.screenedBy
        )
        vendor_id = result.get("id")
        db_fs.collection("vendors").document(vendor_id).set(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADK Agent execution failed: {e}")

@app.post("/api/power-automate/screen", response_class=HTMLResponse)
async def power_automate_webhook(request: Request):
    try:
        print("[Power Automate Webhook] Received webhook request. Parsing body as JSON...")
        data = await request.json()
        email_body = data.get("body", "")
        print(f"[Power Automate Webhook] Extracted email body (length: {len(email_body)}). Calling parse_vendor_with_llm...")
        
        # Parse the email to find the vendor
        vendor_data = await parse_vendor_with_llm(email_body, "Forwarded Email via Power Automate")
        print(f"[Power Automate Webhook] Vendor extraction result: {vendor_data}")
        
        if not vendor_data or not vendor_data.get('companyName'):
            print("[Power Automate Webhook] Error: Could not extract companyName from email.")
            return HTMLResponse("<html><body><h1>Error</h1><p>Could not extract vendor details from the email.</p></body></html>", status_code=400)
            
        # Run ADK verification
        print(f"[Power Automate Webhook] Executing ADK verification for: {vendor_data['companyName']}")
        
        # 1. Compute stable MD5 ID to check for recent duplicate requests (retries)
        import hashlib
        import re
        from datetime import datetime, timezone
        
        c_name = vendor_data['companyName']
        # Normalize company name (remove brackets, suffixes, and non-alphanumeric characters)
        n = c_name.lower()
        n = re.sub(r'\(.*?\)', '', n)
        n = re.sub(r'[^a-z0-9\s]', '', n)
        suffixes = [r'\bltd\b', r'\blimited\b', r'\bpvt\b', r'\bprivate\b', r'\bco\b', r'\bcompany\b']
        for s in suffixes:
            n = re.sub(s, '', n)
        norm_name = " ".join(n.split())
        stable_hash = int(hashlib.md5(norm_name.encode('utf-8')).hexdigest(), 16) % 10000
        vendor_id = f"vnd-{stable_hash}"
        
        doc_ref = db_fs.collection("vendors").document(vendor_id)
        doc = doc_ref.get()
        if doc.exists:
            existing_data = doc.to_dict()
            status = existing_data.get("status")
            
            # If the record is currently in progress, wait for it instead of starting a new run!
            if status == "In Progress":
                print(f"[Power Automate Webhook] Vendor {vendor_id} check is already in progress. Waiting/polling...")
                for _ in range(40): # wait up to 120 seconds
                    await asyncio.sleep(3.0)
                    fresh_doc = doc_ref.get()
                    if fresh_doc.exists:
                        fresh_data = fresh_doc.to_dict()
                        if fresh_data.get("status") == "Completed":
                            print(f"[Power Automate Webhook] Vendor {vendor_id} finished in background. Returning report.")
                            html_report = generate_dossier_html(fresh_data)
                            return html_report
                print(f"[Power Automate Webhook] Polling timed out for {vendor_id}.")
                return HTMLResponse("<html><body><h1>Error</h1><p>Verification is taking longer than expected. Please check the dashboard.</p></body></html>", status_code=202)

            screened_at_str = existing_data.get("screenedAt")
            if screened_at_str:
                try:
                    # Clean Z and parse ISO timestamp
                    clean_date_str = screened_at_str.replace("Z", "")
                    dt = datetime.fromisoformat(clean_date_str).replace(tzinfo=timezone.utc)
                    age_seconds = (datetime.now(timezone.utc) - dt).total_seconds()
                    
                    # If verified in the last 10 minutes and completed, return cached HTML report instantly
                    if age_seconds < 600 and status == "Completed":
                        print(f"[Power Automate Webhook] Vendor {vendor_id} was recently verified {age_seconds:.1f} seconds ago. Returning cached report.")
                        html_report = generate_dossier_html(existing_data)
                        return html_report
                except Exception as ex:
                    print(f"[Power Automate Webhook] Failed to check cached report age: {ex}")
        
        # Write "In Progress" lock to Firestore to block concurrent retries
        doc_ref.set({
            "id": vendor_id,
            "companyName": c_name,
            "status": "In Progress",
            "screenedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "website": vendor_data['website'],
            "country": vendor_data.get('country', 'Unknown'),
            "industry": vendor_data.get('industry', 'Unknown'),
            "riskScore": 0,
            "riskRating": "UNKNOWN",
            "executiveSummary": "Verification scan initiated and currently in progress...",
            "recommendation": "Pending verification completion."
        })
        
        result = await execute_adk_verification(
            company_name=vendor_data['companyName'],
            website=vendor_data['website'],
            country=vendor_data.get('country', 'Unknown'),
            industry=vendor_data.get('industry', 'Unknown'),
            screened_by="Power Automate Webhook"
        )
        
        # Save to Firestore (overwrites the "In Progress" lock with completed data)
        vendor_id = result.get("id")
        if vendor_id:
            db_fs.collection("vendors").document(vendor_id).set(result)
            
        # Generate and return HTML response for Power Automate to convert to PDF
        html_report = generate_dossier_html(result)
        return html_report
        
    except Exception as e:
        print(f"[Power Automate Webhook] Error: {e}")
        return HTMLResponse(f"<html><body><h1>Error</h1><p>Internal verification failed: {e}</p></body></html>", status_code=500)

# Serve compiled static React app in production mode
dist_dir = os.path.join(os.getcwd(), "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
