import os
import firebase_admin
from firebase_admin import credentials, firestore

def reset_all_firestore_data():
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    collections = [
        "vendors",
        "vendor_queue",
        "onboarding_drafts",
        "activity_logs",
        "monitoring_alerts",
        "evidence_logs",
        "users",
        "system_config"
    ]

    print("==================================================")
    print("STARTING COMPLETE FIRESTORE CLEAN RESET...")
    print("==================================================")

    total_deleted = 0
    for coll_name in collections:
        docs = list(db.collection(coll_name).stream())
        count = len(docs)
        for doc in docs:
            db.collection(coll_name).document(doc.id).delete()
        print(f"[-] Cleared '{coll_name}': {count} documents deleted.")
        total_deleted += count

    print("==================================================")
    print(f"SUCCESS: Firestore completely wiped! Total {total_deleted} documents deleted.")
    print("All vendors, queue items, Tesco profiles, and activity logs have been erased.")
    print("==================================================")

if __name__ == "__main__":
    reset_all_firestore_data()
