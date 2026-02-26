import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

/** Authenticate via cookies (web) or Bearer token (mobile) */
async function getAuthUser(req: NextRequest) {
  // Check for Bearer token first (mobile)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return { user, supabase };
  }

  // Fall back to cookie auth (web)
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
  return { user, supabase };
}

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for one-time course purchase or Pro subscription.
 * Body: { courseId: string } for one-time, { plan: "pro" } for subscription
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const isMobile = req.headers.get("authorization")?.startsWith("Bearer ");
    const origin = req.headers.get("origin") || "http://localhost:3000";
    // For mobile, resolve the server's reachable URL from the request host header
    const host = req.headers.get("host") || "localhost:3000";
    const mobileBase = `http://${host}`;
    // For mobile, use an intermediate redirect page that opens the deep link
    const mobileRedirect = (params: string) =>
      `${mobileBase}/api/stripe/mobile-redirect?${params}`;

    // Get or create Stripe Customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, display_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Pro subscription checkout
    if ("plan" in body && body.plan === "pro") {
      // Read Pro price from app_settings (set by admin via sync-product), fall back to env var
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_pro")
        .single();

      const proConfig = setting?.value as { price_id?: string } | null;
      const proPriceId = proConfig?.price_id || process.env.STRIPE_PRO_PRICE_ID;

      if (!proPriceId) {
        return NextResponse.json(
          { error: "Pro subscription not configured — set a price in Admin > Academy > Pricing" },
          { status: 500 },
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: proPriceId, quantity: 1 }],
        success_url: isMobile
          ? mobileRedirect("status=success&type=pro")
          : `${origin}/academy?payment=success&type=pro`,
        cancel_url: isMobile
          ? mobileRedirect("status=cancelled")
          : `${origin}/academy?payment=cancelled`,
        metadata: { userId: user.id, type: "pro" },
        subscription_data: {
          metadata: { userId: user.id },
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // One-time course purchase checkout
    if ("courseId" in body && body.courseId) {
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("id, title, price_cents, price_type, slug, stripe_price_id")
        .eq("id", body.courseId)
        .single();

      if (courseErr || !course) {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 },
        );
      }

      if (course.price_type !== "one_time" || !course.price_cents) {
        return NextResponse.json(
          { error: "This course is not available for purchase" },
          { status: 400 },
        );
      }

      // Use synced Stripe Price ID if available, otherwise fall back to ad-hoc price_data
      const lineItems = course.stripe_price_id
        ? [{ price: course.stripe_price_id, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "usd",
                unit_amount: course.price_cents,
                product_data: {
                  name: course.title,
                  description: `One-time purchase — ${course.title}`,
                },
              },
              quantity: 1,
            },
          ];

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: lineItems,
        success_url: isMobile
          ? mobileRedirect(`status=success&course=${course.slug}`)
          : `${origin}/academy?payment=success&course=${course.slug}`,
        cancel_url: isMobile
          ? mobileRedirect("status=cancelled")
          : `${origin}/academy?payment=cancelled`,
        metadata: {
          userId: user.id,
          courseId: course.id,
          type: "one_time",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json(
      { error: "Invalid request — provide courseId or plan" },
      { status: 400 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create checkout";
    console.error("[stripe/checkout] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
