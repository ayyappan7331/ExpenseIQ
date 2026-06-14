import { useRef, useEffect } from 'react';

export function ThemeRipple({ 
  active, 
  origin, 
  targetBg, 
  onDone 
}: { 
  active: boolean; 
  origin: { x: number; y: number }; 
  targetBg: string; 
  onDone: () => void; 
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!active) return;
    const el = ref.current; if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReduced ? 400 : 1100;
    const easing = prefersReduced ? 'ease' : 'cubic-bezier(0.22,1,0.36,1)';
    const maxR = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y)) * 1.08;
    
    if (prefersReduced) {
      el.style.clipPath = 'none'; el.style.opacity = '0'; void el.offsetWidth;
      el.style.transition = `opacity ${duration}ms ease`; el.style.opacity = '1';
    } else {
      el.style.clipPath = `circle(0px at ${origin.x}px ${origin.y}px)`; el.style.opacity = '1'; void el.offsetWidth;
      el.style.transition = `clip-path ${duration}ms ${easing}`;
      el.style.clipPath = `circle(${maxR}px at ${origin.x}px ${origin.y}px)`;
    }
    
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [active, origin, onDone]);
  
  if (!active) return null;
  return <div ref={ref} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9999, background: targetBg, pointerEvents: 'none', opacity: 0 }} />;
}
