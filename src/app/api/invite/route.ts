import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Only import @sendgrid/mail on the server
let sendgridMail: typeof import("@sendgrid/mail") | null = null;
if (typeof window === "undefined") {
  // @ts-ignore
  sendgridMail = require("@sendgrid/mail");
}

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

  // Actually send email using SendGrid if configured
  if (method === "email" && email) {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      return NextResponse.json(
        { error: "SendGrid is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in your environment." },
        { status: 500 }
      );
    }
    try {
      if (sendgridMail) {
        sendgridMail.setApiKey(SENDGRID_API_KEY);
        await sendgridMail.send({
          to: email,
          from: SENDGRID_FROM_EMAIL,
          subject: "You're Invited to the Wedding!",
          html: `
            <p>Hi ${name},</p>
            <p>You are invited to our wedding! Please use the link below to RSVP:</p>
            <p><a href="${inviteLink}">${inviteLink}</a></p>
            <p>We hope to see you there!</p>
          `,
        });
      }
    } catch (err: any) {
      console.error("SendGrid error:", err);
      return NextResponse.json(
        { error: "Failed to send email invite." },
        { status: 500 }
      );
    }
  } else if (method === "sms" && phone) {
    // Twilio integration
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
      return NextResponse.json(
        { error: "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE in your environment." },
        { status: 500 }
      );
    }
    try {
      // Only require twilio on the server
      // @ts-ignore
      const twilio = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        to: phone,
        from: TWILIO_FROM_PHONE,
        body:
          `Hi ${name}, you are invited to our wedding! RSVP here: ${inviteLink}`
      });
    } catch (err: any) {
      console.error("Twilio error:", err);
      return NextResponse.json(
        { error: "Failed to send SMS invite." },
        { status: 500 }
      );
    }
  }

  // Return the invite link so it can be copied/shared
  return NextResponse.json({
    success: true,
    guestId,
    inviteLink,
    method,
  });
}