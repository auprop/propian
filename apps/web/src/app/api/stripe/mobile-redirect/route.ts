import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/stripe/mobile-redirect
 *
 * Intermediate redirect page after Stripe Checkout on mobile.
 * Stripe doesn't support custom URL schemes, so we redirect
 * to this HTTPS endpoint first, then use JavaScript to open the deep link.
 *
 * Deep link formats:
 *   Expo Go:   exp://IP:8081/--/academy?payment=success
 *   Prod build: propian://academy?payment=success
 *
 * Query params: ?status=success|cancelled&type=pro|one_time&course=slug
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "success";
  const type = searchParams.get("type") || "";
  const course = searchParams.get("course") || "";

  // Build the deep link query params
  const params = new URLSearchParams();
  params.set("payment", status);
  if (type) params.set("type", type);
  if (course) params.set("course", course);
  const queryStr = params.toString();

  // Detect environment: Vercel = production, otherwise local dev
  const host = req.headers.get("host") || "localhost:3000";
  const isProduction = host.includes("vercel.app") || host.includes("propian.");
  const ip = host.split(":")[0];

  // Production build deep link (custom scheme)
  const prodLink = `propian://academy?${queryStr}`;
  // Expo Go deep link: exp://IP:8081/--/path?query (only works locally)
  const expoGoLink = `exp://${ip}:8081/--/academy?${queryStr}`;

  // Use production link by default on Vercel, Expo Go link locally
  const primaryLink = isProduction ? prodLink : expoGoLink;
  const secondaryLink = isProduction ? expoGoLink : prodLink;
  const secondaryLabel = isProduction ? "Using Expo Go? Tap here" : "Production build? Tap here";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting to Propian...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: #fff;
      text-align: center;
      padding: 24px;
    }
    .container { max-width: 360px; }
    .check {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${status === "success" ? "#c8ff00" : "#666"};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .check svg { width: 32px; height: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #999; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: #c8ff00;
      color: #0a0a0a;
      font-weight: 700;
      font-size: 15px;
      border-radius: 12px;
      text-decoration: none;
      margin-bottom: 12px;
    }
    .alt {
      display: block;
      color: #666;
      font-size: 13px;
      text-decoration: underline;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="check">
      ${status === "success"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3" stroke-linecap="round"><polyline points="20,6 9,17 4,12" /></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>'}
    </div>
    <h1>${status === "success" ? "Payment Successful!" : "Payment Cancelled"}</h1>
    <p id="msg">${status === "success" ? "Redirecting you back to the app..." : "Your payment was cancelled. No charges were made."}</p>
    <a class="btn" href="${primaryLink}">Open Propian</a>
    <a class="alt" href="${secondaryLink}">${secondaryLabel}</a>
  </div>
  <script>
    // Auto-redirect via primary deep link
    setTimeout(function() {
      window.location.href = "${primaryLink}";
    }, 1200);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
