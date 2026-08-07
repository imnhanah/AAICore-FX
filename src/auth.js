// Lightweight client-side authentication.
//
// IMPORTANT: this hashes passwords with SHA-256 and stores accounts in the
// browser's storage. That's enough to put a login screen in front of your
// own tool, but it is NOT a substitute for a real backend — anyone with
// dev tools open can read the hashed user list. Don't reuse important
// passwords here, and if this ever needs to hold real user data, move
// auth to a real backend (Supabase Auth / Firebase Auth / your own API).

const USERS_KEY = "auth:users";
const SESSION_KEY = "auth:session";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const genSalt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function getUsers(storage) {
  try {
    const res = await storage.get(USERS_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

async function saveUsers(storage, users) {
  await storage.set(USERS_KEY, JSON.stringify(users));
}

export async function signUp(storage, { name, email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim()) return { error: "Please enter your name." };
  if (!cleanEmail || !cleanEmail.includes("@")) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  try {
    const users = await getUsers(storage);
    if (users.some((u) => u.email === cleanEmail)) {
      return { error: "An account with that email already exists." };
    }
    const salt = genSalt();
    const passHash = await sha256(salt + ":" + password);
    const user = { name: name.trim(), email: cleanEmail, salt, passHash };
    await saveUsers(storage, [...users, user]);
    await storage.set(SESSION_KEY, JSON.stringify({ email: cleanEmail }));
    return { user: { name: user.name, email: user.email } };
  } catch (e) {
    return { error: "Couldn't create your account — storage error. Please try again." };
  }
}

export async function logIn(storage, { email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const users = await getUsers(storage);
    const user = users.find((u) => u.email === cleanEmail);
    if (!user) return { error: "No account found with that email." };
    if (user.provider === "google") return { error: "This email uses Google Sign-In. Use the Google button instead." };
    const hash = await sha256(user.salt + ":" + password);
    if (hash !== user.passHash) return { error: "Incorrect password." };
    await storage.set(SESSION_KEY, JSON.stringify({ email: cleanEmail }));
    return { user: { name: user.name, email: user.email } };
  } catch (e) {
    return { error: "Couldn't log you in — storage error. Please try again." };
  }
}

// Google's ID token (a JWT) already proves the person controls that Google
// account, so we don't need a password for these users — we just find or
// create a matching local profile and start a session.
export async function signInWithGoogle(storage, { email, name }) {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const users = await getUsers(storage);
    let user = users.find((u) => u.email === cleanEmail);
    if (!user) {
      user = { name: name || cleanEmail, email: cleanEmail, provider: "google" };
      await saveUsers(storage, [...users, user]);
    }
    await storage.set(SESSION_KEY, JSON.stringify({ email: cleanEmail }));
    return { user: { name: user.name, email: user.email } };
  } catch (e) {
    return { error: "Couldn't sign you in with Google — storage error. Please try again." };
  }
}

export async function getSession(storage) {
  try {
    const res = await storage.get(SESSION_KEY);
    if (!res || !res.value) return null;
    const { email } = JSON.parse(res.value);
    const users = await getUsers(storage);
    const user = users.find((u) => u.email === email);
    return user ? { name: user.name, email: user.email } : null;
  } catch (e) {
    return null;
  }
}

export async function logOut(storage) {
  try { await storage.delete(SESSION_KEY); } catch (e) {}
}
