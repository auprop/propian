"use client";

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/, "");
    if (!val && !e.target.value) return;
    const next = [...code];
    next[index] = val;
    setCode(next);
    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    // In production, verify the OTP via Supabase
    // For now, redirect to onboarding
    setTimeout(() => {
      router.push("/onboarding");
    }, 1000);
  }

  return (
    <div className="pt-auth-card">
      <div className="pt-auth-title">Verify email</div>
      <div className="pt-auth-sub">We sent a 6-digit code to your email</div>

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

      <Button variant="primary" onClick={handleVerify} disabled={loading} className="full">
        {loading ? "Verifying..." : "Verify"}
      </Button>

      <div className="pt-auth-footer" style={{ marginTop: 16 }}>
        Didn&apos;t receive? <a href="#" onClick={(e) => { e.preventDefault(); }}>Resend code</a>
      </div>
    </div>
  );
}
