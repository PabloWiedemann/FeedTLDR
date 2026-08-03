"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/feedtldr/auth-card";
import { Spinner } from "@/components/feedtldr/spinner";
import { registerEmailAccount, signupErrorMessage } from "@/lib/auth";
import { signupWithEmail } from "@/lib/firebase";
import { useGoogleRedirect } from "@/lib/use-google-redirect";
import { useGoogleSignIn } from "@/lib/use-google-sign-in";

const PASSWORD_MIN_LENGTH = 8;

/** Unmet password requirements, phrased as the rules themselves. */
function passwordProblems(password: string, confirmation: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH)
    problems.push(`At least ${PASSWORD_MIN_LENGTH} characters`);
  if (!/[A-Z]/.test(password)) problems.push("One uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("One number");
  if (confirmation !== "" && password !== confirmation)
    problems.push("Passwords match");
  return problems;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { redirectError, completing } = useGoogleRedirect();
  const { signIn, googleError, setGoogleError } = useGoogleSignIn();

  const problems = passwordProblems(password, confirmation);
  const canSubmit = problems.length === 0 && password === confirmation;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setGoogleError(null);
    setBusy(true);
    try {
      await signupWithEmail(email, password);
      await registerEmailAccount(name);
      router.push("/onboarding");
    } catch (caught) {
      setError(signupErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      onGoogle={signIn}
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
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {password !== "" && problems.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {problems.map((problem) => (
                <li key={problem}>• {problem}</li>
              ))}
            </ul>
          )}
        </Field>
        <FieldError>{error ?? googleError ?? redirectError}</FieldError>
        {completing && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Completing sign-in…
          </p>
        )}
        <Button type="submit" disabled={busy || completing || !canSubmit}>
          {busy && <Spinner />}
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
