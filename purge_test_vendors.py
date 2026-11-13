import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore

def init_firestore():
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
    if not os.path.exists(cred_path):
        print(f"[!] Error: Credentials file '{cred_path}' not found in current directory.", flush=True)
        sys.exit(1)

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return firestore.client()

def purge_by_keywords(db, keywords):
    collections = [
        "evidence_logs",        # The audit evidence pack repository logs
        "evidence_repository",  # Secondary evidence repository
        "activity_logs",        # User activity logs audit trail
        "vendors",              # Screened vendor dossiers
        "vendor_queue",         # Vendor registration queue
        "onboarding_drafts",    # Vendor portal drafts
        "monitoring_alerts",    # Continuous threat alerts
        "users"                 # Registered accounts
    ]

    clean_keywords = [k.strip().lower() for k in keywords if k.strip()]
    if not clean_keywords:
        print("[!] No valid keywords provided.", flush=True)
        return

    print("========================================================", flush=True)
    print(f" PURGING TEST ENTITIES MATCHING: {clean_keywords}", flush=True)
    print("========================================================", flush=True)

    total_deleted = 0

    for coll in collections:
        print(f"\n[*] Scanning collection '{coll}'...", flush=True)
        deleted_count = 0
        try:
            # Stream documents and delete matches directly
            batch = db.batch()
            batch_count = 0

            for doc in db.collection(coll).stream():
                data = doc.to_dict() or {}
                doc_id = doc.id.lower()
                data_str = str(data).lower()

                # Check if any keyword matches doc id or data content
                matches = False
                for kw in clean_keywords:
                    if kw in doc_id or kw in data_str:
                        matches = True
                        break

                if matches:
                    batch.delete(doc.reference)
                    batch_count += 1
                    deleted_count += 1
                    total_deleted += 1
                    cname = data.get("companyName") or data.get("target") or doc.id
                    print(f"    [-] Flagged for deletion: {doc.id} ({cname})", flush=True)

                    if batch_count >= 400:
                        batch.commit()
                        batch = db.batch()
                        batch_count = 0

            if batch_count > 0:
                batch.commit()

            print(f"    [OK] Finished '{coll}': Total deleted = {deleted_count}", flush=True)
        except Exception as e:
            print(f"    [!] Error processing collection '{coll}': {e}", flush=True)

    print("\n========================================================", flush=True)
    print(f" COMPLETE: Purged {total_deleted} test records across all collections.", flush=True)
    print("========================================================\n", flush=True)

if __name__ == "__main__":
    db = init_firestore()

    args = sys.argv[1:]
    
    # Common automated test keywords
    default_test_keywords = [
        "qwertyuiop",
        "jsdhjweb",
        "script",
        "test 123",
        "ktebxrhp",
        "r1hztw",
        "192qi2c9b0",
        "888333",
        "test1234",
        "fake-phish",
        "response.write",
        "aaaaaaaa",
        "3423423423423",
        "ahvyvdf",
        "tfghu6tyghyuyhj",
        "nobody",
        "nonexistent",
        "tester and co",
        "tester.abc",
        "testabc",
        "youtube",
        "00000000"
    ]

    if not args or "--clean-tests" in args:
        print("[+] Running automatic purge of all test entities and mock logs...", flush=True)
        purge_by_keywords(db, default_test_keywords)
    else:
        # User specified custom keywords
        combined = list(set(default_test_keywords + [a.lower() for a in args]))
        purge_by_keywords(db, combined)
