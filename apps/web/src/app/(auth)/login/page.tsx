"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@propian/shared/validation";
import { signIn, signInWithProvider } from "@propian/shared/api";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError("");
    try {
      await signIn(supabase, data.email, data.password);
      router.push("/feed");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    try {
      await signInWithProvider(supabase, provider);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="pt-auth-card">
      <div className="pt-auth-title">Welcome back</div>
      <div className="pt-auth-sub">Sign in to connect with prop traders worldwide.</div>

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
          <Input
            label="Password"
            placeholder="••••••••"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" style={{ accentColor: "var(--lime)" }} /> Remember me
            </label>
            <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 600, borderBottom: "2px solid var(--lime)", textDecoration: "none", color: "inherit" }}>
              Forgot?
            </Link>
          </div>
          <Button variant="primary" type="submit" disabled={loading} className="full">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </form>

      <div className="pt-auth-divider">or continue with</div>
      <div className="pt-col" style={{ gap: 8 }}>
        <button className="pt-social-btn" onClick={() => handleOAuth("google")}>Google</button>
        <button className="pt-social-btn" onClick={() => handleOAuth("discord")}>Discord</button>
      </div>
      <div className="pt-auth-footer">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </div>
    </div>
  );
}
