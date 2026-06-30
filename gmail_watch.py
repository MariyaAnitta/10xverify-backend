import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# We need the modify scope to call watch() and read emails
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

# Your Pub/Sub topic from the Google Cloud Console
TOPIC_NAME = 'projects/xverify-email-monitor/topics/gmail-incoming'

def main():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            # This will open a browser window for you to log in
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        # Build the Gmail service
        service = build('gmail', 'v1', credentials=creds)

        # Set up the watch request
        request = {
            'labelIds': ['INBOX'],
            'topicName': TOPIC_NAME
        }
        
        print(f"Telling Gmail to push notifications to: {TOPIC_NAME}...")
        
        # Call the watch() endpoint
        response = service.users().watch(userId='me', body=request).execute()
        
        print("Success! Gmail is now watching your inbox.")
        print("Response from Google:")
        print(response)

    except Exception as error:
        print(f'An error occurred: {error}')
        print("If you get a 403 error, make sure the service account has Pub/Sub Publisher access to the topic!")

if __name__ == '__main__':
    main()
