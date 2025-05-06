import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// In a real app, use a DB! For demo, in-memory
const guests: Record<string, any> = {};

function generateInviteLink(guestId: string) {
  // In production, use your real domain
  return `https://yourdomain.com/invite/${guestId}`;
}

// GET: Return list of all guests
export async function GET() {
  // Return all guests as array
  return NextResponse.json({ guests: Object.values(guests) });
}

export async function POST(req: NextRequest) {
  const { name, email, phone, method } = await req.json();

  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: "Missing guest info" }, { status: 400 });
  }

  // Generate unique ID for the guest
  const guestId = crypto.randomUUID();
  const inviteLink = generateInviteLink(guestId);

  // Store guest (simulate DB)
  guests[guestId] = {
    id: guestId,
    name,
    email,
    phone,
    method,
    inviteLink,
    invitedAt: new Date().toISOString(),
    status: "invited",
    rsvp: false, // RSVP status, default to false
  };

  // Stub: Send email or SMS
  if (method === "email" && email) {
    // TODO: Integrate with real email service (e.g., SendGrid)
    console.log(`[STUB] Sent invite to ${email} with link: ${inviteLink}`);
  } else if (method === "sms" && phone) {
    // TODO: Integrate with real SMS service (e.g., Twilio)
    console.log(`[STUB] Sent SMS to ${phone} with link: ${inviteLink}`);
  }

  // Return the invite link so it can be copied/shared
  return NextResponse.json({
    success: true,
    guestId,
    inviteLink,
    method,
  });
}