import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Use service role client to bypass RLS (webhook runs without user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Extract current period dates from subscription items (Stripe SDK v20+) */
function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  return {
    periodStart: item?.current_period_start ?? null,
    periodEnd: item?.current_period_end ?? null,
  };
}

/** Get subscription ID from invoice (Stripe SDK v20+) */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details;
  if (subDetails?.subscription) {
    return typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription.id;
  }
  return null;
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for payment and subscription lifecycle.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe/webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const type = session.metadata?.type;

        if (!userId) {
          console.error("[stripe/webhook] Missing userId in session metadata");
          break;
        }

        if (type === "one_time") {
          // One-time course purchase
          const courseId = session.metadata?.courseId;
          if (!courseId) {
            console.error("[stripe/webhook] Missing courseId in metadata");
            break;
          }

          // Insert purchase record
          await supabase.from("purchases").insert({
            user_id: userId,
            course_id: courseId,
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
            status: "completed",
            completed_at: new Date().toISOString(),
          });

          // Auto-enroll user in the course
          const { data: existing } = await supabase
            .from("user_course_progress")
            .select("user_id")
            .eq("user_id", userId)
            .eq("course_id", courseId)
            .maybeSingle();

          if (!existing) {
            await supabase.from("user_course_progress").insert({
              user_id: userId,
              course_id: courseId,
            });
          }

          console.log(
            `[stripe/webhook] Purchase completed: user=${userId} course=${courseId}`,
          );
        }

        if (type === "pro") {
          // Pro subscription created
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : null;

          if (subscriptionId) {
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);
            const { periodStart, periodEnd } =
              getSubscriptionPeriod(subscription);

            // Insert subscription record
            await supabase.from("subscriptions").insert({
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id:
                typeof session.customer === "string" ? session.customer : "",
              status: subscription.status,
              current_period_start: periodStart
                ? new Date(periodStart * 1000).toISOString()
                : null,
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
            });

            // Update profile — auto-verify Pro subscribers
            await supabase
              .from("profiles")
              .update({
                pro_subscription_status: subscription.status as
                  | "active"
                  | "trialing"
                  | "past_due"
                  | "canceled",
                pro_subscription_id: subscriptionId,
                pro_expires_at: periodEnd
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
                is_verified: true,
              })
              .eq("id", userId);

            console.log(
              `[stripe/webhook] Pro subscription created: user=${userId} sub=${subscriptionId} (auto-verified)`,
            );
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const { periodStart, periodEnd } =
          getSubscriptionPeriod(subscription);

        // Sync subscription table
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: periodStart
              ? new Date(periodStart * 1000).toISOString()
              : null,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        // Sync profile
        await supabase
          .from("profiles")
          .update({
            pro_subscription_status: subscription.status as
              | "active"
              | "trialing"
              | "past_due"
              | "canceled",
            pro_expires_at: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("id", userId);

        console.log(
          `[stripe/webhook] Subscription updated: user=${userId} status=${subscription.status}`,
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        // Mark subscription as canceled
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Update profile — keep pro_expires_at so user has access until period end
        await supabase
          .from("profiles")
          .update({
            pro_subscription_status: "canceled",
          })
          .eq("id", userId);

        console.log(
          `[stripe/webhook] Subscription canceled: user=${userId}`,
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          // Get userId from subscription metadata
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          if (!userId) break;

          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);

          await supabase
            .from("profiles")
            .update({ pro_subscription_status: "past_due" })
            .eq("id", userId);

          console.log(
            `[stripe/webhook] Payment failed: user=${userId} sub=${subscriptionId}`,
          );
        }
        break;
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
    }
  } catch (err: unknown) {
    console.error("[stripe/webhook] Handler error:", err);
    // Return 200 to prevent Stripe from retrying on our application errors
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}
