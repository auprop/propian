"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signupSchema, type SignupInput } from "@propian/shared/validation";
import { signUp } from "@propian/shared/api";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupInput) {
    setLoading(true);
    setError("");
    try {
      await signUp(supabase, data);
      router.push("/verify");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-auth-card">
      <div className="pt-auth-title">Create account</div>
      <div className="pt-auth-sub">Join thousands of prop traders sharing strategies.</div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--red-bg)", color: "var(--red)", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-col" style={{ gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input
              label="First Name"
              placeholder="Marcus"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Last Name"
              placeholder="Chen"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>
          <Input
            label="Username"
            placeholder="@marcusfx"
            error={errors.username?.message}
            {...register("username")}
          />
          <Input
            label="Email"
            placeholder="you@email.com"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            placeholder="Min. 8 characters"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button variant="primary" type="submit" disabled={loading} className="full">
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </div>
      </form>

      <div className="pt-auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
