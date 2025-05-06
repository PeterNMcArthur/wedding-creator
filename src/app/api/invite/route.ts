import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/src/db";
import { z } from "zod";

// Only import @sendgrid/mail on the server
let sendgridMail: typeof import("@sendgrid/mail") | null = null;
if (typeof window === "undefined") {
  // @ts-ignore
  sendgridMail = require("@sendgrid/mail");
}

function generateInviteLink(guestId: string) {
  // In production, use your real domain
  return `https://yourdomain.com/invite/${guestId}`;
}

// Zod schema for request validation
const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  method: z.enum(["email", "sms", "link"]),
});

// (Optional) Zod schema for DB guest validation
const guestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  method: z.string(),
  invite_link: z.string(),
  invited_at: z.date().or(z.string()),
  status: z.string(),
  rsvp: z.boolean(),
});

// GET: Return list of all guests
export async function GET() {
  try {
    const res = await query("SELECT * FROM guests ORDER BY invited_at DESC");
    // Optionally validate each guest row
    const guests = res.rows.map((guest: any) => {
      // Accept both string/timestamp for invited_at for compatibility
      guestSchema.parse(guest); // Throws if invalid
      return guest;
    });
    return NextResponse.json({ guests });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate input using Zod
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.errors.map(e => `${e.path[0]}: ${e.message}`).join(", ") ||
      "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { name, email, phone, method } = parsed.data;

  // Require at least email or phone for email/sms, allow neither for link
  if (
    (method === "email" && !email) ||
    (method === "sms" && !phone) ||
    (!email && !phone && method !== "link")
  ) {
    return NextResponse.json(
      { error: "Email or phone is required for this invite method." },
      { status: 400 }
    );
  }

  // Generate unique ID for the guest
  const guestId = crypto.randomUUID();
  const inviteLink = generateInviteLink(guestId);

  // Insert guest into database
  try {
    await query(
      `INSERT INTO guests (id, name, email, phone, method, invite_link, invited_at, status, rsvp)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
      [guestId, name, email || null, phone || null, method, inviteLink, "invited", false]
    );
  } catch (err) {
    console.error("DB insert error:", err);
    return NextResponse.json({ error: "Database insert error" }, { status: 500 });
  }

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