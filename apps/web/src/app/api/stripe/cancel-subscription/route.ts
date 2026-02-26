import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/cancel-subscription
 *
 * Gracefully cancels the user's Pro subscription at the end of the current
 * billing period (cancel_at_period_end). The user retains access until then.
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
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

    // Get the user's subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("pro_subscription_id, pro_subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile?.pro_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    if (
      profile.pro_subscription_status !== "active" &&
      profile.pro_subscription_status !== "trialing"
    ) {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 },
      );
    }

    // Cancel at period end in Stripe (graceful — user keeps access until period ends)
    const updated = await stripe.subscriptions.update(
      profile.pro_subscription_id,
      { cancel_at_period_end: true },
    );

    const item = updated.items?.data?.[0];
    const periodEnd = item?.current_period_end ?? null;

    // Update subscriptions table
    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("stripe_subscription_id", profile.pro_subscription_id);

    console.log(
      `[stripe/cancel-subscription] Cancelled at period end: user=${user.id} sub=${profile.pro_subscription_id}`,
    );

    return NextResponse.json({
      success: true,
      cancel_at_period_end: true,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel subscription";
    console.error("[stripe/cancel-subscription] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
