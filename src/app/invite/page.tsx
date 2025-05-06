"use client";
import React, { useState, useEffect } from "react";

type Guest = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  method: string;
  inviteLink: string;
  invitedAt: string;
  status: string;
  rsvp: boolean;
};

export default function InvitePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("email");
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Fetch all invited guests
  const fetchGuests = async () => {
    setLoadingGuests(true);
    try {
      const res = await fetch("/api/invite");
      const data = await res.json();
      if (res.ok && data.guests) {
        setGuests(data.guests);
      }
    } catch (err) {
      // ignore error for now
    }
    setLoadingGuests(false);
  };

  useEffect(() => {
    fetchGuests();
  }, []);

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
        // Refresh guest list
        fetchGuests();
      }
    } catch (err) {
      setError("Network error.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
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

      <hr style={{ margin: "2rem 0" }} />

      <h3>Guest List</h3>
      {loadingGuests ? (
        <div>Loading guests...</div>
      ) : guests.length === 0 ? (
        <div>No guests have been invited yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Name</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Contact</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Method</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>Invited At</th>
              <th style={{ padding: 6, border: "1px solid #ddd" }}>RSVP</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id}>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>{g.name}</td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {g.email || g.phone || "N/A"}
                </td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>{g.method}</td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>{new Date(g.invitedAt).toLocaleString()}</td>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>
                  {g.rsvp ? (
                    <span style={{ color: "green" }}>Yes</span>
                  ) : (
                    <span style={{ color: "gray" }}>No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}