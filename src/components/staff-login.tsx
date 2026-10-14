"use client";

import { useActionState, useState } from "react";
import { requestEmailSignIn, verifyEmailSignIn } from "@/app/actions";

export function StaffLogin() {
  const [email, setEmail] = useState("");
  const [request, send, sending] = useActionState(requestEmailSignIn, { error: "", sent: false });
  const [verification, verify, verifying] = useActionState(verifyEmailSignIn, { error: "" });
  return <div className="grid gap-5">
    <p className="text-sm text-stone-600">Use the same email as your Dayboard or Gabriel account. Newsroom access is granted separately.</p>
    <form action={send} className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold">Email address<input required type="email" autoComplete="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} className="border border-stone-300 p-3" /></label>
      <button disabled={sending} className="bg-stone-950 px-5 py-3 text-white disabled:opacity-50">{sending ? "Sending…" : request.sent ? "Resend sign-in email" : "Send sign-in email"}</button>
      {request.error && <p role="alert" className="text-sm text-red-900">{request.error}</p>}
    </form>
    {request.sent && <>
      <p role="status" className="text-sm text-stone-700">Check your email for a sign-in link. If your email includes a code, enter it below.</p>
      <form action={verify} className="grid gap-3">
        <input type="hidden" name="email" value={email} />
        <label className="grid gap-1 text-sm font-semibold">Email code<input required name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" className="border border-stone-300 p-3" /></label>
        <button disabled={verifying} className="border border-stone-950 px-5 py-3 disabled:opacity-50">{verifying ? "Verifying…" : "Continue"}</button>
        {verification.error && <p role="alert" className="text-sm text-red-900">{verification.error}</p>}
      </form>
    </>}
  </div>;
}
