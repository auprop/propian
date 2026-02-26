import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/verify-subscription
 *
 * Fallback for when webhooks don't fire: checks Stripe directly for
 * the user's subscription status and updates the database accordingly.
 * Called after returning from Stripe Checkout.
 */

/** Authenticate via cookies (web) or Bearer token (mobile) */
async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Service role client to bypass RLS */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Get the user's stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, pro_subscription_status, pro_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    // Check Stripe for active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 5,
    });

    // Find the most recent active/trialing subscription
    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing",
    ) || subscriptions.data[0]; // Fall back to most recent

    if (!activeSub) {
      return NextResponse.json({ status: "no_subscription" });
    }

    const item = activeSub.items?.data?.[0];
    const periodEnd = item?.current_period_end ?? null;

    // Update the subscriptions table (upsert)
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", activeSub.id)
      .maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        stripe_subscription_id: activeSub.id,
        stripe_customer_id: profile.stripe_customer_id,
        status: activeSub.status,
        current_period_start: item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        cancel_at_period_end: activeSub.cancel_at_period_end,
      });
    } else {
      await supabase
        .from("subscriptions")
        .update({
          status: activeSub.status,
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: activeSub.cancel_at_period_end,
        })
        .eq("stripe_subscription_id", activeSub.id);
    }

    // Update the profile
    const isActive = activeSub.status === "active" || activeSub.status === "trialing";
    await supabase
      .from("profiles")
      .update({
        pro_subscription_status: activeSub.status as
          | "active"
          | "trialing"
          | "past_due"
          | "canceled",
        pro_subscription_id: activeSub.id,
        pro_expires_at: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        ...(isActive ? { is_verified: true } : {}),
      })
      .eq("id", user.id);

    console.log(
      `[stripe/verify-subscription] Verified: user=${user.id} sub=${activeSub.id} status=${activeSub.status}`,
    );

    return NextResponse.json({
      status: activeSub.status,
      subscription_id: activeSub.id,
      is_active: isActive,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[stripe/verify-subscription] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
