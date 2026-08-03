import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

// Same Firebase project as the legacy app: existing users keep their accounts.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "missing-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "feedtldr.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "feedtldr",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

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

export function watchAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signupWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
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
