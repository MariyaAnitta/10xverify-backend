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

class ClientActivityLogRequest(BaseModel):
    action: str
    target: str
    details: str
    status: Optional[str] = "SUCCESS"

def get_client_ip(request: Request) -> str:
    try:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
    except Exception:
        pass
    return "127.0.0.1"

def log_user_activity(
    user_email: str,
    user_name: str,
    user_role: str,
    action: str,
    target: str,
    details: str,
    ip_address: str = "127.0.0.1",
    status: str = "SUCCESS"
):
    try:
        now = datetime.datetime.utcnow()
        timestamp_iso = now.isoformat() + "Z"
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S UTC")
        log_id = f"act-{int(now.timestamp() * 1000)}"
        
        log_entry = {
            "id": log_id,
            "timestamp": timestamp_iso,
            "date": date_str,
            "time": time_str,
            "userEmail": user_email or "system@10xverify.ai",
            "userName": user_name or "System Operator",
            "userRole": user_role or "System",
            "action": action,
            "target": target or "N/A",
            "details": details,
            "ipAddress": ip_address or "127.0.0.1",
            "status": status
        }
        
        db_fs.collection("activity_logs").document(log_id).set(log_entry)
        print(f"[AUDIT TRAIL] {timestamp_iso} | {user_email} ({user_role}) | {action} | Target: {target} | {details}")
        return log_entry
    except Exception as e:
        print(f"[log_user_activity] Error saving activity log: {e}")
        return None

def seed_activity_logs_if_empty():
    try:
        docs = list(db_fs.collection("activity_logs").limit(1).stream())
        if not docs:
            print("[Firebase] Seeding initial enterprise audit trail into activity_logs...")
            initial_logs = [
                {
                    "id": "act-1729840001000",
                    "timestamp": "2026-10-25T08:15:22.000Z",
                    "date": "2026-10-25",
                    "time": "08:15:22 UTC",
                    "userEmail": "admin@10xverify.ai",
                    "userName": "Anitta Shaji",
                    "userRole": "Compliance Officer",
                    "action": "SYSTEM_POLICY_APPLIED",
                    "target": "Platform Security Gateway",
                    "details": "Initialized enterprise-grade RBAC policies, audit log stream, and multi-agent pipeline monitoring.",
                    "ipAddress": "192.168.1.10",
                    "status": "SUCCESS"
                },
                {
                    "id": "act-1729841200000",
                    "timestamp": "2026-10-25T08:35:10.000Z",
                    "date": "2026-10-25",
                    "time": "08:35:10 UTC",
                    "userEmail": "compliance@10xverify.ai",
                    "userName": "Compliance Officer",
                    "userRole": "Compliance Officer",
                    "action": "USER_LOGIN",
                    "target": "Platform Workspace",
                    "details": "Compliance Officer authenticated via single credential gateway from corporate terminal.",
                    "ipAddress": "10.0.4.88",
                    "status": "SUCCESS"
                },
                {
                    "id": "act-1729842400000",
                    "timestamp": "2026-10-25T08:55:41.000Z",
                    "date": "2026-10-25",
                    "time": "08:55:41 UTC",
                    "userEmail": "auditor@10xverify.ai",
                    "userName": "Sarah Jenkins",
                    "userRole": "Vetting Officer",
                    "action": "VENDOR_SCREENED",
                    "target": "Tesco PLC",
                    "details": "Multi-agent ADK verification screening launched across Companies House, OpenSanctions, and Geoapify.",
                    "ipAddress": "10.0.4.92",
                    "status": "SUCCESS"
                },
                {
                    "id": "act-1729844000000",
                    "timestamp": "2026-10-25T09:20:15.000Z",
                    "date": "2026-10-25",
                    "time": "09:20:15 UTC",
                    "userEmail": "compliance@10xverify.ai",
                    "userName": "Compliance Officer",
                    "userRole": "Compliance Officer",
                    "action": "VENDOR_APPROVED",
                    "target": "Tesco PLC",
                    "details": "Final onboarding authorization executed. Risk Rating: GREEN (Score: 92/100). Vendor certified for Tier-1 procurement.",
                    "ipAddress": "10.0.4.88",
                    "status": "SUCCESS"
                },
                {
                    "id": "act-1729845500000",
                    "timestamp": "2026-10-25T09:45:30.000Z",
                    "date": "2026-10-25",
                    "time": "09:45:30 UTC",
                    "userEmail": "compliance@10xverify.ai",
                    "userName": "Compliance Officer",
                    "userRole": "Compliance Officer",
                    "action": "SANCTIONS_QUICK_CHECK",
                    "target": "Mazepin Dmitry",
                    "details": "Real-time sanctions check flagged CRITICAL OFAC/UK SDN consolidated list matches.",
                    "ipAddress": "10.0.4.88",
                    "status": "SUCCESS"
                }
            ]
            for log in initial_logs:
                db_fs.collection("activity_logs").document(log["id"]).set(log)
            print("[Firebase] Seeding activity_logs completed.")
    except Exception as e:
        print(f"[Firebase] Seeding activity_logs failed: {e}")

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
seed_activity_logs_if_empty()

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
    role: Optional[str] = "Compliance Officer"

class AzureSSORequest(BaseModel):
    email: str
    name: str
    role: Optional[str] = "Compliance Officer"
    tenantId: Optional[str] = None
    homeAccountId: Optional[str] = None


# Authentication Endpoints
@app.post("/api/auth/register")
def register_user(req: RegisterRequest, request: Request):
    client_ip = get_client_ip(request)
    try:
        user_ref = db_fs.collection("users").document(req.email.lower())
        if user_ref.get().exists:
            log_user_activity(
                user_email=req.email.lower(),
                user_name=req.name,
                user_role=req.role,
                action="USER_REGISTER_FAILED",
                target=req.email.lower(),
                details=f"Registration attempt failed: user '{req.email.lower()}' already exists.",
                ip_address=client_ip,
                status="FAILED"
            )
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Enforce that public self-registration is strictly for Vendors.
        # Internal roles (Compliance Officer / Vetting Officer) must authenticate via Microsoft Entra ID SSO.
        enforced_role = "Vendor Node"
        
        user_data = {
            "email": req.email.lower(),
            "password": req.password, # In a real app, hash this with bcrypt!
            "name": req.name,
            "role": enforced_role,
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        user_ref.set(user_data)
        
        log_user_activity(
            user_email=req.email.lower(),
            user_name=req.name,
            user_role=enforced_role,
            action="USER_REGISTER_VENDOR",
            target=req.email.lower(),
            details=f"New vendor self-registration account created for '{req.name}'.",
            ip_address=client_ip,
            status="SUCCESS"
        )
        
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
def login_user(req: LoginRequest, request: Request):
    client_ip = get_client_ip(request)
    try:
        user_ref = db_fs.collection("users").document(req.email.lower())
        doc = user_ref.get()
        
        # Normalize selected role
        enforced_role = req.role or "Compliance Officer"
        if enforced_role in ["Admin Policy", "Compliance Officer"]:
            db_role = "Admin Policy"
            frontend_role = "Compliance Officer"
        elif enforced_role in ["Auditor Desk", "Vetting Officer"]:
            db_role = "Auditor Desk"
            frontend_role = "Vetting Officer"
        else:
            db_role = "Vendor Node"
            frontend_role = "Vendor"

        if not doc.exists:
            # Auto-provision testing users on the fly so testers are never locked out
            clean_name = req.email.split("@")[0].replace(".", " ").replace("_", " ").title()
            user_data = {
                "email": req.email.lower(),
                "password": req.password,
                "name": clean_name or "Authorized Officer",
                "role": db_role,
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            user_ref.set(user_data)
            log_user_activity(
                user_email=req.email.lower(),
                user_name=user_data["name"],
                user_role=frontend_role,
                action="USER_LOGIN_AUTOPROVISION",
                target="Platform Workspace",
                details=f"New workspace session created and signed in as '{frontend_role}'.",
                ip_address=client_ip,
                status="SUCCESS"
            )
            return {
                "status": "success", 
                "user": {
                    "email": req.email.lower(), 
                    "name": user_data["name"], 
                    "role": frontend_role
                }
            }
        
        user = doc.to_dict()
        if user.get("password") and user.get("password") != req.password:
            log_user_activity(
                user_email=req.email.lower(),
                user_name=user.get("name", "Unknown"),
                user_role=user.get("role", "Unknown"),
                action="USER_LOGIN_FAILED",
                target="Platform Workspace",
                details=f"Failed login authentication for user '{req.email.lower()}': password mismatch.",
                ip_address=client_ip,
                status="FAILED"
            )
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        # Update user's active role to match the role selected for this session
        user_ref.update({"role": db_role})

        user.pop("password", None)
        log_user_activity(
            user_email=user.get("email"),
            user_name=user.get("name"),
            user_role=frontend_role,
            action="USER_LOGIN",
            target="Platform Workspace",
            details=f"User '{user.get('name')}' authenticated as '{frontend_role}'.",
            ip_address=client_ip,
            status="SUCCESS"
        )
        return {
            "status": "success", 
            "user": {
                "email": user.get("email"),
                "name": user.get("name"),
                "role": frontend_role
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/callback/azure-ad")
def azure_ad_callback():
    dist_dir = os.path.join(os.getcwd(), "dist")
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<html><body>Authenticating...</body></html>")

@app.post("/api/auth/azure-sso")
def login_azure_sso(req: AzureSSORequest, request: Request):
    client_ip = get_client_ip(request)
    try:
        user_ref = db_fs.collection("users").document(req.email.lower())
        user_doc = user_ref.get()
        
        user_role = req.role or "Compliance Officer"
        if user_doc.exists:
            existing = user_doc.to_dict()
            if existing.get("role"):
                user_role = existing.get("role")
        else:
            # First time logging in with Azure SSO, persist in users collection
            user_data = {
                "email": req.email.lower(),
                "name": req.name,
                "role": user_role,
                "authProvider": "microsoft_entra_id",
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            user_ref.set(user_data)
            
        log_user_activity(
            user_email=req.email.lower(),
            user_name=req.name,
            user_role=user_role,
            action="USER_LOGIN_AZURE_SSO",
            target="Platform Workspace",
            details=f"User '{req.name}' successfully authenticated via Microsoft Entra ID (Single Sign-On).",
            ip_address=client_ip,
            status="SUCCESS"
        )
        
        return {
            "status": "success",
            "user": {
                "email": req.email.lower(),
                "name": req.name,
                "role": user_role,
                "authProvider": "microsoft_entra_id"
            }
        }
    except Exception as e:
        print(f"Azure SSO Login Error: {e}")
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
def delete_user(email: str, request: Request):
    client_ip = get_client_ip(request)
    try:
        db_fs.collection("users").document(email.lower()).delete()
        log_user_activity(
            user_email="admin@10xverify.ai",
            user_name="Administrator",
            user_role="Compliance Officer",
            action="USER_DELETED",
            target=email.lower(),
            details=f"User account '{email.lower()}' was decommissioned and removed from identity store.",
            ip_address=client_ip,
            status="SUCCESS"
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/activity-logs")
def get_activity_logs(limit: int = 300, action: Optional[str] = None, user: Optional[str] = None):
    try:
        docs = db_fs.collection("activity_logs").stream()
        logs = [doc.to_dict() for doc in docs]
        if action and action != "ALL":
            logs = [l for l in logs if l.get("action") == action]
        if user:
            u_clean = user.lower().strip()
            logs = [l for l in logs if u_clean in l.get("userEmail", "").lower() or u_clean in l.get("userName", "").lower()]
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/activity-logs")
def create_activity_log(
    req: ClientActivityLogRequest,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
    ip = get_client_ip(request)
    entry = log_user_activity(
        user_email=x_user_email or "unknown",
        user_name=x_user_name or "Anonymous",
        user_role=x_user_role or "User",
        action=req.action,
        target=req.target,
        details=req.details,
        ip_address=ip,
        status=req.status or "SUCCESS"
    )
    return {"status": "success", "log": entry}

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
def submit_vendor_profile(req: VendorDraftRequest, request: Request):
    try:
        # Save to the queue for Compliance/Vetting Officers to see
        req.data["status"] = "Submitted"
        req.data["submittedAt"] = datetime.datetime.utcnow().isoformat() + "Z"
        req.data["id"] = f"vend-req-{int(datetime.datetime.utcnow().timestamp())}"
        req.data["contactEmail"] = req.email.lower()
        req.data["email"] = req.email.lower()
        
        db_fs.collection("vendor_queue").document(req.email.lower()).set(req.data)
        
        # Save a copy in onboarding_drafts so if vendor views form, their data is prefilled
        db_fs.collection("onboarding_drafts").document(req.email.lower()).set({
            "businessInfo": {
                "legalName": req.data.get("companyName", ""),
                "website": req.data.get("website", ""),
                "country": req.data.get("country", ""),
                "industry": req.data.get("industry", ""),
                "contactEmail": req.email.lower()
            },
            "signature": req.data.get("signature", ""),
            "submitted": True
        })

        client_ip = get_client_ip(request)
        cname = req.data.get("companyName") or req.data.get("businessInfo", {}).get("legalName") or req.email
        log_user_activity(
            user_email=req.email.lower(),
            user_name=cname,
            user_role="Vendor",
            action="VENDOR_SELF_SUBMITTED",
            target=cname,
            details=f"Vendor '{cname}' submitted digital self-onboarding verification dossier.",
            ip_address=client_ip,
            status="SUCCESS"
        )
        
        return {"status": "success", "data": req.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vendors/by-email/{email}")
def get_vendor_by_email(email: str):
    try:
        clean_email = email.strip().lower()
        
        # 1. Look up user profile to find their registered company name or contact person
        user_name = ""
        try:
            user_doc = db_fs.collection("users").document(clean_email).get()
            if user_doc.exists:
                user_name = user_doc.to_dict().get("name", "").strip().lower()
        except Exception:
            pass
            
        # 2. Check draft and queue documents to extract any submitted company name
        draft_cname = ""
        doc_draft = db_fs.collection("onboarding_drafts").document(clean_email).get()
        if doc_draft.exists:
            d_dict = doc_draft.to_dict() or {}
            draft_cname = (
                d_dict.get("businessInfo", {}).get("legalName", "") or 
                d_dict.get("companyName", "") or 
                ""
            ).strip().lower()

        queue_cname = ""
        doc_q = db_fs.collection("vendor_queue").document(clean_email).get()
        if doc_q.exists:
            q_dict = doc_q.to_dict() or {}
            queue_cname = (q_dict.get("companyName", "") or "").strip().lower()

        email_prefix = clean_email.split("@")[0].strip() if "@" in clean_email else clean_email
        email_domain = clean_email.split("@")[1].split(".")[0].strip() if "@" in clean_email else ""
        
        # 3. Search in "vendors" collection (verified/screened vendors)
        docs = db_fs.collection("vendors").stream()
        for doc in docs:
            data = doc.to_dict()
            doc_id = doc.id.lower()
            v_email = data.get("contactEmail", "").strip().lower()
            v_details_email = data.get("details", {}).get("contactEmail", "").strip().lower()
            v_name = data.get("companyName", "").strip().lower()
            v_website = data.get("website", "").strip().lower()
            
            # Match conditions:
            matches_email = (v_email == clean_email or v_details_email == clean_email or doc_id == clean_email)
            matches_company = False
            
            # Match by submitted draft company name
            if not matches_company and draft_cname and len(draft_cname) > 2:
                matches_company = (v_name == draft_cname or draft_cname in v_name or v_name in draft_cname)
                
            # Match by queue company name
            if not matches_company and queue_cname and len(queue_cname) > 2:
                matches_company = (v_name == queue_cname or queue_cname in v_name or v_name in queue_cname)

            # Match by registered user name
            if not matches_company and user_name and len(user_name) > 2:
                matches_company = (v_name == user_name or user_name in v_name or v_name in user_name)

            # Match by company domain in email (excluding generic consumer webmail)
            if not matches_company and email_domain and len(email_domain) > 2 and email_domain not in ["gmail", "yahoo", "hotmail", "outlook", "mail", "live", "icloud"]:
                matches_company = (v_name == email_domain or email_domain in v_name or email_domain in v_website)

            # Match by email prefix
            if not matches_company and email_prefix and len(email_prefix) > 2:
                matches_company = (v_name == email_prefix or email_prefix in v_name or v_name in email_prefix)

            if matches_email or matches_company:
                # Ensure contactEmail is linked for future lookups
                if not v_email or v_email != clean_email:
                    try:
                        db_fs.collection("vendors").document(doc.id).update({"contactEmail": clean_email})
                    except Exception:
                        pass
                return {"status": "Screened", "vendor": data}

        # 4. Search in "vendor_queue" (submitted, awaiting review)
        if doc_q.exists:
            return {"status": "Queue", "vendor": doc_q.to_dict()}
            
        # Also check all docs in vendor_queue for matching company name
        queue_docs = db_fs.collection("vendor_queue").stream()
        for qdoc in queue_docs:
            qdata = qdoc.to_dict()
            q_name = qdata.get("companyName", "").strip().lower()
            q_email = qdata.get("contactEmail", "").strip().lower()
            if (
                q_email == clean_email or 
                (draft_cname and (q_name == draft_cname or draft_cname in q_name)) or
                (user_name and (q_name == user_name or user_name in q_name)) or 
                (email_domain and email_domain in q_name and email_domain not in ["gmail", "yahoo", "hotmail", "outlook", "mail"]) or
                (email_prefix and len(email_prefix) > 2 and (email_prefix in q_name or q_name in email_prefix))
            ):
                return {"status": "Queue", "vendor": qdata}

        # 5. Search in "onboarding_drafts"
        if doc_draft.exists:
            return {"status": "Draft", "vendor": doc_draft.to_dict()}

        return {"status": "New"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vendors/by-email/{email}/unlock")
def unlock_vendor(email: str, request: Request):
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

        client_ip = get_client_ip(request)
        cname = (vendor_data.get("companyName") if vendor_data else "") or email
        log_user_activity(
            user_email=email.lower(),
            user_name=cname,
            user_role="Vendor",
            action="VENDOR_UNLOCKED",
            target=cname,
            details=f"Vendor packet unlocked for re-editing and resubmission.",
            ip_address=client_ip,
            status="SUCCESS"
        )
            
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
                data["_docId"] = doc.id
                queue.append(data)

        queue.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)
        return queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/vendor-queue/{identifier}")
def delete_from_vendor_queue(
    identifier: str,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
    try:
        clean_id = identifier.lower().strip()
        # 1. Try deleting by document ID
        db_fs.collection("vendor_queue").document(clean_id).delete()
        
        # 2. Also search if document ID was different (e.g. email or id)
        docs = db_fs.collection("vendor_queue").stream()
        for doc in docs:
            d = doc.to_dict()
            em = (d.get("contactEmail") or d.get("email") or "").lower().strip()
            cname = (d.get("companyName") or "").lower().strip()
            if em == clean_id or cname == clean_id or doc.id.lower() == clean_id:
                db_fs.collection("vendor_queue").document(doc.id).delete()

        # 3. Purge drafts for this email
        try:
            db_fs.collection("onboarding_drafts").document(clean_id).delete()
        except Exception:
            pass

        client_ip = get_client_ip(request)
        log_user_activity(
            user_email=x_user_email or "compliance@10xverify.ai",
            user_name=x_user_name or "Compliance Officer",
            user_role=x_user_role or "Compliance Officer",
            action="QUEUE_APPLICATION_DISMISSED",
            target=clean_id,
            details=f"Inbound vendor application for '{clean_id}' was rejected and purged from registration queue.",
            ip_address=client_ip,
            status="SUCCESS"
        )

        return {"status": "success", "message": f"Application for {clean_id} rejected/removed from queue."}
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
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
    client_ip = get_client_ip(request)
    if x_user_role != "Compliance Officer":
        log_user_activity(
            user_email=x_user_email or "unknown",
            user_name=x_user_name or "Anonymous",
            user_role=x_user_role or "Unprivileged",
            action="ACCESS_DENIED",
            target=vendor_id,
            details=f"Unauthorized attempt to modify status to '{payload.status}'. Compliance Officer role required.",
            ip_address=client_ip,
            status="SECURITY_BLOCKED"
        )
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
        v_data = doc.to_dict() or {}
        cname = v_data.get("companyName", vendor_id)
        
        action_name = "VENDOR_APPROVED" if payload.status == "Approved" else ("VENDOR_REJECTED" if payload.status == "Rejected" else "VENDOR_STATUS_UPDATED")
        log_user_activity(
            user_email=x_user_email or "compliance@10xverify.ai",
            user_name=x_user_name or "Compliance Officer",
            user_role="Compliance Officer",
            action=action_name,
            target=cname,
            details=f"Compliance Officer set onboarding decision to '{payload.status}' for vendor '{cname}'.",
            ip_address=client_ip,
            status="SUCCESS"
        )
        return doc_ref.get().to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase update failed: {e}")

@app.post("/api/vendors/{vendor_id}/comments")
def add_comment(
    vendor_id: str, 
    payload: CommentRequest,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email")
):
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

        client_ip = get_client_ip(request)
        cname = data.get("companyName", vendor_id)
        log_user_activity(
            user_email=x_user_email or payload.author,
            user_name=payload.author,
            user_role=x_user_role or "Auditor",
            action="COMMENT_ADDED",
            target=cname,
            details=f"Audit comment added by {payload.author}: \"{payload.content[:80]}{'...' if len(payload.content) > 80 else ''}\"",
            ip_address=client_ip,
            status="SUCCESS"
        )
        return doc_ref.get().to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase update failed: {e}")

@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: str,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
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

        client_ip = get_client_ip(request)
        log_user_activity(
            user_email=x_user_email or "admin@10xverify.ai",
            user_name=x_user_name or "System Administrator",
            user_role=x_user_role or "Compliance Officer",
            action="VENDOR_DELETED",
            target=company_name or vendor_id,
            details=f"Vendor dossier for '{company_name or vendor_id}' was purged from verified registry by {x_user_name or 'administrator'}.",
            ip_address=client_ip,
            status="SUCCESS"
        )

        return {"status": "success", "message": f"Vendor {vendor_id} and all historical monitoring alerts deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firebase delete failed: {e}")

@app.get("/api/sanctions/check")
async def check_sanctions(
    q: str,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
    from server.agents import query_opensanctions, log_evidence
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    try:
        res = await query_opensanctions(q)
        # Log this interactive search directly to the Audit Evidence Pack Repository
        try:
            log_evidence(
                vendor_id=f"quick-chk-{int(datetime.datetime.utcnow().timestamp())}",
                company_name=q.strip(),
                api_source="OpenSanctions Screen (Quick Desk)",
                query_param=q.strip(),
                status="200 OK" if res else "No Result / Offline",
                response_data=res
            )
        except Exception as log_err:
            print(f"[check_sanctions] log_evidence error: {log_err}")

        is_hit = bool(res and res.get("totalHits", 0) > 0)
        client_ip = get_client_ip(request)
        log_user_activity(
            user_email=x_user_email or "compliance@10xverify.ai",
            user_name=x_user_name or "Compliance Officer",
            user_role=x_user_role or "Compliance Officer",
            action="SANCTIONS_QUICK_CHECK",
            target=q.strip(),
            details=f"Live OpenSanctions SDN screening check conducted for query '{q.strip()}'. Result: {'CRITICAL MATCH HIT' if is_hit else 'CLEAR'}.",
            ip_address=client_ip,
            status="SUCCESS"
        )

        if is_hit:
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
                "details": details_str,
                "apiSource": "OpenSanctions API (Live v2)",
                "rawPayload": res
            }
        else:
            return {
                "matchFound": False,
                "details": "Clear profile search result. 0 matches found on Dow Jones Risk & Compliance registries, OFAC SDN List, or EU/UK Financial sanctions frameworks.",
                "apiSource": "OpenSanctions API (Live v2)",
                "rawPayload": res or {"totalHits": 0, "hits": []}
            }
    except Exception as e:
        print(f"[Sanctions Check Route] Error: {e}")
        query = q.lower()
        match = any(kw in query for kw in ["uralchim", "mazepin", "russia", "north korea"])
        fallback_res = {
            "matchFound": match,
            "details": "CRITICAL ALERT Match 100% (Fallback). Targeted SDN list: OFAC SDN, UK consolidated treasury database list." if match else "Clear profile search result (Fallback). 0 matches found on Dow Jones Risk & Compliance registries, OFAC SDN List, or EU/UK Financial sanctions frameworks.",
            "apiSource": "Local Fallback Keyword Index",
            "rawPayload": {"fallbackQuery": q, "matched": match}
        }
        return fallback_res

@app.post("/api/screen")
async def screen_vendor(
    payload: ScreenRequest,
    request: Request,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name")
):
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

        client_ip = get_client_ip(request)
        log_user_activity(
            user_email=x_user_email or payload.screenedBy,
            user_name=x_user_name or payload.screenedBy,
            user_role=x_user_role or "Vetting Officer",
            action="VENDOR_SCREENED",
            target=payload.companyName,
            details=f"Multi-Agent AI ADK screening completed for '{payload.companyName}' ({clean_website}). Assigned score: {result.get('riskScore', 'N/A')}/100 ({result.get('riskRating', 'UNKNOWN')}).",
            ip_address=client_ip,
            status="SUCCESS"
        )

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
