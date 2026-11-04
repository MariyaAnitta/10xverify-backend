import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, firestore

def delete_tesco_data(target_email: str = None):
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    collections = [
        "users",
        "vendors",
        "vendor_queue",
        "onboarding_drafts",
        "evidence_logs",
        "monitoring_alerts",
        "activity_logs"
    ]

    print("==================================================")
    if target_email:
        print(f"CLEANING FIRESTORE FOR TESCO AND EMAIL: '{target_email}'...")
    else:
        print("CLEANING FIRESTORE FOR TESCO RECORDS & USERS...")
    print("==================================================")

    total_deleted = 0
    deleted_summary = {}

    for coll_name in collections:
        docs = list(db.collection(coll_name).stream())
        deleted_summary[coll_name] = []
        for doc in docs:
            data = doc.to_dict() or {}
            doc_id = doc.id.lower()
            
            is_match = False
            
            data_str = str(data).lower()
            
            # Check for tesco keyword
            if "tesco" in doc_id or "tesco" in data_str:
                is_match = True
            
            # Check for target_email if provided
            if target_email and (target_email.lower() in doc_id or target_email.lower() in data_str):
                is_match = True

            if is_match:
                db.collection(coll_name).document(doc.id).delete()
                deleted_summary[coll_name].append(doc.id)
                total_deleted += 1

        print(f"[-] '{coll_name}': Deleted {len(deleted_summary[coll_name])} doc(s) -> {deleted_summary[coll_name]}")

    # List remaining users so the user knows what accounts exist
    remaining_users = [d.id for d in db.collection("users").stream()]
    print("==================================================")
    print(f"CURRENT REGISTERED USERS IN FIRESTORE: {remaining_users}")
    print(f"COMPLETE: Total {total_deleted} document(s) deleted from Firestore.")
    print("==================================================")

if __name__ == "__main__":
    email_arg = sys.argv[1].strip() if len(sys.argv) > 1 else None
    delete_tesco_data(email_arg)
