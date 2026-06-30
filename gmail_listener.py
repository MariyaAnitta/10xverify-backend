import os
import json
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.cloud import pubsub_v1

# We need BOTH Gmail and Pub/Sub scopes now!
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

def parse_email(service):
    """Fetches the most recent unread email and prints its details."""
    try:
        # 1. Get the most recent unread email
        results = service.users().messages().list(userId='me', labelIds=['INBOX', 'UNREAD'], maxResults=1).execute()
        messages = results.get('messages', [])
        
        if not messages:
            return
            
        msg_id = messages[0]['id']
        
        # 2. Fetch the full email content
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
        # 3. Mark it as read so we don't process it again!
        service.users().messages().modify(userId='me', id=msg_id, body={'removeLabelIds': ['UNREAD']}).execute()
        
        # 4. Extract headers (From, Subject)
        payload = message.get('payload', {})
        headers = payload.get('headers', [])
        
        sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        
        print("\n" + "="*60)
        print("🚨 NEW EMAIL DETECTED!")
        print(f"From:    {sender}")
        print(f"Subject: {subject}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"Error fetching email: {e}")

def main():
    print("Authenticating...")
    creds = get_credentials()
    gmail_service = build('gmail', 'v1', credentials=creds)
    
    print(f"Listening for incoming emails...\n(Send a test email to your inbox to see it pop up here!)")
    
    # Initialize the Pub/Sub subscriber
    subscriber = pubsub_v1.SubscriberClient(credentials=creds)
    
    def callback(message):
        # Acknowledge the message so Pub/Sub knows we received it
        message.ack()
        # Fetch the actual email from Gmail
        parse_email(gmail_service)

    # Start listening
    streaming_pull_future = subscriber.subscribe(SUBSCRIPTION_NAME, callback=callback)
    
    try:
        # This keeps the script running forever
        streaming_pull_future.result()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()

if __name__ == '__main__':
    main()
