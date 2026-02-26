import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

/**
 * Authenticate and verify admin status.
 */
async function getAdminUser() {
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
  if (!user) return { admin: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { admin: null, supabase };

  return { admin: user, supabase };
}

/**
 * POST /api/stripe/sync-product
 *
 * Syncs course pricing or Pro subscription config to Stripe.
 *
 * Body variants:
 *   { courseId, title, priceCents }  — sync a one-time course product
 *   { type: "pro", amountCents, interval }  — sync the Pro subscription product
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, supabase } = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // ─── Pro Subscription Sync ───
    if (body.type === "pro") {
      const { amountCents, interval = "month" } = body as {
        type: "pro";
        amountCents: number;
        interval?: string;
      };

      if (!amountCents || amountCents <= 0) {
        return NextResponse.json(
          { error: "amountCents must be > 0" },
          { status: 400 },
        );
      }

      // Read current config
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_pro")
        .single();

      const config = (setting?.value as Record<string, unknown>) ?? {};
      const existingProductId = config.product_id as string | null;
      const existingPriceId = config.price_id as string | null;

      let productId = existingProductId;

      // Create or update Stripe Product
      if (!productId) {
        const product = await stripe.products.create({
          name: "Propian Pro",
          description: "Unlimited access to all Pro courses on Propian Academy",
          metadata: { type: "pro_subscription" },
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: "Propian Pro",
        });
      }

      // Archive old Price if exists
      if (existingPriceId) {
        await stripe.prices.update(existingPriceId, { active: false });
      }

      // Create new recurring Price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: amountCents,
        currency: "usd",
        recurring: {
          interval: interval as "month" | "year" | "week" | "day",
        },
        metadata: { type: "pro_subscription" },
      });

      // Save to app_settings
      await supabase
        .from("app_settings")
        .upsert({
          key: "stripe_pro",
          value: {
            product_id: productId,
            price_id: price.id,
            amount_cents: amountCents,
            interval,
          },
        });

      console.log(
        `[stripe/sync-product] Pro subscription synced: product=${productId} price=${price.id} amount=${amountCents}`,
      );

      return NextResponse.json({
        product_id: productId,
        price_id: price.id,
        amount_cents: amountCents,
      });
    }

    // ─── One-time Course Product Sync ───
    const { courseId, title, priceCents } = body as {
      courseId: string;
      title: string;
      priceCents: number;
    };

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "courseId and title are required" },
        { status: 400 },
      );
    }

    // Get current course Stripe IDs
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("stripe_product_id, stripe_price_id")
      .eq("id", courseId)
      .single();

    if (courseErr) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 },
      );
    }

    let productId = course.stripe_product_id as string | null;
    const existingPriceId = course.stripe_price_id as string | null;

    // Switching to Free or Pro Only — archive price but keep product
    if (!priceCents || priceCents <= 0) {
      if (existingPriceId) {
        await stripe.prices.update(existingPriceId, { active: false });
      }

      await supabase
        .from("courses")
        .update({ stripe_price_id: null })
        .eq("id", courseId);

      console.log(
        `[stripe/sync-product] Course ${courseId} price cleared (free/pro)`,
      );

      return NextResponse.json({
        stripe_product_id: productId,
        stripe_price_id: null,
      });
    }

    // Create or update Stripe Product
    if (!productId) {
      const product = await stripe.products.create({
        name: title,
        metadata: { courseId, type: "one_time_course" },
      });
      productId = product.id;
    } else {
      await stripe.products.update(productId, { name: title });
    }

    // Archive old Price if it exists
    if (existingPriceId) {
      await stripe.prices.update(existingPriceId, { active: false });
    }

    // Create new Price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: priceCents,
      currency: "usd",
      metadata: { courseId, type: "one_time_course" },
    });

    // Save IDs to course
    await supabase
      .from("courses")
      .update({
        stripe_product_id: productId,
        stripe_price_id: price.id,
      })
      .eq("id", courseId);

    console.log(
      `[stripe/sync-product] Course ${courseId} synced: product=${productId} price=${price.id} amount=${priceCents}`,
    );

    return NextResponse.json({
      stripe_product_id: productId,
      stripe_price_id: price.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to sync product";
    console.error("[stripe/sync-product] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
