"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@propian/shared/validation";
import { resetPassword } from "@propian/shared/api";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const supabase = createBrowserClient();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setLoading(true);
    setError("");
    try {
      await resetPassword(supabase, data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="pt-auth-card">
        <div className="pt-auth-title">Check your email</div>
        <div className="pt-auth-sub">We sent a password reset link to your email address.</div>
        <div className="pt-auth-footer">
          <Link href="/login">← Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-auth-card">
      <div className="pt-auth-title">Reset password</div>
      <div className="pt-auth-sub">Enter your email and we&apos;ll send a reset link.</div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--red-bg)", color: "var(--red)", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-col" style={{ gap: 14 }}>
          <Input
            label="Email"
            placeholder="you@email.com"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button variant="primary" type="submit" disabled={loading} className="full">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </div>
      </form>

      <div className="pt-auth-footer">
        <Link href="/login">← Back to sign in</Link>
      </div>
    </div>
  );
}
