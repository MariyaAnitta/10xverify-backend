import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { msalInstance } from './authConfig.ts';
import { MsalProvider } from '@azure/msal-react';

async function bootstrap() {
  try {
    const clientId = ((import.meta as any).env?.VITE_AZURE_CLIENT_ID);
    if (clientId) {
      await msalInstance.initialize();
      await msalInstance.handleRedirectPromise();
    }
  } catch (err) {
    console.warn("[MSAL] Note during initialization:", err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
}

bootstrap();

