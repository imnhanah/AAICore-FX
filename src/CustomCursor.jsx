import React, { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [role='button'], .tj-card, .tj-cal-cell, .recharts-wrapper, svg, .auth-tab, .tj-chip, .tj-tag";

export default function CustomCursor() {
  const dotRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Gracefully disable on touch devices — a custom cursor makes no sense there.
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (isTouch) return;
    setEnabled(true);
    document.documentElement.classList.add("cc-active");

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let hovering = false;
    let magnetTarget = null;
    let clicking = false;
    let rafId;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el && el.closest(INTERACTIVE_SELECTOR);
      hovering = !!interactive;
      if (interactive) {
        const rect = interactive.getBoundingClientRect();
        magnetTarget = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      } else {
        magnetTarget = null;
      }
    };
    const onDown = () => {
      clicking = true;
      if (dotRef.current) {
        const inner = dotRef.current.firstChild;
        inner.classList.remove("cc-pulse"); void inner.offsetWidth; inner.classList.add("cc-pulse");
      }
    };
    const onUp = () => { clicking = false; };
    const onLeaveWindow = () => { if (dotRef.current) dotRef.current.style.opacity = "0"; };
    const onEnterWindow = () => { if (dotRef.current) dotRef.current.style.opacity = "1"; };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    const tick = () => {
      // Slight magnetic pull toward interactive elements, with a touch of
      // spring-like lag; otherwise tracks the raw pointer almost instantly.
      const targetX = magnetTarget ? mouse.x + (magnetTarget.x - mouse.x) * 0.3 : mouse.x;
      const targetY = magnetTarget ? mouse.y + (magnetTarget.y - mouse.y) * 0.3 : mouse.y;
      pos.x += (targetX - pos.x) * 0.35;
      pos.y += (targetY - pos.y) * 0.35;
      if (dotRef.current) {
        const scale = (hovering ? 1.25 : 1) * (clicking ? 0.85 : 1);
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        dotRef.current.classList.toggle("cc-dot-hover", hovering);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("cc-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
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
.cc-dot-wrap.cc-dot-hover .cc-dot,
.cc-dot.cc-dot-hover {
  box-shadow: 0 0 18px 6px rgba(77,255,102,0.75), 0 0 4px 1px rgba(102,255,122,1);
}
.cc-dot.cc-pulse { animation: cc-pulse-anim 0.26s ease-out; }
@keyframes cc-pulse-anim {
  0% { transform: scale(1); }
  40% { transform: scale(2.4); box-shadow: 0 0 18px 8px rgba(102,255,122,0.9); }
  100% { transform: scale(1); }
}
`;
