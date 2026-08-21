"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/feedtldr/auth-card";
import { Spinner } from "@/components/feedtldr/spinner";
import { loginErrorMessage, registerAccount } from "@/lib/auth";
import { loginWithEmail, resetPassword } from "@/lib/firebase";
import { useGoogleRedirect } from "@/lib/use-google-redirect";
import { useGoogleSignIn } from "@/lib/use-google-sign-in";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { redirectError, completing } = useGoogleRedirect();
  const { signIn, googleError, setGoogleError } = useGoogleSignIn();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setGoogleError(null);
    setBusy(true);
    try {
      const credential = await loginWithEmail(email, password);
      router.push(await registerAccount(credential));
    } catch (caught) {
      setError(loginErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function sendResetEmail() {
    if (!email) {
      setError("Enter your email first, then use the reset link.");
      return;
    }
    await resetPassword(email);
    toast.success("Password reset email sent");
  }

  return (
    <AuthCard
      title="Welcome back"
      onGoogle={signIn}
      googleLabel="Continue with Google"
      googleBusy={completing}
      googleDisabled={busy || completing}
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
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div>
            <Button
              type="button"
              variant="link"
              size="xs"
              className="p-0 text-xs text-muted-foreground"
              onClick={sendResetEmail}
            >
              Forgot password?
            </Button>
          </div>
        </Field>
        <FieldError>{error ?? googleError ?? redirectError}</FieldError>
        {completing && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Completing sign-in…
          </p>
        )}
        <Button type="submit" disabled={busy || completing}>
          {busy && <Spinner />}
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
