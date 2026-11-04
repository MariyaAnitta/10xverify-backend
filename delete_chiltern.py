import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore

def delete_vendor_account(target_keyword: str, target_email: str):
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
    print(f"PURGING: '{target_keyword}' and '{target_email}'...")
    print("==================================================")

    total_deleted = 0
    deleted_summary = {}

    for coll_name in collections:
        docs = list(db.collection(coll_name).stream())
        deleted_summary[coll_name] = []
        for doc in docs:
            data = doc.to_dict() or {}
            doc_id = doc.id.lower()
            data_str = str(data).lower()
            
            is_match = False
            if target_keyword.lower() in doc_id or target_keyword.lower() in data_str:
                is_match = True
            if target_email.lower() in doc_id or target_email.lower() in data_str:
                is_match = True

            if is_match:
                db.collection(coll_name).document(doc.id).delete()
                deleted_summary[coll_name].append(doc.id)
                total_deleted += 1

        print(f"[-] '{coll_name}': Deleted {len(deleted_summary[coll_name])} doc(s) -> {deleted_summary[coll_name]}")

    remaining_users = [d.id for d in db.collection("users").stream()]
    print("==================================================")
    print(f"CURRENT REGISTERED USERS IN FIRESTORE: {remaining_users}")
    print(f"COMPLETE: Total {total_deleted} document(s) deleted.")
    print("==================================================")

if __name__ == "__main__":
    delete_vendor_account("chiltern", "info@chilternsolar.co.uk")
