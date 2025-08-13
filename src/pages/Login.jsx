// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwdEmail, setPwdEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/admin";

  // If already signed in, bounce to admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(redirectTo, { replace: true });
    });
  }, [navigate, redirectTo]);

  async function signInMagic(e) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    setErr("");
    try {
      const redirectToURL =
        window.location.origin + "/login"; // the page user returns to after magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectToURL },
      });
      if (error) throw error;
      setMsg("Check your email for a sign-in link.");
    } catch (e) {
      setErr(e.message || "Failed to send magic link.");
    } finally {
      setStatus("idle");
    }
  }

  async function signInPassword(e) {
    e.preventDefault();
    setStatus("signing");
    setMsg("");
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: pwdEmail,
        password: pwd,
      });
      if (error) throw error;
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setErr(e.message || "Sign-in failed.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand.heron mb-6">Admin Login</h1>

      {/* Magic link */}
      <form onSubmit={signInMagic} className="card space-y-3 mb-6">
        <h2 className="font-semibold text-brand.heron">Email link</h2>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@stillcrossville.com"
          />
        </label>
        <button className="button-primary" type="submit" disabled={status !== "idle"}>
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>

      {/* Password */}
      <form onSubmit={signInPassword} className="card space-y-3">
        <h2 className="font-semibold text-brand.heron">Password</h2>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={pwdEmail}
            onChange={(e) => setPwdEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            required
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
        </label>
        <button className="button-primary" type="submit" disabled={status !== "idle"}>
          {status === "signing" ? "Signing in…" : "Sign in"}
        </button>
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>

      <div className="text-xs text-black/60 mt-4">
        <p>
          You’ll return here after the magic link; once authenticated you’ll be redirected to{" "}
          <code>{redirectTo}</code>.
        </p>
        <p className="mt-2">
          <Link className="underline text-brand.heron" to="/">← Back to site</Link>
        </p>
      </div>
    </section>
  );
}