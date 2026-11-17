import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { msalInstance } from './authConfig.ts';
import { MsalProvider } from '@azure/msal-react';

// Global fetch interceptor to attach Authorization Bearer token to all /api/ requests
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
  const isApi = url.startsWith('/api/') || url.includes('/api/');
  const isPublicAuth = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/azure-sso') || url.includes('/api/auth/callback');
  
  if (isApi && !isPublicAuth) {
    const token = localStorage.getItem('10xverify_token');
    if (token) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init.headers = headers;
    }
  }

  const response = await originalFetch(input, init);

  if (response.status === 401 && isApi && !isPublicAuth) {
    localStorage.removeItem('10xverify_token');
    localStorage.removeItem('10xverify_user');
    window.dispatchEvent(new CustomEvent('10xverify_auth_invalidated'));
  }

  return response;
};

async function bootstrap() {
  try {
    await msalInstance.initialize();
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

