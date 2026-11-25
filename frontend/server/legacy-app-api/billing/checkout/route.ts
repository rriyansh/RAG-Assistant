import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = process.env.RESO_PREMIUM_PAYMENT_LINK;
  if (configured) {
    try {
      const link = new URL(configured);
      if (link.origin === "https://buy.stripe.com" && link.pathname.length > 1 && !link.username && !link.password) {
        return NextResponse.redirect(link, { status:303, headers:{"Cache-Control":"no-store"} });
      }
    } catch {
      // Keep malformed deployment configuration out of the response.
    }
  }
  return NextResponse.json({detail:"Premium checkout has not been configured for this deployment."}, {status:503});
}
