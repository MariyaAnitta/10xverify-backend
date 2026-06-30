import os
import json
import base64
import asyncio
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.cloud import pubsub_v1
import firebase_admin
from firebase_admin import firestore

# Import our verification logic and LLM client
from server.agents import execute_adk_verification, llm
import uuid

SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/pubsub'
]
SUBSCRIPTION_NAME = 'projects/xverify-email-monitor/subscriptions/gmail-incoming-sub'

def get_credentials():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

def get_email_body(payload):
    """Extracts the plain text body from the Gmail API payload."""
    if 'parts' in payload:
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                data = part['body'].get('data')
                if data:
                    return base64.urlsafe_b64decode(data).decode('utf-8')
            elif 'parts' in part:
                return get_email_body(part)
    elif 'body' in payload and 'data' in payload['body']:
        return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
    return ""

async def parse_vendor_with_llm(email_body: str, email_subject: str):
    """Uses Gemini to parse the forwarded email and extract vendor details."""
    prompt = f"""
    You are an AI assistant analyzing a forwarded email received by an employee.
    Your goal is to extract the details of the ORIGINAL VENDOR who sent the email, ignoring the employee who forwarded it.
    
    Email Subject: {email_subject}
    Email Body:
    {email_body}
    
    Extract the following information about the vendor.
    If you cannot find a specific field, do your best to guess the industry/country based on context, or use "Unknown".
    
    Format as JSON:
    {{
      "companyName": "The name of the vendor's company",
      "website": "The domain name of the vendor (e.g. acmecorp.com)",
      "country": "The country the vendor operates in (guess from context if needed, e.g. United States)",
      "industry": "The industry of the vendor (e.g. Technology, Manufacturing, Marketing)"
    }}
    """
    
    # Run the prompt through the Gemini LLM we imported
    from google.adk.runners import InMemoryRunner
    from google.adk.agents import Agent
    from google.genai import types
    
    parser_agent = Agent(name="email_parser", description="Parses emails", model=llm, instruction="You extract JSON from text.")
    runner = InMemoryRunner(agent=parser_agent)
    runner.auto_create_session = True
    
    raw = ""
    async for ev in runner.run_async(
        user_id="system",
        session_id=str(uuid.uuid4()),
        new_message=types.Content(parts=[types.Part(text=prompt)])
    ):
        if ev.content and ev.content.parts:
            raw += ev.content.parts[0].text or ""
            
    # Clean the JSON output
    import re
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None

async def process_email_async(service, msg_id):
    """Fetches the email, parses it, and triggers verification."""
    try:
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
        # Mark as read
        service.users().messages().modify(userId='me', id=msg_id, body={'removeLabelIds': ['UNREAD']}).execute()
        
        payload = message.get('payload', {})
        headers = payload.get('headers', [])
        
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        body = get_email_body(payload)
        
        print(f"\n[Email Ingestion] Processing New Forwarded Email: '{subject}'")
        
        # 1. Parse with LLM
        vendor_data = await parse_vendor_with_llm(body, subject)
        
        if not vendor_data or not vendor_data.get('companyName'):
            print("[Email Ingestion] Failed to extract vendor details from email.")
            return
            
        print(f"[Email Ingestion] Extracted Vendor: {vendor_data['companyName']} ({vendor_data['website']})")
        
        # 2. Trigger Verification Pipeline
        print("[Email Ingestion] Launching ADK Verification Pipeline...")
        result = await execute_adk_verification(
            company_name=vendor_data['companyName'],
            website=vendor_data['website'],
            country=vendor_data.get('country', 'Unknown'),
            industry=vendor_data.get('industry', 'Unknown'),
            screened_by="Email Automation"
        )
        
        # 3. Save to Firestore
        print("[Email Ingestion] Verification complete. Saving to Database...")
        db_fs = firestore.client()
        vendor_id = result.get("id")
        if vendor_id:
            db_fs.collection("vendors").document(vendor_id).set(result)
            print(f"[Email Ingestion] Successfully saved dossier for {vendor_data['companyName']}!")

    except Exception as e:
        print(f"[Email Ingestion] Error processing email: {e}")

def start_email_listener(loop):
    """Initializes the Pub/Sub listener in a background thread."""
    try:
        creds = get_credentials()
        gmail_service = build('gmail', 'v1', credentials=creds)
        subscriber = pubsub_v1.SubscriberClient(credentials=creds)
        
        def callback(message):
            message.ack()
            try:
                # Get the latest unread message
                results = gmail_service.users().messages().list(userId='me', labelIds=['INBOX', 'UNREAD'], maxResults=1).execute()
                messages = results.get('messages', [])
                if messages:
                    msg_id = messages[0]['id']
                    # Schedule the async processing on the main FastAPI event loop
                    asyncio.run_coroutine_threadsafe(process_email_async(gmail_service, msg_id), loop)
            except Exception as e:
                print(f"[Email Ingestion] Callback error: {e}")

        future = subscriber.subscribe(SUBSCRIPTION_NAME, callback=callback)
        print(f"[Email Ingestion] Started listening on {SUBSCRIPTION_NAME}")
        return future
    except Exception as e:
        print(f"[Email Ingestion] Failed to start listener: {e}")
        return None
