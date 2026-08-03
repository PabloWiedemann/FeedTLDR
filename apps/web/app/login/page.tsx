"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/feedtldr/auth-card";
import { api } from "@/lib/api/client";
import {
  googleErrorMessage,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
} from "@/lib/firebase";

function friendlyAuthError(code: string): string {
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Wrong email or password.";
  if (code.includes("user-not-found"))
    return "No account exists with this email.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Try again in a few minutes.";
  return "Could not log in. Try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginWithEmail(email, password);
      router.push("/app");
    } catch (err) {
      setError(friendlyAuthError(String(err)));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    try {
      const cred = await loginWithGoogle();
      // Ensure the Firestore/Stripe records exist (idempotent)
      const result = await api.POST("/v1/auth/register", {
        body: {
          name: cred.user.displayName ?? "",
          avatar: cred.user.photoURL ?? "",
          is_google_auth: true,
          tos_accepted: false,
        },
      });
      if (result.error) {
        setError(
          `Signed in with Google, but account setup failed: ${JSON.stringify(result.error).slice(0, 140)}`
        );
        return;
      }
      router.push("/app");
    } catch (err) {
      setError(googleErrorMessage(err));
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      onGoogle={google}
      googleLabel="Continue with Google"
      footer={
        <p>
          New here?{" "}
          <Link href="/signup" className="text-link underline underline-offset-2">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="justify-self-start text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            onClick={async () => {
              if (!email) {
                setError("Enter your email first, then use the reset link.");
                return;
              }
              await resetPassword(email);
              toast.success("Password reset email sent");
            }}
          >
            Forgot password?
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? <CircleNotch className="animate-spin" /> : null}
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
