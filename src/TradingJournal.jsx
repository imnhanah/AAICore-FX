import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import {
  LayoutGrid, FileText, BarChart2, Calendar as CalendarIcon, Brain,
  Lightbulb, Newspaper, ListChecks, Settings, LogOut, Plus, X, Star,
  ChevronLeft, ChevronRight, Trash2, Pencil, Menu, Search, ChevronDown,
  ChevronUp, Trophy, Key, DollarSign, ShieldCheck, Satellite, Snowflake,
  ImagePlus,
} from "lucide-react";
import { storage } from "./storageShim";
import AuthPage from "./AuthPage";
import { getSession, logOut } from "./auth";

/* ----------------------------- constants ----------------------------- */

const SESSIONS = ["Asia", "London", "NY AM", "NY PM"];
const MOODS = ["Confident", "Neutral", "Fear", "FOMO", "Revenge", "Disciplined", "Anxious", "Excited"];
const DEFAULT_TYPE_TAGS = ["PDRR", "Breakout", "Reversal", "Trend", "Scalp", "Swing", "News Play"];
const DEFAULT_MISTAKE_TAGS = ["Overtrading", "Early Exit", "No Stop Loss", "Revenge Trade", "FOMO Entry",
  "Sized Too Big", "Sized Too Low", "Missed Entry", "Moved Stop", "Chased Entry", "Ignored Rules", "Bad Timing"];
const ASSET_LIST = ["NQ", "ES", "MNQ", "XAUUSD", "MGC", "CrudeOil", "Silver", "EUR/USD", "GBP/USD",
  "USD/JPY", "AUD/CAD", "USD/CAD", "EUR/GBP", "NZD/USD", "BTC/USD", "ETH/USD"];
const ACCOUNT_ICONS = ["🦈", "🏆", "🚀", "🔥", "🐂", "💎", "⚡", "🎯"];
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "tradelog", label: "Trade Log", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "psychology", label: "Psychology", icon: Brain },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "news", label: "News", icon: Newspaper },
  { id: "rules", label: "Rules", icon: ListChecks },
];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) => {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtMoneyShort = (n) => {
  const v = Number(n) || 0;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm = (v, max) => clamp((v / max) * 100, 0, 100);
const classify = (pnl, cap) => (Math.abs(pnl) <= cap ? "be" : pnl > 0 ? "win" : "loss");
const clsColor = (cls) => (cls === "win" ? "tj-green" : cls === "loss" ? "tj-red" : "tj-blue");

/* ------------------------------ seed data ----------------------------- */
/* Exact dataset so every derived stat (totals, tag %, session P&L, day
   score, emotion win-rates) matches the reference screenshots 1:1.       */

function seedTrades() {
  return [
    { id: uid(), date: "2026-07-01", asset: "CrudeOil", direction: "BUY", pnl: 53, rr: 3.1,
      session: "NY AM", rating: 5, types: ["PDRR"], mistakes: [], moodBefore: "Neutral", moodAfter: "Neutral", context: "", screenshots: [] },
    { id: uid(), date: "2026-07-08", asset: "NQ", direction: "BUY", pnl: 214, rr: 0,
      session: "London", rating: 5, types: [], mistakes: [], moodBefore: "Neutral", moodAfter: "Neutral", context: "", screenshots: [] },
    { id: uid(), date: "2026-07-20", asset: "MGC", direction: "BUY", pnl: -85, rr: 0,
      session: "NY PM", rating: 5, types: [], mistakes: [], moodBefore: "Neutral", moodAfter: "Neutral", context: "", screenshots: [] },
    { id: uid(), date: "2026-07-27", asset: "XAUUSD", direction: "SELL", pnl: 542, rr: 3.1,
      session: "NY AM", rating: 4, types: ["PDRR"], mistakes: [], moodBefore: "Neutral", moodAfter: "Neutral", context: "", screenshots: [] },
    { id: uid(), date: "2026-07-29", asset: "ES", direction: "BUY", pnl: 20, rr: 0,
      session: "NY AM", rating: 5, types: [], mistakes: [], moodBefore: "Neutral", moodAfter: "Neutral", context: "", screenshots: [] },
    { id: uid(), date: "2026-08-01", asset: "NQ", direction: "BUY", pnl: 50, rr: 3.1,
      session: "NY AM", rating: 3, types: ["PDRR"], mistakes: [], moodBefore: "Disciplined", moodAfter: "Disciplined", context: "", screenshots: [] },
    { id: uid(), date: "2026-08-01", asset: "NQ", direction: "BUY", pnl: -50, rr: 0,
      session: "NY AM", rating: 5, types: ["PDRR"], mistakes: [], moodBefore: "Fear", moodAfter: "FOMO", context: "I lost", screenshots: [] },
  ];
}

function defaultAccounts() {
  return [
    {
      id: "acc-" + uid(), name: "Main Account", icon: "🦈", balance: 50000, breakevenCap: 35,
      ratingStyle: "stars", theme: "dark", trades: seedTrades(),
      rules: [
        { id: uid(), text: "Wait for confirmation candle before entry", active: true },
        { id: uid(), text: "Max 2% risk per trade", active: true },
        { id: uid(), text: "No trading 30 min before high-impact news", active: true },
      ],
      checkins: {},
    },
    {
      id: "acc-" + uid(), name: "Swing", icon: "🏆", balance: 20000, breakevenCap: 20,
      ratingStyle: "stars", theme: "dark", trades: [], rules: [], checkins: {},
    },
  ];
}

/* ---------------------------- stats engine ---------------------------- */

function computeStats(trades, cap = 0) {
  const sorted = [...trades].sort((a, b) => (a.date < b.date ? -1 : 1));
  const total = sorted.length;
  const wins = sorted.filter((t) => classify(t.pnl, cap) === "win");
  const losses = sorted.filter((t) => classify(t.pnl, cap) === "loss");
  const be = sorted.filter((t) => classify(t.pnl, cap) === "be");
  const netPnl = sorted.reduce((s, t) => s + t.pnl, 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const avgWinLoss = avgLoss ? avgWin / avgLoss : avgWin > 0 ? 3 : 0;
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 0;

  // streak + best runs (trade-level)
  let streak = 0, streakType = null, bestWinStreak = 0, bestLossStreak = 0, run = 0, runType = null;
  sorted.forEach((t) => {
    const type = classify(t.pnl, cap);
    if (type === runType) run++;
    else { run = 1; runType = type; }
    if (type === "win") bestWinStreak = Math.max(bestWinStreak, run);
    if (type === "loss") bestLossStreak = Math.max(bestLossStreak, run);
  });
  for (let i = sorted.length - 1; i >= 0; i--) {
    const type = classify(sorted[i].pnl, cap);
    if (streakType === null) { streakType = type; streak = type === "be" ? 0 : 1; if (type === "be") break; }
    else if (type === streakType) streak++;
    else break;
  }

  const mean = total ? netPnl / total : 0;
  const variance = total ? sorted.reduce((s, t) => s + Math.pow(t.pnl - mean, 2), 0) / total : 0;
  const consistency = total ? clamp(100 - (Math.sqrt(variance) / (Math.abs(mean) || 1)) * 18, 0, 100) : 0;

  let afterLossTotal = 0, afterLossWins = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (classify(sorted[i - 1].pnl, cap) === "loss") {
      afterLossTotal++;
      if (classify(sorted[i].pnl, cap) === "win") afterLossWins++;
    }
  }
  const recovery = afterLossTotal ? (afterLossWins / afterLossTotal) * 100 : 50;

  const thunderScore = Math.round(
    winRate * 0.3 + norm(profitFactor, 3) * 0.25 + norm(avgWinLoss, 3) * 0.15 +
    consistency * 0.15 + recovery * 0.15
  );

  const byDay = {};
  sorted.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const dayEntries = Object.entries(byDay).sort(([a], [b]) => (a < b ? -1 : 1));
  const dayClasses = dayEntries.map(([date, pnl]) => ({ date, pnl, cls: classify(pnl, cap) }));
  const dayWinRate = dayClasses.length ? (dayClasses.filter((d) => d.cls === "win").length / dayClasses.length) * 100 : 0;

  return {
    total, wins: wins.length, losses: losses.length, be: be.length, netPnl, winRate, avgWin, avgLoss,
    avgWinLoss, profitFactor, streak, streakType, bestWinStreak, bestLossStreak, consistency, recovery,
    thunderScore, sorted, byDay, dayClasses, dayWinRate,
  };
}

/* ------------------------------ calendar ------------------------------ */

function groupByDay(trades, cap) {
  const map = {};
  trades.forEach((t) => {
    if (!map[t.date]) map[t.date] = { pnl: 0, count: 0 };
    map[t.date].pnl += t.pnl;
    map[t.date].count += 1;
  });
  Object.keys(map).forEach((k) => { map[k].cls = classify(map[k].pnl, cap); });
  return map;
}

function buildMonthGrid(year, month, byDay) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const info = byDay[iso];
    cells.push({ day: d, iso, pnl: info?.pnl || 0, count: info?.count || 0, cls: info?.cls });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function computeWeeklyBreakdown(trades, year, month, cap) {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const weeksMap = {};
  trades.filter((t) => t.date.slice(0, 7) === monthKey).forEach((t) => {
    const d = new Date(t.date + "T00:00:00");
    const sunday = new Date(d); sunday.setDate(d.getDate() - d.getDay());
    const key = sunday.toISOString().slice(0, 10);
    (weeksMap[key] = weeksMap[key] || []).push(t);
  });
  return Object.entries(weeksMap).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, ts]) => {
    const sunday = new Date(key + "T00:00:00");
    const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6);
    const pnl = ts.reduce((s, t) => s + t.pnl, 0);
    const wins = ts.filter((t) => classify(t.pnl, cap) === "win").length;
    const winRate = ts.length ? (wins / ts.length) * 100 : 0;
    return {
      label: `${sunday.getDate()}-${saturday.getDate()} ${MONTH_ABBR[sunday.getMonth()]}`,
      pnl, winRate, count: ts.length,
    };
  });
}

/* ------------------------------- storage ------------------------------ */

const storageKeyFor = (email) => `trading-journal:state:v2:${email}`;

/* ============================= UI PRIMITIVES =========================== */

function Card({ children, style, className = "" }) {
  return <div className={`tj-card ${className}`} style={style}>{children}</div>;
}

function MultiRing({ segments, size = 64 }) {
  const r = 26, c = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--tj-border)" strokeWidth="6" />
      {segments.map((seg, i) => {
        if (seg.value <= 0) return null;
        const len = (seg.value / total) * c;
        const el = (
          <circle key={i} cx="32" cy="32" r={r} fill="none" stroke={seg.color} strokeWidth="6"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} strokeLinecap="butt"
            transform="rotate(-90 32 32)" />
        );
        acc += len;
        return el;
      })}
    </svg>
  );
}

function StatCard({ label, children }) {
  return (
    <Card className="tj-stat">
      <div className="tj-stat-label">{label}</div>
      {children}
    </Card>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="tj-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`tj-modal ${wide ? "tj-modal-wide" : ""}`}>
        <div className="tj-modal-head">
          <div className="tj-modal-title">{title}</div>
          <button className="tj-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="tj-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="tj-field"><div className="tj-field-label">{label}</div>{children}</div>;
}

function TagPicker({ options, selected, onToggle, color = "purple" }) {
  return (
    <div className="tj-tagwrap">
      {options.map((opt) => (
        <button key={opt} type="button"
          className={`tj-tag tj-tag-${color} ${selected.includes(opt) ? "tj-tag-active" : ""}`}
          onClick={() => onToggle(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="tj-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={20} fill={n <= value ? "#FBBF24" : "none"}
          stroke={n <= value ? "#FBBF24" : "var(--tj-muted)"} onClick={() => onChange(n)} style={{ cursor: "pointer" }} />
      ))}
      <span className="tj-stars-label">{value ? `${value}/5` : "Not rated"}</span>
    </div>
  );
}

function getGrade(winRate, pnl, count) {
  if (!count) return "-";
  if (winRate >= 70 && pnl > 0) return "A+";
  if (winRate >= 60 && pnl > 0) return "A";
  if (winRate >= 50) return "B";
  if (winRate >= 30) return "C";
  return "D";
}

/* ============================ SCREENSHOT UPLOADER ======================= */

function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ScreenshotUploader({ screenshots, onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const addFiles = useCallback(async (files) => {
    const room = 5 - screenshots.length;
    const list = Array.from(files).slice(0, Math.max(0, room)).filter((f) => f.type.startsWith("image/"));
    for (const f of list) {
      try {
        const dataUrl = await downscaleImage(f);
        onChange((prev) => (prev.length >= 5 ? prev : [...prev, dataUrl]));
      } catch (e) { /* ignore unreadable file */ }
    }
  }, [screenshots.length, onChange]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items).filter((it) => it.type.startsWith("image/"));
      if (items.length) { addFiles(items.map((it) => it.getAsFile())); e.preventDefault(); }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [addFiles]);

  return (
    <div className="tj-field">
      <div className="tj-field-label">Screenshots ({screenshots.length}/5)</div>
      <div
        className={`tj-dropzone ${dragOver ? "tj-dropzone-active" : ""}`}
        onClick={() => screenshots.length < 5 && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        {screenshots.length === 0 ? (
          <>
            <ImagePlus size={20} color="var(--tj-muted)" />
            <div className="tj-dropzone-text">Paste · Drag · Click — {5 - screenshots.length} slots left</div>
          </>
        ) : (
          <div className="tj-shot-grid">
            {screenshots.map((src, i) => (
              <div key={i} className="tj-shot-thumb">
                <img src={src} alt={`screenshot ${i + 1}`} />
                <button type="button" className="tj-shot-remove"
                  onClick={(e) => { e.stopPropagation(); onChange((prev) => prev.filter((_, idx) => idx !== i)); }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {screenshots.length < 5 && (
              <div className="tj-shot-add"><Plus size={16} color="var(--tj-muted)" /></div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      <div className="tj-dropzone-warn">⚠ Keep images small — large screenshots may fail to save</div>
    </div>
  );
}

/* ============================== NEW TRADE MODAL ========================= */

function NewTradeModal({ onClose, onSave, editing, typeTags, mistakeTags, onAddTypeTag }) {
  const [form, setForm] = useState(
    editing || {
      id: uid(), date: todayISO(), asset: "", direction: "BUY", pnl: "", rr: "",
      session: SESSIONS[2], rating: 0, types: [], mistakes: [], moodBefore: "Neutral",
      moodAfter: "Neutral", context: "", screenshots: [],
    }
  );
  const [customType, setCustomType] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArr = (k, val) => setForm((f) => ({
    ...f, [k]: f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val],
  }));
  const setScreenshots = (updater) => setForm((f) => ({ ...f, screenshots: updater(f.screenshots) }));

  const save = () => {
    if (!form.asset.trim() || form.pnl === "") return;
    onSave({ ...form, pnl: parseFloat(form.pnl) || 0, rr: parseFloat(form.rr) || 0 });
  };

  const visibleTypes = typeTags.filter((t) => t.toLowerCase().includes(typeSearch.toLowerCase()));

  return (
    <Modal title={editing ? "Edit Trade" : "New Trade"} onClose={onClose} wide>
      <div className="tj-section-label">Trade Details</div>
      <div className="tj-grid3">
        <Field label="Asset *">
          <input className="tj-input" placeholder="Type or select..." value={form.asset}
            onChange={(e) => set("asset", e.target.value)} list="tj-asset-list" />
          <datalist id="tj-asset-list">{ASSET_LIST.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Direction">
          <select className="tj-input" value={form.direction} onChange={(e) => set("direction", e.target.value)}>
            <option value="BUY">BUY</option><option value="SELL">SELL</option>
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className="tj-input" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>
      <div className="tj-grid3">
        <Field label="P&L ($) *">
          <input type="number" className="tj-input" placeholder="-50" value={form.pnl}
            onChange={(e) => set("pnl", e.target.value)} />
        </Field>
        <Field label="RR">
          <input type="number" step="0.1" className="tj-input" placeholder="2.5" value={form.rr}
            onChange={(e) => set("rr", e.target.value)} />
        </Field>
        <Field label="Session">
          <select className="tj-input" value={form.session} onChange={(e) => set("session", e.target.value)}>
            {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="tj-section-label">Rating</div>
      <Stars value={form.rating} onChange={(v) => set("rating", v)} />

      <div className="tj-section-label">Type</div>
      <input className="tj-input" placeholder="Add tags..." value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} />
      <div className="tj-inline-add">
        <input className="tj-input" placeholder="Custom → Enter" value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customType.trim()) {
              onAddTypeTag(customType.trim()); toggleArr("types", customType.trim()); setCustomType("");
            }
          }} />
        <button className="tj-btn-outline" onClick={() => {
          if (customType.trim()) { onAddTypeTag(customType.trim()); toggleArr("types", customType.trim()); setCustomType(""); }
        }}>Add</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <TagPicker options={visibleTypes} selected={form.types} onToggle={(v) => toggleArr("types", v)} color="purple" />
      </div>

      <div className="tj-section-label">Mistakes</div>
      <TagPicker options={mistakeTags} selected={form.mistakes} onToggle={(v) => toggleArr("mistakes", v)} color="red" />

      <div className="tj-section-label">Psychology</div>
      <div className="tj-grid2">
        <Field label="Before">
          <select className="tj-input" value={form.moodBefore} onChange={(e) => set("moodBefore", e.target.value)}>
            {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="After">
          <select className="tj-input" value={form.moodAfter} onChange={(e) => set("moodAfter", e.target.value)}>
            {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <ScreenshotUploader screenshots={form.screenshots} onChange={setScreenshots} />

      <Field label="Notes">
        <textarea className="tj-input tj-textarea" placeholder="Context..." value={form.context}
          onChange={(e) => set("context", e.target.value)} />
      </Field>

      <div className="tj-modal-actions">
        <button className="tj-btn-outline" onClick={onClose}>Cancel</button>
        <button className="tj-btn-primary" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

/* ============================ ACCOUNT MODALS =========================== */

function AccountSettingsModal({ account, onClose, onSave }) {
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(account.balance);
  const [beCap, setBeCap] = useState(account.breakevenCap);
  const [ratingStyle, setRatingStyle] = useState(account.ratingStyle);
  const [theme, setTheme] = useState(account.theme);
  return (
    <Modal title={<span><Settings size={16} style={{ marginRight: 6, verticalAlign: -3 }} />Account Settings</span>} onClose={onClose}>
      <Field label="Display Name"><input className="tj-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Starting Balance ($)"><input type="number" className="tj-input" value={balance} onChange={(e) => setBalance(e.target.value)} /></Field>
      <Field label="Breakeven Cap ($)">
        <input type="number" className="tj-input" value={beCap} onChange={(e) => setBeCap(e.target.value)} />
        <div className="tj-chip-row">
          {[0, 10, 20, 35, 50].map((v) => (
            <button key={v} className={`tj-chip ${Number(beCap) === v ? "tj-chip-active" : ""}`} onClick={() => setBeCap(v)}>${v}</button>
          ))}
        </div>
      </Field>
      <div className="tj-field-label">Rating Style</div>
      <div className="tj-chip-row">
        <button className={`tj-chip-big ${ratingStyle === "stars" ? "tj-chip-active" : ""}`} onClick={() => setRatingStyle("stars")}>★ Stars</button>
        <button className={`tj-chip-big ${ratingStyle === "grades" ? "tj-chip-active" : ""}`} onClick={() => setRatingStyle("grades")}>A+ Grades</button>
      </div>
      <div className="tj-field-label">Theme</div>
      <div className="tj-chip-row">
        <button className={`tj-chip-big ${theme === "dark" ? "tj-chip-active" : ""}`} onClick={() => setTheme("dark")}>DARK</button>
        <button className={`tj-chip-big ${theme === "light" ? "tj-chip-active" : ""}`} onClick={() => setTheme("light")}>LIGHT</button>
      </div>
      <div className="tj-modal-actions">
        <button className="tj-btn-outline" onClick={onClose}>Cancel</button>
        <button className="tj-btn-primary" onClick={() => onSave({ ...account, name, balance: parseFloat(balance) || 0, breakevenCap: parseFloat(beCap) || 0, ratingStyle, theme })}>Save</button>
      </div>
    </Modal>
  );
}

function AddAccountModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(10000);
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]);
  return (
    <Modal title="Add Account" onClose={onClose}>
      <Field label="Account Name"><input className="tj-input" placeholder="e.g. Prop Firm Challenge" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Starting Balance ($)"><input type="number" className="tj-input" value={balance} onChange={(e) => setBalance(e.target.value)} /></Field>
      <div className="tj-field-label">Icon</div>
      <div className="tj-chip-row">
        {ACCOUNT_ICONS.map((ic) => <button key={ic} className={`tj-chip-big ${icon === ic ? "tj-chip-active" : ""}`} onClick={() => setIcon(ic)}>{ic}</button>)}
      </div>
      <div className="tj-modal-actions">
        <button className="tj-btn-outline" onClick={onClose}>Cancel</button>
        <button className="tj-btn-primary" onClick={() => {
          if (!name.trim()) return;
          onCreate({ id: "acc-" + uid(), name: name.trim(), icon, balance: parseFloat(balance) || 0, breakevenCap: 20, ratingStyle: "stars", theme: "dark", trades: [], rules: [], checkins: {} });
        }}>Create Account</button>
      </div>
    </Modal>
  );
}

/* ================================ DASHBOARD ============================= */

function DashboardPage({ account, stats, monthCursor, setMonthCursor }) {
  const radarData = [
    { metric: "Win %", value: stats.winRate },
    { metric: "PF", value: norm(stats.profitFactor, 3) },
    { metric: "AVG W/L", value: norm(stats.avgWinLoss, 3) },
    { metric: "Consist.", value: stats.consistency },
    { metric: "Recovery", value: stats.recovery },
  ];
  const cumulative = useMemo(() => {
    let running = 0;
    return stats.sorted.map((t) => { running += t.pnl; return { date: t.date.slice(5), cum: +running.toFixed(2) }; });
  }, [stats.sorted]);
  const dailyData = useMemo(() => stats.dayClasses.map((d) => ({ date: d.date.slice(5), pnl: +d.pnl.toFixed(2), cls: d.cls })), [stats.dayClasses]);

  const year = monthCursor.getFullYear(), month = monthCursor.getMonth();
  const byDayFull = groupByDay(account.trades, account.breakevenCap);
  const weeks = buildMonthGrid(year, month, byDayFull);
  const monthTrades = account.trades.filter((t) => t.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`);
  const monthProfit = monthTrades.filter((t) => classify(t.pnl, account.breakevenCap) === "win").length;
  const monthLoss = monthTrades.filter((t) => classify(t.pnl, account.breakevenCap) === "loss").length;
  const monthBE = monthTrades.length - monthProfit - monthLoss;
  const weeklyBreakdown = computeWeeklyBreakdown(account.trades, year, month, account.breakevenCap);

  const pctChange = account.balance ? (stats.netPnl / account.balance) * 100 : 0;
  const grossProfit = stats.sorted.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLossAmt = stats.sorted.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
  const winSegPct = stats.avgWin + stats.avgLoss ? (stats.avgWin / (stats.avgWin + stats.avgLoss)) * 100 : 50;

  return (
    <>
      <div className="tj-stats-grid">
        <StatCard label={`NET P&L · ${stats.total}T`}>
          <div className="tj-stat-value">{fmtMoney(stats.netPnl)}</div>
          <div className="tj-stat-sub"><span className="tj-green">{fmtMoneyShort(grossProfit)}</span>{"   "}<span className="tj-muted-txt">{pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%</span>{"   "}<span className="tj-red">{fmtMoneyShort(grossLossAmt)}</span></div>
        </StatCard>

        <StatCard label="TRADE WIN %">
          <div className="tj-stat-row">
            <div><div className="tj-stat-value">{stats.winRate.toFixed(1)}%</div></div>
            <MultiRing segments={[{ value: stats.wins, color: "#34D399" }, { value: stats.be, color: "#60A5FA" }, { value: stats.losses, color: "#F87171" }]} />
          </div>
          <div className="tj-badge-dot">
            <span className="tj-dot tj-dot-green">{stats.wins}</span>
            <span className="tj-dot tj-dot-blue">{stats.be}</span>
            <span className="tj-dot tj-dot-red">{stats.losses}</span>
          </div>
        </StatCard>

        <StatCard label="PROFIT FACTOR">
          <div className="tj-stat-row">
            <div><div className="tj-stat-value">{stats.profitFactor.toFixed(2)}</div></div>
            <MultiRing segments={[{ value: norm(stats.profitFactor, 3), color: "#FBBF24" }, { value: 100 - norm(stats.profitFactor, 3), color: "var(--tj-border)" }]} />
          </div>
        </StatCard>

        <StatCard label="WIN STREAK">
          <div className="tj-stat-row">
            <div>
              <div className="tj-stat-value" style={{ color: stats.streakType === "loss" ? "var(--tj-red)" : "var(--tj-green)" }}>
                {stats.streak === 0 ? "0" : (stats.streakType === "loss" ? "-" : "+") + stats.streak}
              </div>
              <div className="tj-stat-sub"><Snowflake size={11} style={{ verticalAlign: -1 }} /> Best: {stats.bestWinStreak}W · Loss streak: {stats.bestLossStreak}L</div>
            </div>
            <MultiRing segments={[{ value: stats.wins, color: "#34D399" }, { value: stats.losses, color: "#F87171" }]} />
          </div>
        </StatCard>

        <StatCard label="AVG WIN/LOSS">
          <div className="tj-stat-value">{stats.avgLoss ? stats.avgWinLoss.toFixed(2) : "∞"}</div>
          <div className="tj-winloss-bar">
            <div className="tj-winloss-fill" style={{ width: `${winSegPct}%` }} />
          </div>
          <div className="tj-stat-sub-row"><span className="tj-green">+{fmtMoneyShort(stats.avgWin).replace("+", "")}</span><span className="tj-red">-{fmtMoneyShort(stats.avgLoss).replace("-", "")}</span></div>
        </StatCard>
      </div>

      <div className="tj-row3">
        <Card className="tj-panel">
          <div className="tj-panel-head"><span className="tj-thunder">⚡ THUNDER SCORE</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData} outerRadius={65}>
              <PolarGrid stroke="var(--tj-border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--tj-muted)", fontSize: 10 }} />
              <Radar dataKey="value" stroke="#8B7CF6" fill="#8B7CF6" fillOpacity={0.45} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="tj-avgrr-label">Avg RR</div>
          <div className="tj-gauge-track">
            <div className="tj-gauge-knob" style={{ left: `${stats.thunderScore}%` }} />
          </div>
          <div className="tj-gauge-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          <div className="tj-edge-num">{stats.thunderScore}</div>
          <div className="tj-edge-label">THUNDER SCORE</div>
        </Card>

        <Card className="tj-panel tj-panel-wide">
          <div className="tj-panel-head">
            <span>Cumulative P&L</span>
            <span className={`tj-pill ${stats.netPnl >= 0 ? "tj-pill-green" : "tj-pill-red"}`}>{pctChange >= 0 ? "↑" : "↓"}{Math.abs(pctChange).toFixed(2)}% {fmtMoney(stats.netPnl)}</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={cumulative}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--tj-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "#1B1E24", border: "1px solid var(--tj-border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Cumulative"]} />
              <Area type="monotone" dataKey="cum" stroke="#34D399" fill="url(#cumGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#34D399", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="tj-panel">
          <div className="tj-panel-head"><span>Daily P&L</span><span className="tj-pill tj-pill-neutral">{stats.wins}/{stats.total}</span></div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={dailyData}>
              <CartesianGrid stroke="var(--tj-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "#1B1E24", border: "1px solid var(--tj-border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmtMoney(v), "P&L"]} />
              <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                {dailyData.map((d, i) => <Cell key={i} fill={d.cls === "loss" ? "#F87171" : d.cls === "be" ? "#60A5FA" : "#34D399"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="tj-row2">
        <Card className="tj-panel tj-panel-wide">
          <div className="tj-panel-head">
            <span>{MONTH_NAMES[month]} {year}</span>
            <div className="tj-month-nav">
              <button className="tj-icon-btn" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
              <button className="tj-icon-btn" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="tj-month-summary">
            <div><div className="tj-green tj-mnum">{monthProfit}</div><div className="tj-mlabel">PROFIT</div></div>
            <div><div className="tj-red tj-mnum">{monthLoss}</div><div className="tj-mlabel">LOSS</div></div>
            <div><div className="tj-blue tj-mnum">{monthBE}</div><div className="tj-mlabel">B/E</div></div>
            <div><div className="tj-mnum">{monthTrades.length}</div><div className="tj-mlabel">TRADES</div></div>
          </div>
          <div className="tj-cal-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="tj-cal-grid">
            {weeks.flat().map((cell, i) => (
              <div key={i} className={`tj-cal-cell ${cell ? `tj-cal-${cell.cls || "none"}` : "tj-cal-empty"} ${cell?.iso === todayISO() ? "tj-cal-today" : ""}`}>
                {cell && (<>
                  <div className="tj-cal-day">{cell.day}</div>
                  {cell.count > 0 && (<>
                    <div className={`tj-cal-pnl ${clsColor(cell.cls)}`}>{fmtMoneyShort(cell.pnl)}</div>
                    <div className="tj-cal-dots">{Array.from({ length: Math.min(cell.count, 5) }).map((_, k) => <span key={k} className={`tj-mini-dot tj-dot-${cell.cls}`} />)}</div>
                  </>)}
                </>)}
              </div>
            ))}
          </div>
        </Card>
        <Card className="tj-panel">
          <div className="tj-panel-head"><span>Weekly P&L</span></div>
          {weeklyBreakdown.length === 0 ? <div className="tj-empty">No trades this month.</div> : (
            <div className="tj-weekly-list">
              {weeklyBreakdown.map((w, i) => (
                <div key={i} className="tj-weekly-item">
                  <div className="tj-weekly-item-label">{w.label}</div>
                  <div className={`tj-weekly-item-num ${w.pnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoney(w.pnl)}</div>
                  <div className="tj-weekly-item-sub">{w.winRate.toFixed(0)}% · {w.count}t</div>
                  <div className="tj-bar-track"><div className={`tj-bar-fill ${w.pnl >= 0 ? "tj-bar-green" : "tj-bar-red"}`} style={{ width: `${w.winRate}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* ================================ TRADE LOG ============================= */

function TradeLogPage({ account, onEdit, onDelete, onNewTrade }) {
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState({});

  const cap = account.breakevenCap;
  const assets = useMemo(() => ["All", ...Array.from(new Set(account.trades.map((t) => t.asset)))], [account.trades]);
  const sessionsUsed = useMemo(() => ["All", ...Array.from(new Set(account.trades.map((t) => t.session)))], [account.trades]);

  let filtered = account.trades.filter((t) => {
    if (search && !(`${t.asset} ${t.context}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (assetFilter !== "All" && t.asset !== assetFilter) return false;
    if (sessionFilter !== "All" && t.session !== sessionFilter) return false;
    if (resultFilter !== "All" && classify(t.pnl, cap) !== resultFilter) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    else if (sortKey === "pnl") cmp = a.pnl - b.pnl;
    else if (sortKey === "asset") cmp = a.asset.localeCompare(b.asset);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const stats = computeStats(account.trades, cap);
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <>
      <Card className="tj-panel" style={{ marginBottom: 14 }}>
        <div className="tj-tradelog-controls">
          <div className="tj-search">
            <Search size={14} color="var(--tj-muted)" />
            <input className="tj-search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="tj-input tj-select-sm" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
            {assets.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="tj-input tj-select-sm" value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
            {sessionsUsed.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="tj-input tj-select-sm" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="All">All</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">B/E</option>
          </select>
          <button className={`tj-sortbtn ${sortKey === "date" ? "tj-sortbtn-active" : ""}`} onClick={() => toggleSort("date")}>Date {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>
          <button className={`tj-sortbtn-outline ${sortKey === "pnl" ? "tj-sortbtn-active" : ""}`} onClick={() => toggleSort("pnl")}>P&L</button>
          <button className={`tj-sortbtn-outline ${sortKey === "asset" ? "tj-sortbtn-active" : ""}`} onClick={() => toggleSort("asset")}>Asset</button>
        </div>
      </Card>

      <div className="tj-tradelog-stats">
        <Card className="tj-mini-stat"><div className="tj-mlabel">SHOWING</div><div className="tj-mnum-sm">{filtered.length} trades</div></Card>
        <Card className="tj-mini-stat"><div className="tj-mlabel">NET P&L</div><div className={`tj-mnum-sm ${stats.netPnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoney(stats.netPnl)}</div></Card>
        <Card className="tj-mini-stat"><div className="tj-mlabel">WIN RATE</div><div className="tj-mnum-sm">{stats.winRate.toFixed(0)}%</div></Card>
        <Card className="tj-mini-stat"><div className="tj-mlabel">W/L/BE</div><div className="tj-mnum-sm">{stats.wins}/{stats.losses}/{stats.be}</div></Card>
      </div>

      {filtered.length === 0 ? (
        <Card className="tj-panel"><div className="tj-empty">No trades match these filters.</div></Card>
      ) : (
        <div className="tj-tlog-list">
          {filtered.map((t) => {
            const cls = classify(t.pnl, cap);
            const isOpen = !!expanded[t.id];
            return (
              <Card key={t.id} className={`tj-tlog-card tj-tlog-${cls}`}>
                <div className="tj-tlog-row" onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}>
                  <span className={`tj-tlog-dot tj-dot-${cls}`} />
                  <div className="tj-tlog-main">
                    <div className="tj-tlog-asset">{t.asset}</div>
                    <div className="tj-tlog-pills">
                      <span className={`tj-dirpill-sm ${t.direction === "BUY" ? "tj-green" : "tj-red"}`}>{t.direction}</span>
                      <span className="tj-sesspill">{t.session}</span>
                    </div>
                  </div>
                  <div className="tj-tlog-date">{new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}</div>
                  <div className="tj-tlog-pnl-block">
                    <div className={cls === "be" ? "tj-blue tj-tlog-pnl" : (t.pnl >= 0 ? "tj-green tj-tlog-pnl" : "tj-red tj-tlog-pnl")}>{cls === "be" ? "B/E" : fmtMoney(t.pnl)}</div>
                    {t.rr > 0 && <div className="tj-tlog-rr">{t.rr.toFixed(2)}R</div>}
                  </div>
                  <div className="tj-tlog-types">{t.types.map((tag) => <span key={tag} className="tj-tag tj-tag-purple tj-tag-active tj-tag-xs">{tag}</span>)}</div>
                  <div className="tj-tlog-stars">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
                  <span className={`tj-statuspill tj-statuspill-${cls}`}>{cls === "win" ? "WIN" : cls === "loss" ? "LOSS" : "B/E"}</span>
                  <div className="tj-tlog-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="tj-btn-edit" onClick={() => onEdit(t)}>Edit</button>
                    <button className="tj-btn-del" onClick={() => onDelete(t.id)}>Del</button>
                  </div>
                  <button className="tj-icon-btn">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
                {isOpen && (
                  <div className="tj-tlog-expand">
                    <div className="tj-tlog-detail-grid">
                      <div><div className="tj-mlabel">DATE</div><div>{new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div></div>
                      <div><div className="tj-mlabel">EMOTION BEFORE</div><div className="tj-purple-txt">{t.moodBefore}</div></div>
                      <div><div className="tj-mlabel">EMOTION AFTER</div><div className="tj-purple-txt">{t.moodAfter}</div></div>
                      <div><div className="tj-mlabel">SESSION</div><div>{t.session}</div></div>
                    </div>
                    {t.mistakes.length > 0 && (
                      <div className="tj-tlog-mistakes">{t.mistakes.map((m) => <span key={m} className="tj-tag tj-tag-red tj-tag-active tj-tag-xs">{m}</span>)}</div>
                    )}
                    {t.screenshots?.length > 0 && (
                      <div className="tj-tlog-shots">{t.screenshots.map((src, i) => <img key={i} src={src} alt="" />)}</div>
                    )}
                    {t.context && <div className="tj-tlog-context">"{t.context}"</div>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <button className="tj-fab" onClick={onNewTrade}><Plus size={16} /> New Trade</button>
    </>
  );
}

/* ================================ ANALYTICS ============================= */

function AnalyticsPage({ account }) {
  const trades = account.trades;
  const cap = account.breakevenCap;
  const stats = computeStats(trades, cap);

  const tagStats = useMemo(() => {
    const map = {};
    trades.forEach((t) => t.types.forEach((tag) => {
      if (!map[tag]) map[tag] = { tag, count: 0, netPnl: 0, wins: 0, rrSum: 0, best: -Infinity, worst: Infinity };
      const m = map[tag];
      m.count++; m.netPnl += t.pnl; m.rrSum += t.rr || 0;
      if (classify(t.pnl, cap) === "win") m.wins++;
      m.best = Math.max(m.best, t.pnl); m.worst = Math.min(m.worst, t.pnl);
    }));
    return Object.values(map).map((m) => ({ ...m, winRate: m.count ? (m.wins / m.count) * 100 : 0, avgRR: m.count ? m.rrSum / m.count : 0 }));
  }, [trades, cap]);

  const sessionStats = useMemo(() => SESSIONS.map((s) => {
    const ts = trades.filter((t) => t.session === s);
    const wins = ts.filter((t) => classify(t.pnl, cap) === "win").length;
    const losses = ts.filter((t) => classify(t.pnl, cap) === "loss").length;
    const netPnl = ts.reduce((s2, t) => s2 + t.pnl, 0);
    const winRate = ts.length ? (wins / ts.length) * 100 : 0;
    return { session: s, count: ts.length, netPnl, wins, losses, winRate,
      radar: [
        { metric: "WR", value: winRate },
        { metric: "Vol", value: norm(ts.length, 6) },
        { metric: "Avg", value: norm(ts.length ? netPnl / ts.length : 0, 200) },
        { metric: "Cons", value: ts.length ? 100 - clamp((losses / (ts.length || 1)) * 100, 0, 100) : 0 },
      ] };
  }).filter((s) => s.count > 0), [trades, cap]);

  const instrumentStats = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      if (!map[t.asset]) map[t.asset] = { asset: t.asset, count: 0, netPnl: 0, wins: 0, rrSum: 0 };
      map[t.asset].count++; map[t.asset].netPnl += t.pnl; map[t.asset].rrSum += t.rr || 0;
      if (classify(t.pnl, cap) === "win") map[t.asset].wins++;
    });
    return Object.values(map).map((m) => {
      const winRate = m.count ? (m.wins / m.count) * 100 : 0;
      return { ...m, winRate, avgRR: m.count ? m.rrSum / m.count : 0, grade: getGrade(winRate, m.netPnl, m.count) };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [trades, cap]);

  const tradingDays = stats.dayClasses;
  const greenDays = tradingDays.filter((d) => d.cls === "win").length;
  const redDays = tradingDays.filter((d) => d.cls === "loss").length;
  const flatDays = tradingDays.filter((d) => d.cls === "be").length;
  const avgPerDay = tradingDays.length ? stats.netPnl / tradingDays.length : 0;
  const dayScore = Math.round(clamp(stats.dayWinRate * 0.6 + norm(avgPerDay, 200) * 0.4, 0, 100));
  const dayLabel = dayScore >= 86 ? "Elite" : dayScore >= 66 ? "Solid" : dayScore >= 35 ? "Developing" : "Needs Work";
  const dayColor = dayScore >= 86 ? "#34D399" : dayScore >= 66 ? "#34D399" : dayScore >= 35 ? "#FBBF24" : "#F87171";

  let runs = [], run = null;
  tradingDays.forEach((d) => {
    if (run && run.cls === d.cls) run.len++;
    else { run = { cls: d.cls, len: 1 }; runs.push(run); }
  });
  const bestRun = runs.length ? Math.max(...runs.map((r) => r.len)) : 0;
  const worstRun = runs.length ? Math.min(...runs.map((r) => r.len)) : 0;
  const lastRun = runs[runs.length - 1];
  const currentRunLabel = !lastRun || lastRun.cls === "be" ? "—" : `${lastRun.len}${lastRun.cls === "win" ? "W" : "L"}`;

  const bestDay = tradingDays.length ? tradingDays.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worstDay = tradingDays.length ? tradingDays.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;
  const last6 = tradingDays.slice(-6);
  const maxAbsLast6 = Math.max(1, ...last6.map((d) => Math.abs(d.pnl)));

  const equityData = useMemo(() => {
    let running = account.balance;
    const arr = [{ label: "Start", equity: running }];
    stats.sorted.forEach((t, i) => { running += t.pnl; arr.push({ label: `T${i + 1}`, equity: +running.toFixed(2) }); });
    return arr;
  }, [stats.sorted, account.balance]);
  const equityChangePct = account.balance ? (stats.netPnl / account.balance) * 100 : 0;

  const maxAbsTagPnl = Math.max(1, ...tagStats.map((t) => Math.abs(t.netPnl)));

  // tag combo builder
  const [comboMode, setComboMode] = useState("AND");
  const [comboTypes, setComboTypes] = useState([]);
  const [comboOther, setComboOther] = useState([]);
  const allTypeTags = Array.from(new Set(trades.flatMap((t) => t.types)));
  const otherChips = Array.from(new Set([...SESSIONS, ...trades.map((t) => t.asset)]));
  const toggleCombo = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  const comboSelected = [...comboTypes, ...comboOther];
  const comboMatches = comboSelected.length === 0 ? [] : trades.filter((t) => {
    const hay = [...t.types, t.session, t.asset];
    return comboMode === "AND" ? comboSelected.every((c) => hay.includes(c)) : comboSelected.some((c) => hay.includes(c));
  });
  const comboPnl = comboMatches.reduce((s, t) => s + t.pnl, 0);

  if (trades.length === 0) {
    return <Card className="tj-panel"><div className="tj-empty">Log some trades to unlock analytics for this account.</div></Card>;
  }

  return (
    <div className="tj-analytics">
      <div className="tj-row2">
        <Card className="tj-panel">
          <div className="tj-panel-head"><span>Performance</span></div>
          <div className="tj-perf-list">
            <div><span>Total</span><span className="tj-mono">{stats.total}</span></div>
            <div><span>Wins</span><span className="tj-mono tj-green">{stats.wins}</span></div>
            <div><span>Losses</span><span className="tj-mono tj-red">{stats.losses}</span></div>
            <div><span>B/E</span><span className="tj-mono tj-blue">{stats.be}</span></div>
          </div>
        </Card>
        <Card className="tj-panel">
          <div className="tj-panel-head"><span>💳 Tag Performance</span></div>
          <table className="tj-simple-table">
            <thead><tr><th>TAG</th><th>P&L</th><th>WR</th></tr></thead>
            <tbody>{tagStats.map((t) => (
              <tr key={t.tag}><td className="tj-bold">{t.tag}</td><td className={t.netPnl >= 0 ? "tj-green" : "tj-red"}>{fmtMoney(t.netPnl)}</td><td>{t.winRate.toFixed(0)}%</td></tr>
            ))}</tbody>
          </table>
        </Card>
      </div>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head">
          <span>🔍 Tag Scatter (WR vs P&L)</span>
          <span className="tj-scatter-legend"><i className="tj-dot-green" /> High WR <i className="tj-dot-amber" /> Mid WR <i className="tj-dot-red" /> Low WR</span>
        </div>
        <div className="tj-scatter-box">
          <div className="tj-scatter-quad tj-scatter-tl">HIGH WR · LOSING</div>
          <div className="tj-scatter-quad tj-scatter-tr">HIGH WR · PROFIT ★</div>
          <div className="tj-scatter-quad tj-scatter-bl">LOW WR · LOSING ⚠</div>
          <div className="tj-scatter-quad tj-scatter-br">LOW WR · PROFIT</div>
          <div className="tj-scatter-axis-y-top">High WR</div>
          <div className="tj-scatter-axis-y-bot">Low WR</div>
          <div className="tj-scatter-axis-x-left">Loss</div>
          <div className="tj-scatter-axis-x-mid">$0</div>
          <div className="tj-scatter-axis-x-right">Profit</div>
          {tagStats.map((t) => {
            const left = clamp(50 + (t.netPnl / maxAbsTagPnl) * 48, 4, 96);
            const top = clamp(100 - t.winRate, 4, 96);
            const size = clamp(36 + t.count * 6, 36, 70);
            const color = t.winRate >= 66 ? "#34D399" : t.winRate >= 33 ? "#FBBF24" : "#F87171";
            return (
              <div key={t.tag} className="tj-scatter-dot" style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, borderColor: color, color }}>
                {t.tag}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head"><span>Setup Tags</span></div>
        <div className="tj-setup-tags">
          {tagStats.map((t) => {
            const grade = getGrade(t.winRate, t.netPnl, t.count);
            const wins = Math.round((t.winRate / 100) * t.count);
            return (
              <div key={t.tag} className="tj-setup-card">
                <div className="tj-setup-head"><span className="tj-bold">{t.tag}</span><span className="tj-grade-badge">{grade}</span></div>
                <div className="tj-setup-grid">
                  <div><div className="tj-mlabel">NET P&L</div><div className={`tj-bold ${t.netPnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoney(t.netPnl)}</div></div>
                  <div><div className="tj-mlabel">WIN RATE</div><div className="tj-bold tj-purple-txt">{t.winRate.toFixed(0)}%</div></div>
                  <div><div className="tj-mlabel">TRADES</div><div className="tj-bold">{t.count} <span className="tj-muted-txt" style={{ fontSize: 11 }}>({wins}W/{t.count - wins}L)</span></div></div>
                  <div><div className="tj-mlabel">AVG RR</div><div className="tj-bold tj-purple-txt">{t.avgRR.toFixed(2)}</div></div>
                </div>
                <div className="tj-setup-bw">
                  <div className="tj-setup-bw-box tj-setup-bw-best"><div className="tj-mlabel">Best</div><div className="tj-green tj-bold">{fmtMoneyShort(t.best)}</div></div>
                  <div className="tj-setup-bw-box tj-setup-bw-worst"><div className="tj-mlabel">Worst</div><div className="tj-red tj-bold">{fmtMoneyShort(t.worst)}</div></div>
                </div>
                <div className="tj-bar-track" style={{ marginTop: 8 }}><div className="tj-bar-fill tj-bar-green" style={{ width: `${t.winRate}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head"><span>Session Performance</span></div>
        <div className="tj-session-grid">
          {sessionStats.map((s) => (
            <div key={s.session} className="tj-session-card">
              <div className="tj-session-top"><span className="tj-sesspill-lg">{s.session}</span><span className="tj-muted-txt">{s.count} trades</span></div>
              <ResponsiveContainer width="100%" height={100}>
                <RadarChart data={s.radar} outerRadius={38}>
                  <PolarGrid stroke="var(--tj-border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--tj-muted)", fontSize: 8 }} />
                  <Radar dataKey="value" stroke="#8B7CF6" fill="#8B7CF6" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
              <div className={`tj-session-pnl ${s.netPnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoney(s.netPnl)}</div>
              <div className="tj-session-wl"><span className="tj-green">✓{s.wins}W</span><span className="tj-red">✗{s.losses}L</span></div>
              <div className="tj-bar-track"><div className={`tj-bar-fill ${s.winRate >= 50 ? "tj-bar-green" : "tj-bar-red"}`} style={{ width: `${s.winRate}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-day-score-row">
          <div className="tj-day-score-circle" style={{ borderColor: dayColor }}>
            <div className="tj-day-score-num" style={{ color: dayColor }}>{dayScore}</div>
            <div className="tj-day-score-max">/100</div>
          </div>
          <div>
            <div className="tj-day-score-label" style={{ color: dayColor }}>{dayLabel}</div>
            <div className="tj-muted-txt">{tradingDays.length} trading days · avg {fmtMoney(avgPerDay)}/day</div>
            <div className="tj-day-legend">
              <span><i className="tj-dot-green" /> {greenDays} green</span>
              <span><i className="tj-dot-red" /> {redDays} red</span>
              <span><i className="tj-dot-blue" /> {flatDays} flat</span>
            </div>
          </div>
        </div>
        <div className="tj-mlabel" style={{ marginTop: 16 }}>DAY DISTRIBUTION</div>
        <div className="tj-day-dist">
          {greenDays > 0 && <div style={{ width: `${(greenDays / tradingDays.length) * 100}%`, background: "#34D399" }} />}
          {flatDays > 0 && <div style={{ width: `${(flatDays / tradingDays.length) * 100}%`, background: "#60A5FA" }} />}
          {redDays > 0 && <div style={{ width: `${(redDays / tradingDays.length) * 100}%`, background: "#F87171" }} />}
        </div>
        <div className="tj-day-quad-stats">
          <div><div className="tj-mlabel">CURRENT</div><div className="tj-bold">{currentRunLabel}</div></div>
          <div><div className="tj-mlabel">BEST RUN</div><div className="tj-bold">{bestRun}d</div></div>
          <div><div className="tj-mlabel">WORST RUN</div><div className="tj-bold">{worstRun}d</div></div>
          <div><div className="tj-mlabel">AVG/DAY</div><div className="tj-bold">{fmtMoney(avgPerDay)}</div></div>
        </div>
        <div className="tj-day-bestworst">
          <div className="tj-day-bw-box tj-day-bw-best">
            <div className="tj-mlabel">BEST DAY</div>
            <div className="tj-green tj-bold" style={{ fontSize: 18 }}>{fmtMoney(bestDay.pnl)}</div>
            <div className="tj-muted-txt">{new Date(bestDay.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
          </div>
          <div className="tj-day-bw-box tj-day-bw-worst">
            <div className="tj-mlabel">WORST DAY</div>
            <div className="tj-red tj-bold" style={{ fontSize: 18 }}>{fmtMoney(worstDay.pnl)}</div>
            <div className="tj-muted-txt">{new Date(worstDay.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
          </div>
        </div>
        <div className="tj-mlabel" style={{ marginTop: 16 }}>LAST {last6.length} TRADING DAYS</div>
        <div className="tj-last6-track">
          {last6.map((d, i) => (
            <div key={i} className="tj-last6-bar" style={{ background: d.cls === "loss" ? "#F87171" : d.cls === "be" ? "#60A5FA" : "#34D399", flex: Math.max(0.3, Math.abs(d.pnl) / maxAbsLast6) }} title={`${d.date}: ${fmtMoney(d.pnl)}`} />
          ))}
        </div>
        <div className="tj-last6-dates">{last6.map((d, i) => <span key={i}>{d.date.slice(5)}</span>)}</div>
        <div className="tj-last6-legend"><span><i className="tj-dot-green" />Profit day</span><span><i className="tj-dot-red" />Loss day</span><span><i className="tj-dot-blue" />Flat day</span></div>
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head"><span>🏆 Instrument Performance</span></div>
        <div className="tj-table-wrap">
        <table className="tj-simple-table tj-instrument-table">
          <thead><tr><th>INSTRUMENT</th><th>NET P&L</th><th>WIN RATE</th><th>TRADES</th><th>AVG RR</th><th>GRADE</th></tr></thead>
          <tbody>
            {instrumentStats.map((m) => (
              <tr key={m.asset}>
                <td className="tj-bold">{m.asset === instrumentStats[0].asset && "⭐ "}{m.asset}</td>
                <td className={m.netPnl >= 0 ? "tj-green" : "tj-red"}>{fmtMoney(m.netPnl)}</td>
                <td><div className="tj-inline-bar"><div className="tj-bar-track" style={{ width: 90 }}><div className="tj-bar-fill tj-bar-green" style={{ width: `${m.winRate}%` }} /></div><span>{m.winRate.toFixed(0)}%</span></div></td>
                <td className="tj-purple-txt tj-bold">{m.count}</td>
                <td className="tj-purple-txt">{m.avgRR.toFixed(2)}</td>
                <td><span className={`tj-grade-badge ${m.grade === "D" || m.grade === "C" ? "tj-grade-bad" : ""}`}>{m.grade}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head">
          <span>🧪 Tag Combo</span>
          <div className="tj-tabs"><button className={`tj-tab ${comboMode === "AND" ? "tj-tab-active" : ""}`} onClick={() => setComboMode("AND")}>AND</button><button className={`tj-tab ${comboMode === "OR" ? "tj-tab-active" : ""}`} onClick={() => setComboMode("OR")}>OR</button></div>
        </div>
        <div className="tj-mlabel">TYPES</div>
        <div className="tj-chip-row" style={{ marginBottom: 10 }}>
          {allTypeTags.map((t) => <button key={t} className={`tj-chip ${comboTypes.includes(t) ? "tj-chip-active" : ""}`} onClick={() => toggleCombo(comboTypes, setComboTypes, t)}>{t}</button>)}
        </div>
        <div className="tj-chip-row">
          {otherChips.map((t) => <button key={t} className={`tj-chip ${comboOther.includes(t) ? "tj-chip-active" : ""}`} onClick={() => toggleCombo(comboOther, setComboOther, t)}>{t}</button>)}
        </div>
        {comboSelected.length > 0 && (
          <div className="tj-combo-result">{comboMatches.length} trades matched · <span className={comboPnl >= 0 ? "tj-green" : "tj-red"}>{fmtMoney(comboPnl)}</span></div>
        )}
      </Card>

      <Card className="tj-panel" style={{ marginTop: 14 }}>
        <div className="tj-panel-head"><span>Equity</span><span className={`tj-pill ${equityChangePct >= 0 ? "tj-pill-green" : "tj-pill-red"}`}>{equityChangePct >= 0 ? "↑" : "↓"}{Math.abs(equityChangePct).toFixed(2)}%</span></div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equityData}>
            <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B7CF6" stopOpacity={0.4} /><stop offset="100%" stopColor="#8B7CF6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--tj-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--tj-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={["dataMin - 200", "dataMax + 200"]} />
            <Tooltip contentStyle={{ background: "#1B1E24", border: "1px solid var(--tj-border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmtMoney(v), "Equity"]} />
            <Area type="monotone" dataKey="equity" stroke="#8B7CF6" fill="url(#eqGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ================================ CALENDAR =============================== */

function CalendarPage({ account, monthCursor, setMonthCursor }) {
  const year = monthCursor.getFullYear(), month = monthCursor.getMonth();
  const byDay = groupByDay(account.trades, account.breakevenCap);
  const weeks = buildMonthGrid(year, month, byDay);
  const monthTrades = account.trades.filter((t) => t.date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`);
  const monthProfit = monthTrades.filter((t) => classify(t.pnl, account.breakevenCap) === "win").length;
  const monthLoss = monthTrades.filter((t) => classify(t.pnl, account.breakevenCap) === "loss").length;
  const monthBE = monthTrades.length - monthProfit - monthLoss;
  const weeklyBreakdown = computeWeeklyBreakdown(account.trades, year, month, account.breakevenCap);

  const weeksBack = 16;
  const heat = [];
  const monthColLabels = [];
  const start = new Date();
  const startMonday = new Date(start);
  startMonday.setDate(start.getDate() - weeksBack * 7 - ((start.getDay() + 6) % 7));
  for (let w = 0; w < weeksBack; w++) {
    const col = [];
    let monthLabel = "";
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startMonday);
      dt.setDate(startMonday.getDate() + w * 7 + d);
      if (dt.getDate() <= 7 && d === 0) monthLabel = MONTH_ABBR[dt.getMonth()].slice(0, 3);
      const iso = dt.toISOString().slice(0, 10);
      col.push({ iso, pnl: byDay[iso]?.pnl || 0, count: byDay[iso]?.count || 0, cls: byDay[iso]?.cls });
    }
    heat.push(col);
    monthColLabels.push(monthLabel);
  }
  const heatColor = (cell) => {
    if (!cell.count) return "var(--tj-border)";
    if (cell.cls === "win") return cell.pnl > 200 ? "#15803D" : "#34D399";
    if (cell.cls === "loss") return cell.pnl < -200 ? "#991B1B" : "#F87171";
    return "#60A5FA";
  };

  return (
    <div className="tj-row2">
      <div>
        <Card className="tj-panel">
          <div className="tj-panel-head">
            <span>{MONTH_NAMES[month]} {year}</span>
            <div className="tj-month-nav">
              <button className="tj-icon-btn" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
              <button className="tj-icon-btn" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="tj-month-summary">
            <div><div className="tj-green tj-mnum">{monthProfit}</div><div className="tj-mlabel">PROFIT</div></div>
            <div><div className="tj-red tj-mnum">{monthLoss}</div><div className="tj-mlabel">LOSS</div></div>
            <div><div className="tj-blue tj-mnum">{monthBE}</div><div className="tj-mlabel">B/E</div></div>
            <div><div className="tj-mnum">{monthTrades.length}</div><div className="tj-mlabel">TRADES</div></div>
          </div>
          <div className="tj-cal-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="tj-cal-grid">
            {weeks.flat().map((cell, i) => (
              <div key={i} className={`tj-cal-cell ${cell ? `tj-cal-${cell.cls || "none"}` : "tj-cal-empty"} ${cell?.iso === todayISO() ? "tj-cal-today" : ""}`}>
                {cell && (<><div className="tj-cal-day">{cell.day}</div>{cell.count > 0 && <div className={`tj-cal-pnl ${clsColor(cell.cls)}`}>{fmtMoneyShort(cell.pnl)}</div>}</>)}
              </div>
            ))}
          </div>
        </Card>

        <Card className="tj-panel" style={{ marginTop: 16 }}>
          <div className="tj-panel-head"><span>Activity Heatmap</span></div>
          <div className="tj-heat-sub">Last {weeksBack} weeks · Mon → Sun · click any cell to see trades</div>
          <div className="tj-heat-months">{monthColLabels.map((m, i) => <span key={i} className="tj-heat-month-label">{m}</span>)}</div>
          <div className="tj-heatmap">
            {heat.map((col, i) => (
              <div key={i} className="tj-heat-col">{col.map((cell, j) => <div key={j} className="tj-heat-cell" style={{ background: heatColor(cell) }} title={`${cell.iso}: ${fmtMoney(cell.pnl)}`} />)}</div>
            ))}
          </div>
          <div className="tj-heat-legend">
            <span>Less</span>
            <span className="tj-heat-cell" style={{ background: "var(--tj-border)" }} />
            <span className="tj-heat-cell" style={{ background: "#34D399" }} />
            <span className="tj-heat-cell" style={{ background: "#15803D" }} />
            <span>More Profit</span>
            <span style={{ marginLeft: 14 }}>|</span>
            <span className="tj-heat-cell" style={{ background: "#F87171" }} />
            <span className="tj-heat-cell" style={{ background: "#991B1B" }} />
            <span>Loss</span>
            <span className="tj-heat-cell" style={{ background: "#60A5FA", marginLeft: 14 }} />
            <span>B/E</span>
          </div>
        </Card>
      </div>

      <Card className="tj-panel">
        <div className="tj-panel-head"><span>Weekly P&L</span></div>
        {weeklyBreakdown.length === 0 ? <div className="tj-empty">No trades this month.</div> : (
          <div className="tj-weekly-list">
            {weeklyBreakdown.map((w, i) => (
              <div key={i} className="tj-weekly-item">
                <div className="tj-weekly-item-label">{w.label}</div>
                <div className={`tj-weekly-item-num ${w.pnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoney(w.pnl)}</div>
                <div className="tj-weekly-item-sub">{w.winRate.toFixed(0)}% · {w.count}t</div>
                <div className="tj-bar-track"><div className={`tj-bar-fill ${w.pnl >= 0 ? "tj-bar-green" : "tj-bar-red"}`} style={{ width: `${w.winRate}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* =============================== PSYCHOLOGY ============================= */

function PsychologyPage({ account }) {
  const trades = account.trades;
  const cap = account.breakevenCap;
  const moodMap = {};
  trades.forEach((t) => {
    if (!moodMap[t.moodBefore]) moodMap[t.moodBefore] = { count: 0, wins: 0 };
    moodMap[t.moodBefore].count++;
    if (classify(t.pnl, cap) === "win") moodMap[t.moodBefore].wins++;
  });
  const moodData = Object.entries(moodMap).map(([mood, v]) => ({ mood, count: v.count, winRate: (v.wins / v.count) * 100 }))
    .sort((a, b) => b.count - a.count);

  const mistakeMap = {};
  trades.forEach((t) => t.mistakes.forEach((m) => { mistakeMap[m] = (mistakeMap[m] || 0) + 1; }));
  const mistakeList = Object.entries(mistakeMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="tj-row2">
      <Card className="tj-panel">
        <div className="tj-panel-head"><span>Win Rate by Emotion</span></div>
        {moodData.length === 0 ? <div className="tj-empty">Log trades with a mood to see this.</div> : (
          <div className="tj-mood-list">
            {moodData.map((m) => (
              <div key={m.mood}>
                <div className="tj-mood-header"><span className="tj-bold">{m.mood}</span><span className="tj-bold">{m.winRate.toFixed(0)}%</span></div>
                <div className="tj-bar-track"><div className={`tj-bar-fill ${m.winRate >= 50 ? "tj-bar-green" : "tj-bar-red"}`} style={{ width: `${m.winRate}%` }} /></div>
                <div className="tj-muted-txt" style={{ fontSize: 11, marginTop: 2 }}>{m.count} trades</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="tj-panel">
        <div className="tj-panel-head"><span>Mistakes</span></div>
        {mistakeList.length === 0 ? <div className="tj-empty">No mistakes</div> : (
          <div className="tj-mistake-list">
            {mistakeList.map(([m, count]) => (
              <div key={m} className="tj-mistake-row"><span>{m}</span><span className="tj-tag tj-tag-red tj-tag-active tj-tag-xs">{count}</span></div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================================ INSIGHTS =============================== */

function InsightsPage({ account }) {
  const trades = account.trades;
  const cap = account.breakevenCap;
  if (trades.length < 3) {
    return <Card className="tj-panel"><div className="tj-empty">Log a few more trades and Insights will start surfacing patterns automatically.</div></Card>;
  }
  const tagMap = {};
  trades.forEach((t) => t.types.forEach((tag) => {
    if (!tagMap[tag]) tagMap[tag] = { tag, count: 0, netPnl: 0, wins: 0 };
    tagMap[tag].count++; tagMap[tag].netPnl += t.pnl;
    if (classify(t.pnl, cap) === "win") tagMap[tag].wins++;
  }));
  const tagStats = Object.values(tagMap).map((t) => ({ ...t, winRate: (t.wins / t.count) * 100 }));
  const bestTag = tagStats.sort((a, b) => b.netPnl - a.netPnl)[0];

  const assetMap = {};
  trades.forEach((t) => {
    if (!assetMap[t.asset]) assetMap[t.asset] = { asset: t.asset, count: 0, netPnl: 0, wins: 0 };
    assetMap[t.asset].count++; assetMap[t.asset].netPnl += t.pnl;
    if (classify(t.pnl, cap) === "win") assetMap[t.asset].wins++;
  });
  const assetStats = Object.values(assetMap).map((a) => ({ ...a, winRate: (a.wins / a.count) * 100 }));
  const bestAsset = assetStats.sort((a, b) => b.winRate - a.winRate)[0];

  const sessionMap = {};
  trades.forEach((t) => {
    if (!sessionMap[t.session]) sessionMap[t.session] = { session: t.session, count: 0, netPnl: 0, wins: 0 };
    sessionMap[t.session].count++; sessionMap[t.session].netPnl += t.pnl;
    if (classify(t.pnl, cap) === "win") sessionMap[t.session].wins++;
  });
  const sessionStats = Object.values(sessionMap).map((s) => ({ ...s, winRate: (s.wins / s.count) * 100 }));
  const bestSession = sessionStats.sort((a, b) => b.netPnl - a.netPnl)[0];

  const expectancy = trades.length ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0;

  return (
    <>
      {bestTag && (
        <Card className="tj-panel" style={{ marginBottom: 14 }}>
          <div className="tj-panel-head"><span>🔑 Best Confluences &amp; Key Levels</span></div>
          <div className="tj-setup-card" style={{ maxWidth: 280 }}>
            <div className="tj-bold">{bestTag.tag}</div>
            <div className="tj-green tj-bold" style={{ fontSize: 16 }}>{fmtMoney(bestTag.netPnl)}</div>
            <div className="tj-muted-txt" style={{ fontSize: 11, marginBottom: 6 }}>{bestTag.winRate.toFixed(0)}% WR · {bestTag.count}t</div>
            <div className="tj-bar-track"><div className="tj-bar-fill tj-bar-green" style={{ width: `${bestTag.winRate}%` }} /></div>
          </div>
        </Card>
      )}
      {bestAsset && (
        <Card className="tj-panel" style={{ marginBottom: 14 }}>
          <div className="tj-panel-head"><span>⭐ Best Instruments by Win Rate</span></div>
          <div className="tj-setup-card" style={{ maxWidth: 220 }}>
            <div className="tj-bold">{bestAsset.asset}</div>
            <div className="tj-green tj-bold" style={{ fontSize: 20 }}>{bestAsset.winRate.toFixed(0)}%</div>
            <div className="tj-muted-txt" style={{ fontSize: 11 }}>{bestAsset.count} trades · {fmtMoney(bestAsset.netPnl)}</div>
          </div>
        </Card>
      )}
      <div className="tj-insight-grid">
        {bestSession && (
          <div className="tj-insight-card">
            <div className="tj-insight-title"><Trophy size={16} color="#FBBF24" /> Best session: {bestSession.session}</div>
            <div className="tj-muted-txt">Your highest P&amp;L comes from {bestSession.session} ({bestSession.winRate.toFixed(0)}% WR, {fmtMoneyShort(bestSession.netPnl)}). Prioritize this window.</div>
          </div>
        )}
        {bestAsset && (
          <div className="tj-insight-card">
            <div className="tj-insight-title"><Star size={16} color="#FBBF24" /> Best instrument: {bestAsset.asset}</div>
            <div className="tj-muted-txt">{bestAsset.asset} yields {fmtMoneyShort(bestAsset.netPnl)} with {bestAsset.winRate.toFixed(0)}% WR across {bestAsset.count} trades.</div>
          </div>
        )}
        {bestTag && (
          <div className="tj-insight-card">
            <div className="tj-insight-title"><Key size={16} color="#FBBF24" /> Best confluence: "{bestTag.tag}"</div>
            <div className="tj-muted-txt">Trades tagged "{bestTag.tag}" produce {fmtMoneyShort(bestTag.netPnl)} with {bestTag.winRate.toFixed(0)}% WR. This is your key level/setup.</div>
          </div>
        )}
        <div className="tj-insight-card">
          <div className="tj-insight-title"><DollarSign size={16} color="#FBBF24" /> {expectancy >= 0 ? "Strong positive expectancy" : "Negative expectancy"}</div>
          <div className="tj-muted-txt">Per-trade expectancy: {fmtMoney(expectancy)}. {expectancy >= 0 ? "Your edge is real — stay consistent and scale up." : "Review your tagged mistakes before increasing size."}</div>
        </div>
      </div>
    </>
  );
}

/* ================================== NEWS ================================= */

const MOCK_EVENTS = [
  { dow: 1, time: "08:30", currency: "USD", impact: "high", title: "Non-Farm Payrolls", actual: "—", forecast: "185K", previous: "206K" },
  { dow: 1, time: "10:00", currency: "EUR", impact: "medium", title: "ZEW Economic Sentiment", actual: "—", forecast: "12.4", previous: "10.1" },
  { dow: 2, time: "02:00", currency: "GBP", impact: "low", title: "BRC Retail Sales Monitor", actual: "1.2%", forecast: "0.9%", previous: "0.7%" },
  { dow: 2, time: "12:30", currency: "USD", impact: "medium", title: "Core CPI m/m", actual: "0.3%", forecast: "0.3%", previous: "0.2%" },
  { dow: 3, time: "14:00", currency: "USD", impact: "high", title: "FOMC Statement", actual: "—", forecast: "—", previous: "—" },
  { dow: 3, time: "09:00", currency: "EUR", impact: "medium", title: "Industrial Production m/m", actual: "-0.4%", forecast: "-0.2%", previous: "0.1%" },
  { dow: 4, time: "08:30", currency: "USD", impact: "high", title: "Unemployment Claims", actual: "—", forecast: "224K", previous: "231K" },
  { dow: 4, time: "04:30", currency: "JPY", impact: "low", title: "Tertiary Industry Activity", actual: "0.2%", forecast: "0.1%", previous: "-0.3%" },
  { dow: 5, time: "10:00", currency: "USD", impact: "medium", title: "Michigan Consumer Sentiment", actual: "—", forecast: "68.5", previous: "67.2" },
  { dow: 5, time: "05:00", currency: "AUD", impact: "low", title: "Retail Sales m/m", actual: "0.3%", forecast: "0.2%", previous: "0.1%" },
];
const MOCK_HOLIDAYS = [
  { date: "Aug 25", country: "UK", name: "Summer Bank Holiday" },
  { date: "Sep 1", country: "US/CA", name: "Labor Day" },
  { date: "Oct 13", country: "US/CA", name: "Thanksgiving (CA) / Columbus Day (US)" },
  { date: "Nov 11", country: "US", name: "Veterans Day" },
];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekRange(offset) {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + offset * 7);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { sunday, saturday };
}
const fmtShortDate = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function NewsPage() {
  const [impact, setImpact] = useState({ high: true, medium: true, low: true });
  const [currency, setCurrency] = useState("ALL");
  const [tab, setTab] = useState("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const currencies = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

  const { sunday, saturday } = getWeekRange(weekOffset);
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return "Local"; } })();
  const offsetMin = -new Date().getTimezoneOffset();
  const gmtLabel = `GMT${offsetMin >= 0 ? "+" : ""}${(offsetMin / 60).toFixed(offsetMin % 60 === 0 ? 0 : 1)}`;

  // Only "this week" (offset 0) has sample events; other weeks are intentionally empty
  const weekEvents = weekOffset === 0 ? MOCK_EVENTS.map((e) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + e.dow);
    return { ...e, date: d };
  }) : [];
  const filtered = weekEvents.filter((e) => impact[e.impact] && (currency === "ALL" || e.currency === currency));
  const byDay = {};
  filtered.forEach((e) => { const key = e.date.toDateString(); (byDay[key] = byDay[key] || []).push(e); });
  const dayKeysSorted = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));

  const highCount = filtered.filter((e) => e.impact === "high").length;
  const medCount = filtered.filter((e) => e.impact === "medium").length;
  const currencyCount = new Set(filtered.map((e) => e.currency)).size;

  return (
    <Card className="tj-panel">
      <div className="tj-news-head">
        <div><span className="tj-bold">📅 Economic Calendar</span><div className="tj-muted-txt" style={{ fontSize: 11 }}>Sample events · times shown in your timezone</div></div>
        <div className="tj-news-head-right">
          <span className="tj-pill" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}>SAMPLE DATA</span>
          <span className="tj-tz-pill">🌐 {tz} {gmtLabel}</span>
        </div>
      </div>

      <div className="tj-news-tabs">
        <button className={`tj-newstab ${tab === "calendar" ? "tj-newstab-active" : ""}`} onClick={() => setTab("calendar")}>📅 Calendar</button>
        <button className={`tj-newstab ${tab === "holidays" ? "tj-newstab-active" : ""}`} onClick={() => setTab("holidays")}>🏦 Bank Holidays</button>
        <button className={`tj-newstab ${tab === "impact" ? "tj-newstab-active" : ""}`} onClick={() => setTab("impact")}>📊 Impact Analysis</button>
        <div className="tj-news-weeknav">
          <button className="tj-icon-btn" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft size={16} /></button>
          <button className={`tj-chip ${weekOffset === 0 ? "tj-chip-active" : ""}`} onClick={() => setWeekOffset(0)}>This Week</button>
          <button className="tj-icon-btn" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight size={16} /></button>
          <span className="tj-muted-txt" style={{ fontSize: 12 }}>{fmtShortDate(sunday)} – {fmtShortDate(saturday)}</span>
        </div>
      </div>

      {tab === "calendar" && (
        <>
          <div className="tj-news-filters">
            <span className="tj-mlabel">IMPACT:</span>
            {["high", "medium", "low"].map((lvl) => (
              <button key={lvl} className={`tj-impact-chip tj-impact-${lvl} ${impact[lvl] ? "tj-impact-on" : ""}`}
                onClick={() => setImpact((i) => ({ ...i, [lvl]: !i[lvl] }))}>{lvl[0].toUpperCase() + lvl.slice(1)}</button>
            ))}
            <span className="tj-mlabel" style={{ marginLeft: 14 }}>CURRENCY:</span>
            {currencies.map((c) => (
              <button key={c} className={`tj-chip ${currency === c ? "tj-chip-active" : ""}`} onClick={() => setCurrency(c)}>{c}</button>
            ))}
          </div>

          <div className="tj-news-infobar">
            <span>⚡ All times shown in: <span className="tj-purple-txt">{tz} {gmtLabel}</span></span>
            <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" className="tj-openff">Open FF ↗</a>
          </div>

          <div className="tj-news-stats">
            <div><div className="tj-mnum">{filtered.length}</div><div className="tj-mlabel">EVENTS THIS WEEK</div></div>
            <div><div className="tj-mnum tj-red">{highCount}</div><div className="tj-mlabel">HIGH IMPACT 🔴</div></div>
            <div><div className="tj-mnum" style={{ color: "#FBBF24" }}>{medCount}</div><div className="tj-mlabel">MEDIUM IMPACT 🟠</div></div>
            <div><div className="tj-mnum tj-purple-txt">{currencyCount}</div><div className="tj-mlabel">CURRENCIES</div></div>
          </div>

          {dayKeysSorted.length === 0 ? (
            <div className="tj-empty-block">
              <div style={{ fontSize: 32 }}>📅</div>
              <div className="tj-empty-title">No events match your filters this week</div>
              <div className="tj-empty-sub">Try adjusting the impact filter or switching weeks</div>
            </div>
          ) : (
            dayKeysSorted.map((key) => (
              <div key={key} className="tj-news-day-block">
                <div className="tj-news-day-label">{DOW_SHORT[new Date(key).getDay()]} · {fmtShortDate(new Date(key))}</div>
                <div className="tj-table-wrap">
                  <table className="tj-simple-table">
                    <thead><tr><th>Time</th><th>Cur</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th></tr></thead>
                    <tbody>
                      {byDay[key].map((e, i) => (
                        <tr key={i}>
                          <td className="tj-mono">{e.time}</td>
                          <td className="tj-bold">{e.currency}</td>
                          <td><span className={`tj-impact-dot tj-impact-dot-${e.impact}`} /></td>
                          <td>{e.title}</td>
                          <td className="tj-mono">{e.actual}</td>
                          <td className="tj-mono tj-muted-txt">{e.forecast}</td>
                          <td className="tj-mono tj-muted-txt">{e.previous}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "holidays" && (
        <div className="tj-holiday-list">
          {MOCK_HOLIDAYS.map((h, i) => (
            <div key={i} className="tj-holiday-row">
              <span className="tj-mono tj-purple-txt" style={{ width: 60 }}>{h.date}</span>
              <span className="tj-sesspill">{h.country}</span>
              <span>{h.name}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "impact" && (
        <div>
          <div className="tj-mlabel" style={{ marginBottom: 8 }}>EVENTS BY IMPACT (SAMPLE WEEK)</div>
          {["high", "medium", "low"].map((lvl) => {
            const count = MOCK_EVENTS.filter((e) => e.impact === lvl).length;
            const pct = (count / MOCK_EVENTS.length) * 100;
            const color = lvl === "high" ? "#F87171" : lvl === "medium" ? "#FBBF24" : "#34D399";
            return (
              <div key={lvl} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{lvl[0].toUpperCase() + lvl.slice(1)} impact</span><span className="tj-bold">{count}</span>
                </div>
                <div className="tj-bar-track"><div className="tj-bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ================================== RULES ================================ */

function RulesPage({ account, onUpdateAccount }) {
  const [tab, setTab] = useState("today");
  const [newRule, setNewRule] = useState("");
  const today = todayISO();
  const todayChecks = account.checkins[today] || {};
  const toggleRule = (id) => onUpdateAccount({ ...account, checkins: { ...account.checkins, [today]: { ...todayChecks, [id]: !todayChecks[id] } } });
  const addRule = () => { if (!newRule.trim()) return; onUpdateAccount({ ...account, rules: [...account.rules, { id: uid(), text: newRule.trim(), active: true }] }); setNewRule(""); };
  const removeRule = (id) => onUpdateAccount({ ...account, rules: account.rules.filter((r) => r.id !== id) });
  const activeRules = account.rules.filter((r) => r.active);
  const historyDates = Object.keys(account.checkins).sort().reverse().slice(0, 14);

  return (
    <Card className="tj-panel">
      <div className="tj-rules-head">
        <div><div className="tj-bold" style={{ fontSize: 16 }}>Trading Rules</div><div className="tj-muted-txt" style={{ fontSize: 11 }}>{account.rules.length} rules · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div></div>
        <div className="tj-tabs">
          <button className={`tj-tab ${tab === "today" ? "tj-tab-active" : ""}`} onClick={() => setTab("today")}>📋 Today</button>
          <button className={`tj-tab ${tab === "history" ? "tj-tab-active" : ""}`} onClick={() => setTab("history")}>📅 History</button>
          <button className={`tj-tab ${tab === "manage" ? "tj-tab-active" : ""}`} onClick={() => setTab("manage")}>⚙ Manage</button>
        </div>
      </div>
      {tab === "today" && (activeRules.length === 0 ? (
        <div className="tj-empty-block">
          <ShieldCheck size={32} color="var(--tj-muted)" />
          <div className="tj-empty-title">No rules yet</div>
          <div className="tj-empty-sub">Add your trading rules first, then use this page for your daily check-in.</div>
          <button className="tj-btn-primary" onClick={() => setTab("manage")}><Plus size={14} /> Add Rules</button>
        </div>
      ) : (
        <div className="tj-rule-list">
          {activeRules.map((r) => (
            <label key={r.id} className="tj-rule-row"><input type="checkbox" checked={!!todayChecks[r.id]} onChange={() => toggleRule(r.id)} /><span className={todayChecks[r.id] ? "tj-rule-done" : ""}>{r.text}</span></label>
          ))}
        </div>
      ))}
      {tab === "history" && (historyDates.length === 0 ? <div className="tj-empty">No check-in history yet.</div> : (
        <div className="tj-history-list">
          {historyDates.map((d) => {
            const checks = account.checkins[d]; const done = Object.values(checks).filter(Boolean).length; const total = account.rules.length || 1;
            return (
              <div key={d} className="tj-history-row"><span>{d}</span><div className="tj-bar-track" style={{ flex: 1, margin: "0 10px" }}><div className="tj-bar-fill tj-bar-green" style={{ width: `${(done / total) * 100}%` }} /></div><span className="tj-mono">{done}/{total}</span></div>
            );
          })}
        </div>
      ))}
      {tab === "manage" && (
        <div>
          <div className="tj-inline-add">
            <input className="tj-input" placeholder="New rule..." value={newRule} onChange={(e) => setNewRule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRule()} />
            <button className="tj-btn-outline" onClick={addRule}>Add</button>
          </div>
          <div className="tj-rule-list" style={{ marginTop: 12 }}>
            {account.rules.map((r) => <div key={r.id} className="tj-rule-row"><span>{r.text}</span><button className="tj-icon-btn" onClick={() => removeRule(r.id)}><Trash2 size={14} /></button></div>)}
          </div>
        </div>
      )}
    </Card>
  );
}

/* =============================== MAIN APP ============================== */

function TradingJournalApp({ user, onLogout }) {
  const STORAGE_KEY = storageKeyFor(user.email);
  const [accounts, setAccounts] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [typeTags, setTypeTags] = useState(DEFAULT_TYPE_TAGS);
  const [mistakeTags] = useState(DEFAULT_MISTAKE_TAGS);
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window === "undefined" ? true : window.innerWidth > 900));

  useEffect(() => {
    (async () => {
      const timeout = new Promise((resolve) => setTimeout(() => resolve("__timeout__"), 4000));
      try {
        const res = await Promise.race([storage.get(STORAGE_KEY), timeout]);
        if (res && res !== "__timeout__" && res.value) {
          const parsed = JSON.parse(res.value);
          setAccounts(parsed.accounts); setActiveId(parsed.activeId); setTypeTags(parsed.typeTags || DEFAULT_TYPE_TAGS);
        } else { const acc = defaultAccounts(); setAccounts(acc); setActiveId(acc[0].id); }
      } catch (e) { const acc = defaultAccounts(); setAccounts(acc); setActiveId(acc[0].id); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !accounts) return;
    (async () => { try { await storage.set(STORAGE_KEY, JSON.stringify({ accounts, activeId, typeTags })); } catch (e) {} })();
  }, [accounts, activeId, typeTags, loaded]);

  const account = useMemo(() => accounts?.find((a) => a.id === activeId), [accounts, activeId]);
  const stats = useMemo(() => (account ? computeStats(account.trades, account.breakevenCap) : null), [account]);
  const updateAccount = useCallback((updated) => setAccounts((accs) => accs.map((a) => (a.id === updated.id ? updated : a))), []);

  if (!loaded || !account || !stats) {
    return (<div className="tj-root tj-loading"><style>{CSS}</style><div className="tj-spinner" /><div>Loading journal…</div></div>);
  }

  const saveTrade = (trade) => {
    const exists = account.trades.some((t) => t.id === trade.id);
    const trades = exists ? account.trades.map((t) => (t.id === trade.id ? trade : t)) : [...account.trades, trade];
    updateAccount({ ...account, trades }); setModal(null); setEditingTrade(null);
  };
  const deleteTrade = (id) => updateAccount({ ...account, trades: account.trades.filter((t) => t.id !== id) });
  const addTypeTag = (tag) => setTypeTags((tags) => (tags.includes(tag) ? tags : [...tags, tag]));
  const netTotal = account.balance + stats.netPnl;
  const netPct = account.balance ? (stats.netPnl / account.balance) * 100 : 0;

  return (
    <div className="tj-root">
      <style>{CSS}</style>
      <div className={`tj-sidebar ${sidebarOpen ? "tj-sidebar-shown" : "tj-sidebar-collapsed"}`}>
        <div className="tj-sidebar-scroll">
          <div className="tj-logo"><span>AAICOREFX</span></div>
          <div className="tj-nav-label">NAVIGATION</div>
          <div className="tj-nav">{NAV.map((n) => <button key={n.id} className={`tj-nav-item ${page === n.id ? "tj-nav-active" : ""}`} onClick={() => { setPage(n.id); if (window.innerWidth <= 900) setSidebarOpen(false); }}><n.icon size={16} /> <span>{n.label}</span></button>)}</div>
          <div className="tj-nav-label">SETTINGS</div>
          <div className="tj-nav">
            <button className="tj-nav-item" onClick={() => setModal("editaccount")}><Settings size={16} /> <span>Settings &amp; Account</span></button>
            <button className="tj-nav-item" onClick={() => { if (window.confirm("Reset all journal data for this account? This can't be undone.")) setAccounts(defaultAccounts()); }}><Trash2 size={16} /> <span>Reset Data</span></button>
            <button className="tj-nav-item tj-nav-danger" onClick={onLogout}><LogOut size={16} /> <span>Log Out</span></button>
          </div>
          <div className="tj-logged-in-as">Logged in as <span className="tj-bold">{user.name}</span></div>
        </div>
        <div className="tj-sidebar-footer">
          {showAccountMenu && (
            <div className="tj-account-menu">
              <div className="tj-account-menu-head">
                <div className="tj-avatar">{account.icon}</div>
                <div><div className="tj-account-name">{account.name}</div><div className="tj-account-sub">${account.balance.toLocaleString()} <span className="tj-green">({netPct >= 0 ? "+" : ""}{netPct.toFixed(2)}%)</span></div></div>
              </div>
              <div className="tj-account-balance-row">
                <div><div className="tj-mono tj-bold">${netTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="tj-mlabel">BALANCE</div></div>
                <div><div className={`tj-mono tj-bold ${stats.netPnl >= 0 ? "tj-green" : "tj-red"}`}>{fmtMoneyShort(stats.netPnl)}</div><div className="tj-mlabel">P&amp;L</div></div>
              </div>
              <div className="tj-nav-label" style={{ marginTop: 10 }}>ACCOUNTS</div>
              {accounts.map((a) => (
                <button key={a.id} className={`tj-account-row ${a.id === activeId ? "tj-account-row-active" : ""}`} onClick={() => { setActiveId(a.id); setShowAccountMenu(false); }}>
                  <span className="tj-avatar-sm">{a.icon}</span><span className="tj-account-row-name">{a.name}{a.id === activeId && <span className="tj-active-tag">• Active</span>}</span>
                </button>
              ))}
              <button className="tj-account-row tj-add-account" onClick={() => { setModal("addaccount"); setShowAccountMenu(false); }}><Plus size={14} /> Add Account</button>
            </div>
          )}
          <button className="tj-sidebar-user" onClick={() => setShowAccountMenu((v) => !v)}>
            <div className="tj-avatar">{account.icon}</div>
            <div style={{ textAlign: "left" }}><div className="tj-account-name">{account.name.length > 14 ? account.name.slice(0, 14) + "…" : account.name}</div><div className="tj-account-sub">${account.balance.toLocaleString()} ({netPct >= 0 ? "+" : ""}{netPct.toFixed(2)}%)</div></div>
          </button>
        </div>
      </div>
      {sidebarOpen && <div className="tj-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className="tj-main">
        <div className="tj-topbar">
          <div className="tj-topbar-left">
            <button className="tj-icon-btn" onClick={() => setSidebarOpen((v) => !v)}><Menu size={18} /></button>
            <div><div className="tj-page-title">{NAV.find((n) => n.id === page)?.label || "Settings"}</div><div className="tj-page-sub">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div></div>
          </div>
          <div className="tj-topbar-account">{account.name}</div>
          <button className="tj-btn-primary" onClick={() => { setEditingTrade(null); setModal("newtrade"); }}><Plus size={16} /> New Trade</button>
        </div>
        <div className="tj-content">
          {page === "dashboard" && <DashboardPage account={account} stats={stats} monthCursor={monthCursor} setMonthCursor={setMonthCursor} />}
          {page === "tradelog" && <TradeLogPage account={account} onNewTrade={() => { setEditingTrade(null); setModal("newtrade"); }} onEdit={(t) => { setEditingTrade(t); setModal("newtrade"); }} onDelete={deleteTrade} />}
          {page === "analytics" && <AnalyticsPage account={account} />}
          {page === "calendar" && <CalendarPage account={account} monthCursor={monthCursor} setMonthCursor={setMonthCursor} />}
          {page === "psychology" && <PsychologyPage account={account} />}
          {page === "insights" && <InsightsPage account={account} />}
          {page === "news" && <NewsPage />}
          {page === "rules" && <RulesPage account={account} onUpdateAccount={updateAccount} />}
        </div>
      </div>
      {modal === "newtrade" && <NewTradeModal editing={editingTrade} typeTags={typeTags} mistakeTags={mistakeTags} onAddTypeTag={addTypeTag} onClose={() => { setModal(null); setEditingTrade(null); }} onSave={saveTrade} />}
      {modal === "editaccount" && <AccountSettingsModal account={account} onClose={() => setModal(null)} onSave={(u) => { updateAccount(u); setModal(null); }} />}
      {modal === "addaccount" && <AddAccountModal onClose={() => setModal(null)} onCreate={(a) => { setAccounts((accs) => [...accs, a]); setActiveId(a.id); setModal(null); }} />}
    </div>
  );
}

/* ================================== CSS ================================= */

const CSS = `
:root {
  --tj-bg: #0A0B0D; --tj-panel: #131519; --tj-panel-alt: #1B1E24; --tj-border: #262A31;
  --tj-text: #F4F5F7; --tj-muted: #8B8F98; --tj-green: #34D399; --tj-red: #F87171;
  --tj-purple: #8B7CF6; --tj-blue: #60A5FA; --tj-amber: #FBBF24;
}
.tj-root { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--tj-bg); color: var(--tj-text); display: flex; height: 100vh; width: 100%; font-size: 14px; overflow: hidden; }
.tj-loading { align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--tj-muted); }
.tj-spinner { width: 28px; height: 28px; border: 3px solid var(--tj-border); border-top-color: var(--tj-purple); border-radius: 50%; animation: tj-spin 0.8s linear infinite; }
@keyframes tj-spin { to { transform: rotate(360deg); } }
.tj-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.tj-bold { font-weight: 700; }
.tj-green { color: var(--tj-green); } .tj-red { color: var(--tj-red); } .tj-blue { color: var(--tj-blue); }
.tj-muted-txt { color: var(--tj-muted); } .tj-purple-txt { color: var(--tj-purple); }

.tj-sidebar { width: 220px; min-width: 220px; height: 100vh; background: var(--tj-panel); border-right: 1px solid var(--tj-border); display: flex; flex-direction: column; padding: 18px 14px; position: relative; flex-shrink: 0; transition: transform 0.25s, width 0.2s, min-width 0.2s; }
.tj-sidebar-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.tj-sidebar-collapsed { width: 0; min-width: 0; padding: 0; overflow: hidden; border: none; }
.tj-backdrop { display: none; }
.tj-logo { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; letter-spacing: 2px; border: 1px solid var(--tj-border); border-radius: 8px; padding: 10px 12px; text-align: center; margin-bottom: 22px; }
.tj-nav-label { font-size: 10px; letter-spacing: 1.2px; color: var(--tj-muted); margin: 14px 4px 8px; font-weight: 600; }
.tj-nav { display: flex; flex-direction: column; gap: 2px; }
.tj-nav-item { display: flex; align-items: center; gap: 10px; background: none; border: none; color: var(--tj-muted); padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 13.5px; text-align: left; font-family: inherit; }
.tj-nav-item:hover { background: var(--tj-panel-alt); color: var(--tj-text); }
.tj-nav-active { background: rgba(52,211,153,0.12); color: var(--tj-green) !important; font-weight: 600; }
.tj-nav-danger:hover { color: var(--tj-red) !important; }
.tj-logged-in-as { font-size: 10.5px; color: var(--tj-muted); text-align: center; margin-top: 8px; padding: 0 4px; }
.tj-sidebar-footer { position: relative; flex-shrink: 0; padding-top: 10px; }
.tj-sidebar-user { display: flex; align-items: center; gap: 10px; width: 100%; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 10px; padding: 8px 10px; cursor: pointer; font-family: inherit; color: var(--tj-text); }
.tj-avatar { width: 32px; height: 32px; border-radius: 50%; background: #22262E; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.tj-avatar-sm { width: 22px; height: 22px; border-radius: 50%; background: #22262E; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.tj-account-name { font-size: 13px; font-weight: 600; } .tj-account-sub { font-size: 11px; color: var(--tj-muted); }
.tj-account-menu { position: absolute; bottom: 58px; left: 0; width: 260px; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 12px; padding: 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.5); z-index: 30; }
.tj-account-menu-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.tj-account-balance-row { display: flex; gap: 16px; background: var(--tj-panel); border: 1px solid var(--tj-border); border-radius: 8px; padding: 8px 10px; }
.tj-account-row { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; color: var(--tj-text); padding: 8px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 13px; text-align: left; margin-top: 2px; }
.tj-account-row:hover { background: var(--tj-panel); }
.tj-account-row-active { background: rgba(139,124,246,0.15); }
.tj-account-row-name { display: flex; flex-direction: column; } .tj-active-tag { font-size: 10px; color: var(--tj-green); } .tj-add-account { color: var(--tj-purple); }

.tj-main { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden; }
.tj-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--tj-border); gap: 12px; }
.tj-topbar-left { display: flex; align-items: center; gap: 10px; }
.tj-page-title { font-weight: 700; font-size: 16px; } .tj-page-sub { font-size: 11px; color: var(--tj-muted); }
.tj-topbar-account { color: var(--tj-purple); font-weight: 600; flex: 1; text-align: center; }
.tj-content { padding: 20px 24px; overflow-y: auto; flex: 1; min-height: 0; }
.tj-topbar { flex-shrink: 0; }

.tj-btn-primary { background: var(--tj-green); color: #052E1B; border: none; border-radius: 8px; padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; white-space: nowrap; }
.tj-btn-primary:hover { filter: brightness(1.08); }
.tj-btn-outline { background: none; border: 1px solid var(--tj-border); color: var(--tj-text); border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; font-family: inherit; }
.tj-btn-outline:hover { background: var(--tj-panel-alt); }
.tj-icon-btn { background: none; border: none; color: var(--tj-muted); cursor: pointer; padding: 4px; border-radius: 6px; display: inline-flex; }
.tj-icon-btn:hover { background: var(--tj-panel-alt); color: var(--tj-text); }
.tj-fab { position: sticky; bottom: 16px; margin: 16px auto 0; display: flex; background: var(--tj-green); color: #052E1B; border: none; border-radius: 24px; padding: 10px 18px; font-weight: 700; cursor: pointer; align-items: center; gap: 6px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); }

.tj-card { background: var(--tj-panel); border: 1px solid var(--tj-border); border-radius: 12px; }
.tj-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 16px; }
.tj-stat { padding: 14px 16px; }
.tj-stat-label { font-size: 10.5px; letter-spacing: 0.5px; color: var(--tj-muted); font-weight: 600; margin-bottom: 6px; }
.tj-stat-row { display: flex; align-items: center; justify-content: space-between; }
.tj-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; }
.tj-stat-sub { font-size: 11px; color: var(--tj-muted); margin-top: 4px; }
.tj-stat-sub-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; }
.tj-badge-dot { display: flex; gap: 6px; margin-top: 6px; }
.tj-dot { font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 700; }
.tj-dot-green { background: rgba(52,211,153,0.15); color: var(--tj-green); }
.tj-dot-red { background: rgba(248,113,113,0.15); color: var(--tj-red); }
.tj-dot-blue { background: rgba(96,165,250,0.15); color: var(--tj-blue); }
i.tj-dot-green, i.tj-dot-red, i.tj-dot-blue, i.tj-dot-amber { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
i.tj-dot-green { background: var(--tj-green); } i.tj-dot-red { background: var(--tj-red); } i.tj-dot-blue { background: var(--tj-blue); } i.tj-dot-amber { background: var(--tj-amber); }
.tj-winloss-bar { height: 6px; border-radius: 6px; overflow: hidden; background: var(--tj-red); margin-top: 8px; }
.tj-winloss-fill { height: 100%; background: var(--tj-green); }

.tj-row3 { display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 14px; margin-bottom: 16px; }
.tj-row2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.tj-panel { padding: 16px; }
.tj-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-weight: 600; font-size: 13px; }
.tj-thunder { color: var(--tj-purple); font-size: 12px; letter-spacing: 0.5px; }
.tj-pill { font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 700; }
.tj-pill-green { background: rgba(52,211,153,0.15); color: var(--tj-green); }
.tj-pill-red { background: rgba(248,113,113,0.15); color: var(--tj-red); }
.tj-pill-neutral { background: var(--tj-panel-alt); color: var(--tj-muted); }

.tj-avgrr-label { text-align: center; font-size: 10px; color: var(--tj-muted); margin-top: 4px; }
.tj-gauge-track { height: 8px; border-radius: 6px; background: linear-gradient(90deg, #F87171, #FBBF24, #34D399); position: relative; margin-top: 4px; }
.tj-gauge-knob { position: absolute; top: -3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid #0A0B0D; transform: translateX(-50%); }
.tj-gauge-scale { display: flex; justify-content: space-between; font-size: 9px; color: var(--tj-muted); margin-top: 3px; }
.tj-edge-num { font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 800; text-align: center; margin-top: 8px; color: var(--tj-purple); }
.tj-edge-label { text-align: center; font-size: 10px; letter-spacing: 1px; color: var(--tj-muted); margin-top: -4px; }

.tj-bar-track { height: 6px; border-radius: 6px; background: var(--tj-border); overflow: hidden; }
.tj-bar-fill { height: 100%; } .tj-bar-green { background: var(--tj-green); } .tj-bar-red { background: var(--tj-red); }

.tj-month-nav { display: flex; gap: 2px; }
.tj-month-summary { display: flex; justify-content: space-around; text-align: center; padding: 10px 0 16px; border-bottom: 1px solid var(--tj-border); margin-bottom: 10px; }
.tj-mnum { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; }
.tj-mlabel { font-size: 10px; color: var(--tj-muted); letter-spacing: 0.5px; }
.tj-cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: var(--tj-muted); margin-bottom: 4px; }
.tj-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.tj-cal-cell { aspect-ratio: 1.1; background: var(--tj-panel-alt); border-radius: 8px; padding: 6px; border: 1px solid transparent; }
.tj-cal-empty { background: none; }
.tj-cal-win { background: rgba(52,211,153,0.10); border-color: rgba(52,211,153,0.4); }
.tj-cal-loss { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.4); }
.tj-cal-be { background: rgba(96,165,250,0.10); border-color: rgba(96,165,250,0.4); }
.tj-cal-today { box-shadow: 0 0 0 1px var(--tj-purple) inset; }
.tj-cal-day { font-size: 11px; color: var(--tj-muted); margin-bottom: 2px; }
.tj-cal-pnl { font-size: 12px; font-weight: 600; }
.tj-cal-dots { display: flex; gap: 2px; margin-top: 3px; }
.tj-mini-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
.tj-mini-dot.tj-dot-win { background: var(--tj-green); } .tj-mini-dot.tj-dot-loss { background: var(--tj-red); } .tj-mini-dot.tj-dot-be { background: var(--tj-blue); }

.tj-weekly-list { display: flex; flex-direction: column; gap: 14px; }
.tj-weekly-item-label { font-size: 10.5px; color: var(--tj-muted); letter-spacing: 0.5px; }
.tj-weekly-item-num { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; margin-top: 2px; }
.tj-weekly-item-sub { font-size: 11px; color: var(--tj-muted); margin-bottom: 4px; }

.tj-empty { color: var(--tj-muted); font-size: 13px; padding: 30px 0; text-align: center; }
.tj-empty-block { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 0; }
.tj-empty-title { font-weight: 700; font-size: 15px; }
.tj-empty-sub { font-size: 12px; color: var(--tj-muted); text-align: center; max-width: 320px; margin-bottom: 6px; }

/* trade log */
.tj-tradelog-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tj-search { display: flex; align-items: center; gap: 6px; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 8px; padding: 8px 10px; flex: 1; min-width: 160px; }
.tj-search-input { background: none; border: none; outline: none; color: var(--tj-text); font-size: 13px; width: 100%; }
.tj-select-sm { width: auto; min-width: 90px; }
.tj-sortbtn { background: var(--tj-green); color: #052E1B; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.tj-sortbtn-outline { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-text); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; cursor: pointer; }
.tj-sortbtn-active.tj-sortbtn-outline { border-color: var(--tj-purple); color: var(--tj-purple); }
.tj-tradelog-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.tj-mini-stat { padding: 12px 14px; }
.tj-mnum-sm { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; margin-top: 2px; }
.tj-tlog-list { display: flex; flex-direction: column; gap: 10px; }
.tj-tlog-card { padding: 0; overflow: hidden; border-left-width: 3px; }
.tj-tlog-win { border-left: 3px solid var(--tj-green); } .tj-tlog-loss { border-left: 3px solid var(--tj-red); } .tj-tlog-be { border-left: 3px solid var(--tj-blue); }
.tj-tlog-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; flex-wrap: wrap; }
.tj-tlog-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.tj-tlog-main { min-width: 90px; } .tj-tlog-asset { font-weight: 700; font-size: 14px; }
.tj-tlog-pills { display: flex; gap: 4px; margin-top: 3px; }
.tj-dirpill-sm { font-size: 10px; font-weight: 700; background: var(--tj-panel-alt); border-radius: 4px; padding: 1px 5px; }
.tj-sesspill { font-size: 10px; color: var(--tj-muted); background: var(--tj-panel-alt); border-radius: 4px; padding: 1px 5px; }
.tj-tlog-date { font-size: 12px; color: var(--tj-muted); min-width: 70px; }
.tj-tlog-pnl-block { min-width: 80px; }
.tj-tlog-pnl { font-weight: 700; font-size: 14px; }
.tj-tlog-rr { font-size: 10px; color: var(--tj-muted); }
.tj-tlog-types, .tj-tlog-stars { min-width: 60px; }
.tj-statuspill { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; }
.tj-statuspill-win { background: rgba(52,211,153,0.15); color: var(--tj-green); }
.tj-statuspill-loss { background: rgba(248,113,113,0.15); color: var(--tj-red); }
.tj-statuspill-be { background: rgba(96,165,250,0.15); color: var(--tj-blue); }
.tj-tlog-actions { display: flex; gap: 6px; }
.tj-btn-edit, .tj-btn-del { border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
.tj-btn-edit { background: var(--tj-panel-alt); color: var(--tj-text); border: 1px solid var(--tj-border); }
.tj-btn-del { background: rgba(248,113,113,0.15); color: var(--tj-red); }
.tj-tlog-expand { padding: 14px; border-top: 1px solid var(--tj-border); background: var(--tj-panel-alt); }
.tj-tlog-detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tj-tlog-mistakes, .tj-tlog-shots { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.tj-tlog-shots img { width: 90px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--tj-border); }
.tj-tlog-context { margin-top: 10px; font-style: italic; color: var(--tj-muted); font-size: 12.5px; }

/* modals & forms */
.tj-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
.tj-modal { background: var(--tj-panel); border: 1px solid var(--tj-border); border-radius: 14px; width: 440px; max-width: 100%; max-height: 88vh; overflow-y: auto; }
.tj-modal-wide { width: 620px; }
.tj-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--tj-border); position: sticky; top: 0; background: var(--tj-panel); z-index: 2;}
.tj-modal-title { font-weight: 700; font-size: 15px; }
.tj-modal-body { padding: 16px 18px; }
.tj-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.tj-field { margin-bottom: 12px; }
.tj-field-label { font-size: 10.5px; letter-spacing: 0.5px; color: var(--tj-muted); font-weight: 700; margin-bottom: 6px; }
.tj-section-label { font-size: 11px; letter-spacing: 0.5px; color: var(--tj-green); font-weight: 700; margin: 16px 0 8px; text-transform: uppercase; }
.tj-input { width: 100%; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-text); border-radius: 8px; padding: 9px 10px; font-size: 13px; font-family: inherit; box-sizing: border-box; }
.tj-textarea { min-height: 70px; resize: vertical; }
.tj-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tj-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.tj-inline-add { display: flex; gap: 8px; margin-top: 8px; }
.tj-chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.tj-chip { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-muted); border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.tj-chip-active { border-color: var(--tj-purple); color: var(--tj-purple); background: rgba(139,124,246,0.12); }
.tj-chip-big { flex: 1; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-muted); border-radius: 8px; padding: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.tj-tagwrap { display: flex; flex-wrap: wrap; gap: 6px; }
.tj-tag { border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; border: 1px solid var(--tj-border); background: var(--tj-panel-alt); color: var(--tj-muted); }
.tj-tag-purple.tj-tag-active { background: rgba(139,124,246,0.18); border-color: var(--tj-purple); color: var(--tj-purple); }
.tj-tag-red.tj-tag-active { background: rgba(248,113,113,0.15); border-color: var(--tj-red); color: var(--tj-red); }
.tj-tag-xs { font-size: 10px !important; padding: 2px 6px !important; margin: 1px; }
.tj-stars { display: flex; align-items: center; gap: 4px; } .tj-stars-label { color: var(--tj-muted); font-size: 12px; margin-left: 8px; }

.tj-dropzone { border: 1.5px dashed var(--tj-border); border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; background: var(--tj-panel-alt); }
.tj-dropzone-active { border-color: var(--tj-purple); background: rgba(139,124,246,0.08); }
.tj-dropzone-text { font-size: 12px; color: var(--tj-muted); }
.tj-dropzone-warn { font-size: 10.5px; color: var(--tj-amber); margin-top: 6px; }
.tj-shot-grid { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
.tj-shot-thumb { position: relative; width: 72px; height: 52px; border-radius: 6px; overflow: hidden; border: 1px solid var(--tj-border); }
.tj-shot-thumb img { width: 100%; height: 100%; object-fit: cover; }
.tj-shot-remove { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); border: none; color: #fff; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.tj-shot-add { width: 72px; height: 52px; border-radius: 6px; border: 1px dashed var(--tj-border); display: flex; align-items: center; justify-content: center; }

/* calendar heatmap */
.tj-heatmap { display: flex; gap: 3px; overflow-x: auto; padding: 6px 0; }
.tj-heat-col { display: flex; flex-direction: column; gap: 3px; }
.tj-heat-cell { width: 11px; height: 11px; border-radius: 3px; }
.tj-heat-sub { font-size: 11px; color: var(--tj-muted); margin-bottom: 6px; }
.tj-heat-months { display: flex; gap: 3px; margin-bottom: 2px; }
.tj-heat-month-label { width: 11px; font-size: 9px; color: var(--tj-muted); }
.tj-heat-legend { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--tj-muted); margin-top: 8px; flex-wrap: wrap; }

/* psychology */
.tj-mood-list { display: flex; flex-direction: column; gap: 12px; }
.tj-mood-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
.tj-mistake-list { display: flex; flex-direction: column; gap: 8px; }
.tj-mistake-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }

/* insights */
.tj-insight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tj-insight-card { background: rgba(52,211,153,0.07); border: 1px solid rgba(52,211,153,0.25); border-radius: 10px; padding: 14px; }
.tj-insight-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--tj-green); margin-bottom: 6px; font-size: 13.5px; }

/* analytics */
.tj-perf-list { display: flex; flex-direction: column; gap: 10px; }
.tj-perf-list > div { display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 8px; border-bottom: 1px solid var(--tj-border); }
.tj-simple-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tj-table-wrap { overflow-x: auto; }
.tj-simple-table th { text-align: left; color: var(--tj-muted); font-weight: 600; padding: 6px 8px; font-size: 10.5px; letter-spacing: 0.3px; border-bottom: 1px solid var(--tj-border); }
.tj-simple-table td { padding: 7px 8px; border-bottom: 1px solid var(--tj-border); }
.tj-scatter-legend { font-size: 11px; color: var(--tj-muted); display: flex; align-items: center; gap: 4px; }
.tj-scatter-box { position: relative; height: 300px; border: 1px solid var(--tj-border); border-radius: 10px; margin-top: 8px; }
.tj-scatter-quad { position: absolute; font-size: 9px; color: var(--tj-muted); padding: 8px; letter-spacing: 0.3px; }
.tj-scatter-tl { top: 0; left: 0; } .tj-scatter-tr { top: 0; right: 0; text-align: right; }
.tj-scatter-bl { bottom: 0; left: 0; } .tj-scatter-br { bottom: 0; right: 0; text-align: right; }
.tj-scatter-axis-y-top { position: absolute; top: 46%; left: 4px; font-size: 9px; color: var(--tj-muted); }
.tj-scatter-axis-y-bot { position: absolute; bottom: 4px; left: 4px; font-size: 9px; color: var(--tj-muted); }
.tj-scatter-axis-x-left { position: absolute; bottom: -18px; left: 4px; font-size: 9px; color: var(--tj-muted); }
.tj-scatter-axis-x-mid { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; color: var(--tj-muted); }
.tj-scatter-axis-x-right { position: absolute; bottom: -18px; right: 4px; font-size: 9px; color: var(--tj-muted); }
.tj-scatter-dot { position: absolute; border: 2px solid; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; transform: translate(-50%, -50%); background: rgba(0,0,0,0.4); text-align: center; padding: 2px; }
.tj-setup-tags { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.tj-setup-card { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 10px; padding: 12px; }
.tj-setup-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.tj-grade-badge { background: rgba(139,124,246,0.18); color: var(--tj-purple); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.tj-grade-bad { background: rgba(248,113,113,0.15); color: var(--tj-red); }
.tj-setup-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px; }
.tj-setup-bw { display: flex; gap: 8px; margin-bottom: 6px; }
.tj-setup-bw-box { flex: 1; border-radius: 8px; padding: 6px 8px; }
.tj-setup-bw-best { background: rgba(52,211,153,0.1); } .tj-setup-bw-worst { background: rgba(248,113,113,0.1); }
.tj-session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.tj-session-card { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 10px; padding: 12px; text-align: center; }
.tj-session-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 11px; }
.tj-sesspill-lg { background: rgba(139,124,246,0.15); color: var(--tj-purple); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.tj-session-pnl { font-size: 18px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }
.tj-session-wl { display: flex; justify-content: center; gap: 10px; font-size: 11px; margin: 4px 0; font-weight: 700; }
.tj-day-score-row { display: flex; align-items: center; gap: 18px; }
.tj-day-score-circle { width: 84px; height: 84px; border-radius: 50%; border: 4px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.tj-day-score-num { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; line-height: 1; }
.tj-day-score-max { font-size: 10px; color: var(--tj-muted); }
.tj-day-score-label { font-size: 16px; font-weight: 700; }
.tj-day-legend { display: flex; gap: 12px; font-size: 11px; color: var(--tj-muted); margin-top: 6px; }
.tj-day-dist { display: flex; height: 8px; border-radius: 6px; overflow: hidden; margin-top: 6px; }
.tj-day-quad-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.tj-day-quad-stats > div { background: var(--tj-panel-alt); border-radius: 8px; padding: 10px; text-align: center; }
.tj-day-bestworst { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.tj-day-bw-box { border-radius: 8px; padding: 12px; }
.tj-day-bw-best { background: rgba(52,211,153,0.1); } .tj-day-bw-worst { background: rgba(248,113,113,0.1); }
.tj-last6-track { display: flex; gap: 3px; height: 34px; margin-top: 8px; align-items: stretch; }
.tj-last6-bar { border-radius: 4px; }
.tj-last6-dates { display: flex; justify-content: space-between; font-size: 9px; color: var(--tj-muted); margin-top: 4px; }
.tj-last6-legend { display: flex; gap: 14px; font-size: 11px; color: var(--tj-muted); margin-top: 8px; }
.tj-instrument-table td { vertical-align: middle; }
.tj-inline-bar { display: flex; align-items: center; gap: 8px; }
.tj-combo-result { margin-top: 12px; font-size: 13px; background: var(--tj-panel-alt); border-radius: 8px; padding: 10px; }

/* news */
.tj-news-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.tj-news-head-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tj-tz-pill { font-size: 11px; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-purple); padding: 3px 10px; border-radius: 20px; }
.tj-news-tabs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid var(--tj-border); padding-bottom: 12px; }
.tj-newstab { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); color: var(--tj-muted); border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600; }
.tj-newstab-active { background: rgba(248,113,113,0.12); color: var(--tj-red); border-color: rgba(248,113,113,0.4); }
.tj-news-weeknav { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.tj-news-infobar { display: flex; justify-content: space-between; align-items: center; background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 8px; padding: 8px 12px; font-size: 12px; margin-bottom: 12px; flex-wrap: wrap; gap: 6px; }
.tj-openff { color: var(--tj-green); text-decoration: none; font-weight: 700; font-size: 12px; }
.tj-openff:hover { text-decoration: underline; }
.tj-news-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.tj-news-stats > div { background: var(--tj-panel-alt); border: 1px solid var(--tj-border); border-radius: 8px; padding: 10px; text-align: center; }
.tj-holiday-list { display: flex; flex-direction: column; gap: 10px; }
.tj-holiday-row { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--tj-border); }
.tj-news-filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.tj-news-day-block { margin-bottom: 16px; }
.tj-news-day-label { font-weight: 700; font-size: 12.5px; color: var(--tj-purple); margin-bottom: 6px; }
.tj-impact-chip { border: 1px solid var(--tj-border); background: var(--tj-panel-alt); color: var(--tj-muted); border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
.tj-impact-high.tj-impact-on { background: rgba(248,113,113,0.15); color: var(--tj-red); border-color: var(--tj-red); }
.tj-impact-medium.tj-impact-on { background: rgba(251,191,36,0.15); color: var(--tj-amber); border-color: var(--tj-amber); }
.tj-impact-low.tj-impact-on { background: rgba(52,211,153,0.15); color: var(--tj-green); border-color: var(--tj-green); }
.tj-impact-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.tj-impact-dot-high { background: var(--tj-red); } .tj-impact-dot-medium { background: var(--tj-amber); } .tj-impact-dot-low { background: var(--tj-green); }

/* rules */
.tj-rules-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.tj-tabs { display: flex; gap: 4px; background: var(--tj-panel-alt); border-radius: 8px; padding: 3px; }
.tj-tab { background: none; border: none; color: var(--tj-muted); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
.tj-tab-active { background: var(--tj-panel); color: var(--tj-text); }
.tj-rule-list { display: flex; flex-direction: column; gap: 8px; }
.tj-rule-row { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--tj-panel-alt); border-radius: 8px; font-size: 13px; justify-content: space-between; }
.tj-rule-done { text-decoration: line-through; color: var(--tj-muted); }
.tj-history-list { display: flex; flex-direction: column; gap: 8px; }
.tj-history-row { display: flex; align-items: center; font-size: 12.5px; }

@media (max-width: 900px) {
  .tj-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .tj-row3 { grid-template-columns: 1fr; }
  .tj-row2 { grid-template-columns: 1fr; }
  .tj-tradelog-stats { grid-template-columns: repeat(2, 1fr); }
  .tj-sidebar { position: fixed; z-index: 50; top: 0; left: 0; box-shadow: 0 0 0 9999px transparent; }
  .tj-sidebar.tj-sidebar-collapsed { width: 220px; min-width: 220px; padding: 18px 14px; transform: translateX(-100%); border-right: 1px solid var(--tj-border); }
  .tj-sidebar.tj-sidebar-shown { transform: translateX(0); box-shadow: 20px 0 40px rgba(0,0,0,0.5); }
  .tj-backdrop { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 45; }
  .tj-topbar { padding: 12px 14px; flex-wrap: wrap; row-gap: 8px; }
  .tj-topbar-account { display: none; }
  .tj-content { padding: 14px; }
  .tj-day-score-row { flex-direction: column; align-items: flex-start; }
  .tj-day-quad-stats { grid-template-columns: repeat(2, 1fr); }
  .tj-day-bestworst { grid-template-columns: 1fr; }
  .tj-setup-tags { grid-template-columns: 1fr; }
  .tj-session-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .tj-stats-grid { grid-template-columns: 1fr 1fr; }
  .tj-tradelog-stats { grid-template-columns: 1fr; }
  .tj-tlog-row { gap: 8px; }
  .tj-modal-wide { width: 100%; }
}
`;

/* =============================== AUTH ROOT =============================== */
/* Gates the app behind login/sign-up. Each logged-in user gets their own
   journal data (see storageKeyFor above), stored client-side.            */

export default function AppRoot() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
    (async () => {
      let session = null;
      try { session = await Promise.race([getSession(storage), timeout]); }
      catch (e) { session = null; }
      if (!cancelled) setUser(session);
    })();
    return () => { cancelled = true; };
  }, []);

  if (user === undefined) {
    return (
      <div className="tj-root tj-loading">
        <style>{`.tj-root{font-family:'Inter',system-ui,sans-serif;background:#0A0B0D;color:#8B8F98;} .tj-spinner{width:28px;height:28px;border:3px solid #262A31;border-top-color:#8B7CF6;border-radius:50%;animation:tj-spin 0.8s linear infinite;} @keyframes tj-spin{to{transform:rotate(360deg);}}`}</style>
        <div className="tj-spinner" />
        <div>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage storage={storage} onAuthed={(u) => setUser(u)} brand="AAICOREFX" />;
  }

  return (
    <TradingJournalApp
      user={user}
      onLogout={async () => { await logOut(storage); setUser(null); }}
    />
  );
}

