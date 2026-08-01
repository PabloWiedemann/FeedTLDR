"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/feedtldr/auth-card";
import { api } from "@/lib/api/client";
import { loginWithGoogle, signupWithEmail } from "@/lib/firebase";

// Same requirements as the legacy signup validation
function passwordProblems(password: string, confirm: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) problems.push("One uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("One number");
  if (confirm !== "" && password !== confirm) problems.push("Passwords match");
  return problems;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problems = passwordProblems(password, confirm);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length > 0 || password !== confirm) return;
    setError(null);
    setBusy(true);
    try {
      await signupWithEmail(email, password);
      const result = await api.POST("/v1/auth/register", {
        body: {
          name,
          avatar: "",
          is_google_auth: false,
          tos_accepted: false,
        },
      });
      if (result.error) {
        throw new Error("register_failed");
      }
      router.push("/onboarding");
    } catch (err) {
      const message = String(err);
      if (message.includes("email-already-in-use")) {
        setError("An account with this email already exists. Log in instead.");
      } else {
        setError("Could not create your account. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    try {
      const cred = await loginWithGoogle();
      const result = await api.POST("/v1/auth/register", {
        body: {
          name: cred.user.displayName ?? "",
          avatar: cred.user.photoURL ?? "",
          is_google_auth: true,
          tos_accepted: false,
        },
      });
      router.push(
        result.data?.already_registered ? "/app" : "/onboarding"
      );
    } catch {
      setError("Google sign-up did not complete.");
    }
  }

  return (
    <AuthCard
      title="Create your account"
      onGoogle={google}
      googleLabel="Sign up with Google"
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-link underline underline-offset-2">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {password !== "" && problems.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || problems.length > 0}>
          {busy ? <CircleNotch className="animate-spin" /> : null}
          Create account
        </Button>
        <p className="text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Use
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
