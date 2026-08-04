import React, { useState, useEffect, useRef } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { signUp, logIn, signInWithGoogle } from "./auth";

// ── Google Sign-In setup ────────────────────────────────────────────────
// This app can't create a Google Cloud project or OAuth Client ID on your
// behalf — that requires your own Google account. To turn this on:
//   1. Go to https://console.cloud.google.com/apis/credentials
//   2. Create an OAuth 2.0 Client ID → Application type: "Web application"
//   3. Under "Authorized JavaScript origins" add the URL(s) you'll run this
//      from, e.g. http://localhost:5173 for local dev and your real domain
//      (e.g. https://aaicorefx.com) once deployed.
//   4. Copy the Client ID it gives you and paste it below.
// Until you do, the Google button will show a friendly "not configured"
// note instead of a broken button.
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

function decodeJwt(token) {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
  return JSON.parse(json);
}

export default function AuthPage({ storage, onAuthed, brand = "AAICOREFX" }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("loading"); // loading | ready | unavailable | not-configured
  const googleBtnRef = useRef(null);

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = mode === "signup"
        ? await signUp(storage, { name, email, password })
        : await logIn(storage, { email, password });
      if (result.error) setError(result.error);
      else onAuthed(result.user);
    } catch (e) {
      setError("Something went wrong: " + (e && e.message ? e.message : "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setError("");
    setBusy(true);
    try {
      const payload = decodeJwt(response.credential);
      const result = await signInWithGoogle(storage, { email: payload.email, name: payload.name });
      if (result.error) setError(result.error);
      else onAuthed(result.user);
    } catch (e) {
      setError("Google Sign-In failed: " + (e && e.message ? e.message : "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
      setGoogleStatus("not-configured");
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setGoogleStatus("unavailable"); }, 5000);

    const init = () => {
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_black", size: "large", shape: "pill", width: 312,
            text: mode === "signup" ? "signup_with" : "signin_with",
          });
        }
        clearTimeout(timeout);
        if (!cancelled) setGoogleStatus("ready");
      } catch (e) {
        if (!cancelled) setGoogleStatus("unavailable");
      }
    };

    if (window.google && window.google.accounts) {
      init();
    } else {
      const existing = document.getElementById("google-gsi-script");
      const script = existing || document.createElement("script");
      if (!existing) {
        script.id = "google-gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", init);
      script.addEventListener("error", () => { if (!cancelled) setGoogleStatus("unavailable"); });
    }

    return () => { cancelled = true; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="auth-root">
      <style>{AUTH_CSS}</style>
      <div className="auth-box">
        <div className="auth-logo">{brand}</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "auth-tab-active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Log In</button>
          <button className={`auth-tab ${mode === "signup" ? "auth-tab-active" : ""}`} onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button>
        </div>

        <div className="auth-google-wrap">
          <div ref={googleBtnRef} style={{ display: googleStatus === "ready" ? "flex" : "none", justifyContent: "center" }} />
          {googleStatus === "loading" && <div className="auth-google-note">Loading Google Sign-In…</div>}
          {googleStatus === "not-configured" && (
            <div className="auth-google-note">Google Sign-In isn't configured yet — see the code comment / README for setup steps.</div>
          )}
          {googleStatus === "unavailable" && (
            <div className="auth-google-note">Google Sign-In couldn't load here (this preview's sandbox often blocks it) — it should work once deployed to your real domain.</div>
          )}
        </div>
        <div className="auth-divider"><span>or use email</span></div>

        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <div className="auth-field">
              <label>Name</label>
              <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" disabled={busy} type="submit">
            {mode === "signup" ? <UserPlus size={16} /> : <LogIn size={16} />}
            {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode("login"); setError(""); }}>Log in</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const AUTH_CSS = `
.auth-root { height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; background: #0A0B0D; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 16px; box-sizing: border-box; }
.auth-box { width: 360px; max-width: 100%; background: #131519; border: 1px solid #262A31; border-radius: 14px; padding: 28px; }
.auth-logo { font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: 1.5px; text-align: center; color: #F4F5F7; margin-bottom: 20px; }
.auth-tabs { display: flex; gap: 4px; background: #1B1E24; border-radius: 8px; padding: 3px; margin-bottom: 18px; }
.auth-tab { flex: 1; background: none; border: none; color: #8B8F98; padding: 8px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; font-weight: 600; }
.auth-tab-active { background: #131519; color: #F4F5F7; }
.auth-google-wrap { display: flex; justify-content: center; margin-bottom: 10px; min-height: 30px; align-items: center; }
.auth-google-note { font-size: 11px; color: #8B8F98; text-align: center; line-height: 1.4; }
.auth-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0; font-size: 11px; color: #8B8F98; }
.auth-divider::before, .auth-divider::after { content: ""; flex: 1; height: 1px; background: #262A31; }
.auth-field { margin-bottom: 14px; }
.auth-field label { display: block; font-size: 10.5px; letter-spacing: 0.5px; color: #8B8F98; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
.auth-input { width: 100%; background: #1B1E24; border: 1px solid #262A31; color: #F4F5F7; border-radius: 8px; padding: 10px 12px; font-size: 13.5px; font-family: inherit; box-sizing: border-box; }
.auth-input:focus { outline: none; border-color: #8B7CF6; }
.auth-error { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.35); color: #F87171; font-size: 12.5px; padding: 8px 10px; border-radius: 8px; margin-bottom: 12px; }
.auth-submit { width: 100%; background: #34D399; color: #052E1B; border: none; border-radius: 8px; padding: 11px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
.auth-submit:disabled { opacity: 0.6; cursor: default; }
.auth-switch { text-align: center; font-size: 12.5px; color: #8B8F98; margin-top: 16px; }
.auth-switch button { background: none; border: none; color: #8B7CF6; cursor: pointer; font-size: 12.5px; font-family: inherit; font-weight: 600; padding: 0; margin-left: 2px; }
`;
