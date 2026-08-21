import { getApps, initializeApp } from "firebase/app";
import {
  ReCaptchaEnterpriseProvider,
  getToken as getAppCheckTokenFromFirebase,
  initializeAppCheck,
  type AppCheck,
} from "firebase/app-check";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";

// Same Firebase project as the legacy app: existing users keep their accounts.
// With NEXT_PUBLIC_AUTH_PROXY=1, the sign-in helper is served from this site's
// own domain (see the /__/auth rewrite in next.config.ts), which keeps Google
// sign-in fully first-party — required for desktop Safari's tracking
// protection. Needs the domain added to the Google OAuth client's authorized
// origins + redirect URIs first.
const useAuthProxy =
  process.env.NEXT_PUBLIC_AUTH_PROXY === "1" && typeof window !== "undefined";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "missing-api-key",
  authDomain: useAuthProxy
    ? window.location.host
    : (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "feedtldr.firebaseapp.com"),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "feedtldr",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
let appCheckInstance: AppCheck | null = null;

function getAppCheckInstance(): AppCheck | null {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
  if (typeof window === "undefined" || !siteKey) return null;
  if (!appCheckInstance) {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return appCheckInstance;
}

// In the browser, declare a persistence fallback chain so restricted storage
// environments (private windows, in-app browsers) degrade to in-memory auth
// instead of failing with IndexedDB errors mid sign-in.
export const auth =
  typeof window === "undefined"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: [
          indexedDBLocalPersistence,
          browserLocalPersistence,
          inMemoryPersistence,
        ],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
export const googleProvider = new GoogleAuthProvider();

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function getFirebaseAppCheckToken(): Promise<string | null> {
  const instance = getAppCheckInstance();
  if (!instance) return null;
  try {
    return (await getAppCheckTokenFromFirebase(instance)).token;
  } catch (error) {
    console.warn("Firebase App Check token unavailable", error);
    return null;
  }
}

export function watchAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signupWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function sendVerification(user: User) {
  await sendEmailVerification(user, {
    url: `${window.location.origin}/verify-email`,
  });
}

export async function refreshCurrentUser(): Promise<User | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await reload(user);
  await user.getIdToken(true);
  return auth.currentUser;
}

/**
 * Google sign-in. In auth-proxy mode (production) this uses a full-page
 * redirect, the same robust shape as the legacy app: no popup blockers, no
 * cross-window storage handshakes, and safe on Safari because the helper is
 * first-party. It resolves to null because the page navigates away; the
 * result is picked up by getGoogleRedirectResult on return. Outside proxy
 * mode (local dev) it falls back to the popup, which resolves directly.
 */
export async function loginWithGoogle(): Promise<UserCredential | null> {
  if (process.env.NEXT_PUBLIC_AUTH_PROXY === "1") {
    try {
      sessionStorage.setItem(GOOGLE_REDIRECT_FLAG, "1");
    } catch {
      // Storage-restricted browsers just lose the instant loading state.
    }
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
  return signInWithPopup(auth, googleProvider);
}

const GOOGLE_REDIRECT_FLAG = "feedtldr.google-redirect";

/** True while this tab is mid round-trip to Google's sign-in page, so the
 * return page can show its busy state before getRedirectResult resolves. */
export function googleRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(GOOGLE_REDIRECT_FLAG) === "1";
  } catch {
    return false;
  }
}

export function clearGoogleRedirectPending() {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Result of a completed redirect sign-in, or null if none is pending. */
export function getGoogleRedirectResult(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
}

/** Human-readable explanation for Google sign-in failures, with the raw code
 * kept visible so problems can be reported and diagnosed. */
export function googleErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (code.includes("popup-blocked"))
    return "Your browser blocked the Google sign-in window. Allow popups for this site and try again, or log in with email.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup"))
    return "The Google window closed before sign-in finished. Try again and complete the steps in the popup.";
  if (code.includes("unauthorized-domain"))
    return "This web address isn't authorized for Google sign-in yet (auth/unauthorized-domain).";
  if (code.includes("network-request-failed"))
    return "Network problem while talking to Google. Check the connection and try again.";
  if (code.includes("account-exists-with-different-credential"))
    return "This email already has an account with a password. Log in with email and password instead.";
  const text = String(err);
  if (/database|indexeddb|closing|invalidstate/i.test(text))
    return "Your browser is blocking sign-in storage. Open this site directly in Safari or Chrome (not a private window, and not the built-in browser inside a chat app) and try again.";
  return `Google sign-in failed (${code || text.slice(0, 120)}).`;
}

export type { User };
