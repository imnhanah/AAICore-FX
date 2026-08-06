import React, { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [role='button'], .tj-card, .tj-cal-cell, .recharts-wrapper, svg, .auth-tab, .tj-chip, .tj-tag";

export default function CustomCursor() {
  const dotRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (isTouch) return;
    setEnabled(true);
    document.documentElement.classList.add("cc-active");

    // All mutable per-frame state lives in refs/plain objects, never React
    // state — state updates here would trigger re-renders on every pixel
    // of mouse movement, which is exactly what causes stutter.
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    const hoverRef = { current: false };
    const magnetRef = { current: null };
    let rafId = null;
    let running = true;

    // mousemove does ONE thing: record coordinates. No getBoundingClientRect,
    // no elementFromPoint, no style writes — those are the operations that
    // were previously running on every single mousemove event (which can
    // fire well over 100x/sec) and blocking the frame, causing jitter.
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

    // Hover state is figured out via mouseover/mouseout instead — these only
    // fire when the hovered element actually changes, not on every pixel of
    // movement, so this is cheap regardless of mouse speed.
    const onOver = (e) => {
      const interactive = e.target.closest ? e.target.closest(INTERACTIVE_SELECTOR) : null;
      if (interactive) {
        hoverRef.current = true;
        const rect = interactive.getBoundingClientRect();
        magnetRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    };
    const onOut = (e) => {
      const toEl = e.relatedTarget;
      const stillInteractive = toEl && toEl.closest && toEl.closest(INTERACTIVE_SELECTOR);
      if (!stillInteractive) { hoverRef.current = false; magnetRef.current = null; }
    };

    const onDown = () => {
      const inner = dotRef.current && dotRef.current.firstChild;
      if (inner) { inner.classList.remove("cc-pulse"); void inner.offsetWidth; inner.classList.add("cc-pulse"); }
    };
    const onLeaveWindow = () => { if (dotRef.current) dotRef.current.style.opacity = "0"; };
    const onEnterWindow = () => { if (dotRef.current) dotRef.current.style.opacity = "1"; };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    // Single render loop, GPU-accelerated transform, easing toward target.
    const LERP = 0.55; // snappy but smoothed — high enough to feel instant, low enough to erase micro-jitter
    const tick = () => {
      const magnet = magnetRef.current;
      const targetX = magnet ? mouse.x + (magnet.x - mouse.x) * 0.3 : mouse.x;
      const targetY = magnet ? mouse.y + (magnet.y - mouse.y) * 0.3 : mouse.y;
      pos.x += (targetX - pos.x) * LERP;
      pos.y += (targetY - pos.y) * LERP;
      if (dotRef.current) {
        const scale = hoverRef.current ? 1.25 : 1;
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        dotRef.current.classList.toggle("cc-dot-hover", hoverRef.current);
      }
      if (running) rafId = requestAnimationFrame(tick);
    };

    // Pause entirely when the tab isn't visible — no point animating (and
    // burning battery/CPU) on a hidden tab, and this avoids a big backlog
    // of stale frames causing a visible jump when you switch back.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
      } else {
        if (!running) { running = true; pos.x = mouse.x; pos.y = mouse.y; rafId = requestAnimationFrame(tick); }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    rafId = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("cc-active");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <style>{CURSOR_CSS}</style>
      <div ref={dotRef} className="cc-dot-wrap"><span className="cc-dot" /></div>
    </>
  );
}

const CURSOR_CSS = `
html.cc-active, html.cc-active * { cursor: none !important; }
.cc-dot-wrap { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 999999; will-change: transform; transition: opacity 0.2s ease; }
.cc-dot {
  display: block; width: 10px; height: 10px; border-radius: 50%;
  background: #66FF7A;
  box-shadow: 0 0 10px 3px rgba(77,255,102,0.55), 0 0 3px 1px rgba(102,255,122,0.9);
  transition: box-shadow 0.2s ease;
}
.cc-dot-wrap.cc-dot-hover .cc-dot {
  box-shadow: 0 0 18px 6px rgba(77,255,102,0.75), 0 0 4px 1px rgba(102,255,122,1);
}
.cc-dot.cc-pulse { animation: cc-pulse-anim 0.26s ease-out; }
@keyframes cc-pulse-anim {
  0% { transform: scale(1); }
  40% { transform: scale(2.4); box-shadow: 0 0 18px 8px rgba(102,255,122,0.9); }
  100% { transform: scale(1); }
}
`;
