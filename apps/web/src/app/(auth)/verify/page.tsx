"use client";

import { useRef, useState, useEffect, Suspense, type KeyboardEvent, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVerifyOtp, useResendVerification } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const supabase = createBrowserClient();
  const verifyOtp = useVerifyOtp(supabase);
  const resendVerification = useResendVerification(supabase);

  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/, "");
    if (!val && !e.target.value) return;
    const next = [...code];
    next[index] = val;
    setCode(next);
    if (val && index < 7) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length < 8) {
      setError("Please enter all 8 digits");
      return;
    }
    setError("");
    verifyOtp.mutate(
      { email, token: fullCode },
      {
        onSuccess: () => router.push("/feed"),
        onError: (err) => setError(err.message || "Invalid verification code"),
      }
    );
  }

  function handleResend() {
    if (cooldown > 0 || !email) return;
    setError("");
    resendVerification.mutate(email, {
      onSuccess: () => setCooldown(60),
      onError: (err) => setError(err.message || "Failed to resend code"),
    });
  }

  if (!email) {
    return (
      <div className="pt-auth-card">
        <div className="pt-auth-title">Verify email</div>
        <div className="pt-auth-sub">
          No email address found. Please <a href="/signup" style={{ fontWeight: 600, borderBottom: "2px solid var(--lime)" }}>sign up</a> first.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-auth-card">
      <div className="pt-auth-title">Verify email</div>
      <div className="pt-auth-sub">We sent an 8-digit code to <strong>{email}</strong></div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--red-bg)", color: "var(--red)", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div className="pt-code-input">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            className="pt-code-digit"
            value={digit}
            maxLength={1}
            inputMode="numeric"
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>

      <Button variant="primary" onClick={handleVerify} disabled={verifyOtp.isPending} className="full">
        {verifyOtp.isPending ? "Verifying..." : "Verify"}
      </Button>

      <div className="pt-auth-footer" style={{ marginTop: 16 }}>
        Didn&apos;t receive?{" "}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleResend(); }}
          style={{ opacity: cooldown > 0 ? 0.5 : 1, pointerEvents: cooldown > 0 ? "none" : "auto" }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </a>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
