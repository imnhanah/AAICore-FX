// Drop-in replacement for the Claude-artifact `window.storage` API,
// backed by the browser's localStorage so the app works as a normal website.

const PREFIX = "tj:";

export const storage = {
  async get(key) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },
  async delete(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    } catch (e) {
      return null;
    }
  },
  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
      }
      return { keys, prefix, shared: false };
    } catch (e) {
      return null;
    }
  },
};
