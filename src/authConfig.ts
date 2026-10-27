import { Configuration, LogLevel, PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: ((import.meta as any).env?.VITE_AZURE_CLIENT_ID) || "be3cfdbb-067b-4235-85d4-847c39d62829",
    authority: `https://login.microsoftonline.com/${((import.meta as any).env?.VITE_AZURE_TENANT_ID) || "fe0805e6-6a29-4871-b760-6366128cdf58"}`,
    redirectUri: `${window.location.origin}/api/auth/callback/azure-ad`,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
