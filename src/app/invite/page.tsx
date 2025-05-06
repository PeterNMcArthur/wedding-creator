"use client";
import React, { useState } from "react";

export default function InvitePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("email");
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setInviteLink("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send invite.");
      } else {
        setInviteLink(data.inviteLink);
        setSuccess(true);
      }
    } catch (err) {
      setError("Network error.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2>Invite a Wedding Guest</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Name:
          <input type="text" required value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Email:
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={method === "sms" || method === "link"} />
        </label>
        <label>
          Phone:
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={method === "email" || method === "link"} />
        </label>
        <label>
          Method:
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="email">Email</option>
            <option value="sms">Text (SMS)</option>
            <option value="link">Personal Link</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Invite"}
        </button>
      </form>
      {error && <div style={{ color: "#b00", marginTop: 12 }}>{error}</div>}
      {success && (
        <div style={{ marginTop: 16, background: "#f7f7f7", padding: 12, borderRadius: 6 }}>
          <strong>Invitation Created!</strong>
          <div>
            Personal Link:{" "}
            <input
              type="text"
              readOnly
              style={{ width: "100%" }}
              value={inviteLink}
              onFocus={e => e.target.select()}
            />
            <button
              style={{ marginTop: 8 }}
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
              }}
              type="button"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}