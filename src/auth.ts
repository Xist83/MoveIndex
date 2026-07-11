import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";
import { config } from "./config";

const SCOPES = ["https://graph.microsoft.com/Sites.ReadWrite.All"];

export const msal = new PublicClientApplication({
  auth: {
    clientId: config.clientId,
    authority: `https://login.microsoftonline.com/${config.tenantId}`,
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: { cacheLocation: "localStorage" },
});

/** Initierar MSAL och tar hand om ev. redirect-svar. Returnerar inloggat konto eller null. */
export async function initAuth(): Promise<AccountInfo | null> {
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  if (result?.account) {
    msal.setActiveAccount(result.account);
    return result.account;
  }
  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    msal.setActiveAccount(accounts[0]);
    return accounts[0];
  }
  return null;
}

export function login(): void {
  void msal.loginRedirect({ scopes: SCOPES });
}

export function logout(): void {
  void msal.logoutRedirect();
}

export async function getToken(): Promise<string> {
  const account = msal.getActiveAccount();
  if (!account) throw new Error("Inte inloggad");
  try {
    const result = await msal.acquireTokenSilent({ scopes: SCOPES, account });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ scopes: SCOPES, account });
    }
    throw e;
  }
}
