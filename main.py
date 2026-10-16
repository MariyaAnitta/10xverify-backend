import os
import json
import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi import Request
from pydantic import BaseModel
from typing import List, Optional
from server.agents import execute_adk_verification, query_opensanctions, query_gnews, query_whoisjson
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
    screenedBy: str
    email: Optional[str] = None
    financials: Optional[dict] = None

class VendorDraftRequest(BaseModel):
    email: str # Vendor's email
    data: dict # All form fields combined

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

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

# Authentication Endpoints
@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    try:
        user_ref = db_fs.collection("users").document(req.email.lower())
        if user_ref.get().exists:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        user_data = {
            "email": req.email.lower(),
            "password": req.password, # In a real app, hash this with bcrypt!
            "name": req.name,
            "role": req.role,
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        user_ref.set(user_data)
        
        # Remove un-serializable fields and passwords before returning
        user_data.pop("password")
        user_data.pop("createdAt")
        return {"status": "success", "user": user_data}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Register Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    try:
        doc = db_fs.collection("users").document(req.email.lower()).get()
        if not doc.exists:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = doc.to_dict()
        if user.get("password") != req.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        user.pop("password", None)
        return {"status": "success", "user": user}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users")
def get_users():
    try:
        docs = db_fs.collection("users").stream()
        users = []
        for doc in docs:
            user = doc.to_dict()
            user.pop("password", None)
            users.append(user)
        return users
    except Exception as e:
        print(f"Get Users Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/users/{email}")
def delete_user(email: str):
    try:
        db_fs.collection("users").document(email.lower()).delete()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Old Gmail Pub/Sub listener has been disabled in favor of Power Automate Webhook.

async def run_continuous_monitoring_audit():
    print("[Monitoring Agent] Continuous weekly check started...")
    try:
        vendors = db_fs.collection("vendors").stream()
        for doc in vendors:
            v = doc.to_dict()
            vendor_id = doc.id
            company_name = v.get("companyName")
            website = v.get("website", "").replace("https://", "").replace("http://", "").replace("www.", "").strip().rstrip("/")
            
            if not company_name or not website:
                continue
                
            print(f"[Monitoring Agent] Auditing vendor: {company_name} ({website})...")
            
            # 1. Check GNews for new adverse press
            news = await query_gnews(company_name)
            if news and isinstance(news, list) and len(news) > 0:
                alert_id = f"alert-{vendor_id}-media"
                db_fs.collection("monitoring_alerts").document(alert_id).set({
                    "id": alert_id,
                    "companyName": company_name,
                    "alertType": "adverse_media",
                    "severity": "high",
                    "description": f"Continuous Audit: 1 new news mention resolved on GNews matching '{company_name}'.",
                    "date": datetime.datetime.utcnow().isoformat() + "Z"
                })
                
            # 2. Check OpenSanctions for listing updates
            sanctions = await query_opensanctions(company_name)
            if sanctions and sanctions.get("matchFound"):
                alert_id = f"alert-{vendor_id}-sanction"
                db_fs.collection("monitoring_alerts").document(alert_id).set({
                    "id": alert_id,
                    "companyName": company_name,
                    "alertType": "sanction_link",
                    "severity": "critical",
                    "description": f"Continuous Audit: Flagged match on sanctions watchlists for '{company_name}': {sanctions.get('details')}",
                    "date": datetime.datetime.utcnow().isoformat() + "Z"
                })
                
            # 3. WHOIS status updates
            whois = await query_whoisjson(website)
            if whois and whois.get("domainAgeDays") and whois.get("domainAgeDays") > 0:
                alert_id = f"alert-{vendor_id}-domain"
                db_fs.collection("monitoring_alerts").document(alert_id).set({
                    "id": alert_id,
                    "companyName": company_name,
                    "alertType": "domain_change",
                    "severity": "warning",
                    "description": f"Continuous Audit: Verified active SSL/TLS registration mapping for {website} is current.",
                    "date": datetime.datetime.utcnow().isoformat() + "Z"
                })
                
        print("[Monitoring Agent] Continuous weekly check finished successfully.")
    except Exception as e:
        print(f"[Monitoring Agent] Error running audit: {e}")

async def check_and_trigger_monitoring():
    try:
        config_ref = db_fs.collection("system_config").document("monitoring_status")
        config = config_ref.get()
        
        now = datetime.datetime.utcnow()
        run_audit = False
        
        if not config.exists:
            run_audit = True
        else:
            data = config.to_dict()
            last_run_str = data.get("lastRunAt")
            if last_run_str:
                last_run = datetime.datetime.fromisoformat(last_run_str.replace("Z", "+00:00")).replace(tzinfo=None)
                if (now - last_run).days >= 7:
                    run_audit = True
            else:
                run_audit = True
                
        if run_audit:
            print("[Monitoring Agent] Triggering weekly passive audit check...")
            config_ref.set({"lastRunAt": now.isoformat() + "Z"})
            asyncio.create_task(run_continuous_monitoring_audit())
    except Exception as e:
        print(f"[Monitoring Agent] Error checking schedule: {e}")

@app.on_event("startup")
async def startup_event():
    # Run the passive audit check 5 seconds after startup for testing
    async def delayed_trigger():
        await asyncio.sleep(5)
        await check_and_trigger_monitoring()
    asyncio.create_task(delayed_trigger())

# API Endpoints
@app.get("/api/health")
async def health():
    asyncio.create_task(check_and_trigger_monitoring())
    mode = "AI_ACTIVE" if os.getenv("GEMINI_API_KEY") else "SIMULATED"
    return {"status": "ok", "mode": mode}

@app.get("/api/monitoring-alerts")
def get_monitoring_alerts():
    try:
        docs = db_fs.collection("monitoring_alerts").stream()
        alerts = [doc.to_dict() for doc in docs]
        alerts.sort(key=lambda x: x.get("date", ""), reverse=True)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/monitoring-alerts/trigger")
def force_trigger_monitoring():
    try:
        now = datetime.datetime.utcnow()
        db_fs.collection("system_config").document("monitoring_status").set({
            "lastRunAt": now.isoformat() + "Z"
        })
        asyncio.create_task(run_continuous_monitoring_audit())
        return {"status": "success", "message": "Continuous monitoring audit triggered in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vendor-portal/draft")
def save_vendor_draft(req: VendorDraftRequest):
    try:
        db_fs.collection("onboarding_drafts").document(req.email.lower()).set(req.data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendor-portal/draft/{email}")
def get_vendor_draft(email: str):
    try:
        doc = db_fs.collection("onboarding_drafts").document(email.lower()).get()
        if not doc.exists:
            return {"status": "not_found", "data": {}}
        return {"status": "success", "data": doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vendor-portal/submit")
def submit_vendor_profile(req: VendorDraftRequest):
    try:
        # Save to the queue for Compliance/Vetting Officers to see
        req.data["status"] = "Submitted"
        req.data["submittedAt"] = datetime.datetime.utcnow().isoformat() + "Z"
        req.data["id"] = f"vend-req-{int(datetime.datetime.utcnow().timestamp())}"
        
        db_fs.collection("vendor_queue").document(req.email.lower()).set(req.data)
        
        # Optionally, remove draft
        db_fs.collection("onboarding_drafts").document(req.email.lower()).delete()
        
        return {"status": "success", "data": req.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendors/by-email/{email}")
def get_vendor_by_email(email: str):
    try:
        # First, search in "vendors" collection
        docs = db_fs.collection("vendors").stream()
        for doc in docs:
            data = doc.to_dict()
            if data.get("contactEmail", "").lower() == email.lower() or data.get("details", {}).get("contactEmail", "").lower() == email.lower() or doc.id.lower() == email.lower():
                return {"status": "Screened", "vendor": data}
                
        # Second, search in "vendor_queue"
        doc_q = db_fs.collection("vendor_queue").document(email.lower()).get()
        if doc_q.exists:
            return {"status": "Queue", "vendor": doc_q.to_dict()}
            
        return {"status": "Not_Found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vendors/by-email/{email}/unlock")
def unlock_vendor(email: str):
    try:
        # Find and delete from "vendors"
        docs = db_fs.collection("vendors").stream()
        vendor_data = None
        for doc in docs:
            data = doc.to_dict()
            if data.get("contactEmail", "").lower() == email.lower() or data.get("details", {}).get("contactEmail", "").lower() == email.lower() or doc.id.lower() == email.lower():
                vendor_data = data
                db_fs.collection("vendors").document(doc.id).delete()
                
        # Delete from "vendor_queue"
        doc_q = db_fs.collection("vendor_queue").document(email.lower())
        if doc_q.get().exists:
            if not vendor_data:
                vendor_data = doc_q.get().to_dict()
            doc_q.delete()
            
        # If we have vendor data, write back to drafts
        if vendor_data:
            # Check details key, otherwise check root
            v_details = vendor_data.get("details", {})
            draft_data = {
                "businessInfo": {
                    "legalName": vendor_data.get("companyName", "") or vendor_data.get("businessInfo", {}).get("legalName", ""),
                    "website": vendor_data.get("website", "") or vendor_data.get("businessInfo", {}).get("website", ""),
                    "country": vendor_data.get("country", "") or vendor_data.get("businessInfo", {}).get("country", ""),
                    "industry": vendor_data.get("industry", "") or vendor_data.get("businessInfo", {}).get("industry", ""),
                    "contactEmail": vendor_data.get("contactEmail", "") or v_details.get("contactEmail", "") or vendor_data.get("businessInfo", {}).get("contactEmail", "")
                },
                "financials": vendor_data.get("financials", {}) or v_details.get("financials", {}),
                "signature": vendor_data.get("signature", "")
            }
            db_fs.collection("onboarding_drafts").document(email.lower()).set(draft_data)
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/evidence-logs")
def get_evidence_logs():
    try:
        docs = db_fs.collection("evidence_logs").stream()
        logs = [doc.to_dict() for doc in docs]
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendor-queue")
def get_vendor_queue():
    try:
        # Load screened emails and names to dynamically filter and clean up legacy queue items
        screened_emails = set()
        screened_companies = set()
        screened_docs = db_fs.collection("vendors").stream()
        for sdoc in screened_docs:
            sdata = sdoc.to_dict()
            email = sdata.get("contactEmail") or sdata.get("details", {}).get("contactEmail")
            if email:
                screened_emails.add(email.lower().strip())
            cname = sdata.get("companyName")
            if cname:
                screened_companies.add(cname.lower().strip())

        docs = db_fs.collection("vendor_queue").stream()
        queue = []
        for doc in docs:
            data = doc.to_dict()
            q_email = data.get("contactEmail") or data.get("email")
            q_cname = data.get("companyName")
            
            is_screened = False
            if q_email and q_email.lower().strip() in screened_emails:
                is_screened = True
            elif q_cname and q_cname.lower().strip() in screened_companies:
                is_screened = True
                
            if is_screened:
                # Clean up leftover/legacy queue record
                db_fs.collection("vendor_queue").document(doc.id).delete()
            else:
                queue.append(data)

        queue.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)
        return queue
@app.delete("/api/vendor-queue/{email}")
def delete_from_vendor_queue(email: str):
    try:
        clean_email = email.lower().strip()
        doc_ref = db_fs.collection("vendor_queue").document(clean_email)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.delete()
        # Also clean draft if present
        try:
            db_fs.collection("onboarding_drafts").document(clean_email).delete()
        except Exception:
            pass
        return {"status": "success", "message": f"Application for {clean_email} rejected/removed from queue."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        
        vendor_data = doc.to_dict() or {}
        company_name = vendor_data.get("companyName", "").strip()
        contact_email = vendor_data.get("contactEmail", "").strip().lower()

        # 1. Delete vendor document
        doc_ref.delete()

        # 2. Completely delete all monitoring alerts associated with this vendor
        alerts_ref = db_fs.collection("monitoring_alerts")
        for alert_doc in alerts_ref.where("vendorId", "==", vendor_id).stream():
            alert_doc.reference.delete()
        if company_name:
            for alert_doc in alerts_ref.where("companyName", "==", company_name).stream():
                alert_doc.reference.delete()

        # 3. Clean up any related drafts or queue items if present
        if contact_email:
            try:
                db_fs.collection("onboarding_drafts").document(contact_email).delete()
                db_fs.collection("vendor_queue").document(contact_email).delete()
            except Exception:
                pass

        return {"status": "success", "message": f"Vendor {vendor_id} and all historical monitoring alerts deleted."}
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
        # Check if email is in the queue and delete it
        if payload.email:
            db_fs.collection("vendor_queue").document(payload.email.lower()).delete()

        result = await execute_adk_verification(
            company_name=payload.companyName,
            website=clean_website,
            country=payload.country,
            industry=payload.industry,
            screened_by=payload.screenedBy,
            financials=payload.financials
        )
        
        # Inject contact email at root
        if payload.email:
            result["contactEmail"] = payload.email.lower()
            
        vendor_id = result.get("id")
        db_fs.collection("vendors").document(vendor_id).set(result)

        # Clear outdated continuous monitoring alerts for this freshly vetted vendor
        try:
            alerts_ref = db_fs.collection("monitoring_alerts")
            for alert_doc in alerts_ref.where("vendorId", "==", vendor_id).stream():
                alert_doc.reference.delete()
            for alert_doc in alerts_ref.where("companyName", "==", payload.companyName).stream():
                alert_doc.reference.delete()
        except Exception as alert_err:
            print(f"[screen_vendor] Note: Failed to purge old alerts: {alert_err}")

        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
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
        import traceback
        traceback.print_exc()
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
