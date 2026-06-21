import { useRef, useEffect, useCallback, memo } from 'react';
import { ThemeTokens } from '../types';

/**
 * DNA / AI Helix Background
 *
 * Draws a rotating double-helix (2 backbone strands + horizontal rungs)
 * with subtle floating particles. Designed for premium AI-fintech aesthetic.
 *
 * Performance:
 *  - Uses Path2D batching (2 strokes per helix, ~20 rung strokes)
 *  - No ctx.shadowBlur (glow via globalAlpha + lineWidth layering)
 *  - Throttled to 30 FPS
 *  - Respects prefers-reduced-motion
 *  - DPR-aware canvas sizing
 */
export const WaveBackground = memo(function WaveBackground({ tokens }: { tokens: ThemeTokens }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tokensRef = useRef<ThemeTokens>(tokens);
  tokensRef.current = tokens;

  // Color transition state
  const WAVE_TRANSITION_MS = 1100;
  const colorFromRef = useRef<[number[], number[]]>(tokens.waveColors);
  const colorToRef = useRef<[number[], number[]]>(tokens.waveColors);
  const colorTRef = useRef<number>(1);
  const colorStartRef = useRef<number>(0);
  const prevColorsRef = useRef<[number[], number[]]>(tokens.waveColors);

  useEffect(() => {
    const next = tokens.waveColors;
    if (next[0].join() === colorToRef.current[0].join() && next[1].join() === colorToRef.current[1].join()) return;
    colorFromRef.current = prevColorsRef.current;
    colorToRef.current = next;
    colorTRef.current = 0;
    colorStartRef.current = performance.now();
  }, [tokens.waveColors]);

  // Particle pool — initialised once
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number; phase: number }[]>([]);

  const initParticles = useCallback((W: number, H: number) => {
    const count = Math.min(40, Math.floor((W * H) / 30000)); // scale with viewport
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      r: 1 + Math.random() * 2,
      alpha: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const lastFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const now = performance.now();
    // 30 FPS throttle (~33ms)
    if (now - lastFrameRef.current < 32) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    lastFrameRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const t = now / 1000;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── Color interpolation (only when transitioning) ──────────────
    let c0: number[], c1: number[];
    if (colorTRef.current < 1) {
      const elapsed = now - colorStartRef.current;
      const rawT = Math.min(elapsed / WAVE_TRANSITION_MS, 1);
      const eased = rawT < 0.5 ? 4 * rawT ** 3 : 1 - (-2 * rawT + 2) ** 3 / 2;
      colorTRef.current = rawT;
      const lerp = (a: number[], b: number[], p: number) => a.map((v, i) => Math.round(v + (b[i] - v) * p));
      c0 = lerp(colorFromRef.current[0], colorToRef.current[0], eased);
      c1 = lerp(colorFromRef.current[1], colorToRef.current[1], eased);
      prevColorsRef.current = [c0, c1];
    } else {
      c0 = colorToRef.current[0];
      c1 = colorToRef.current[1];
    }

    const tk = tokensRef.current;
    const baseAlpha = tk.waveAlphaBase;

    // ── Card center (avoid drawing over the form) ──────────────────
    const cx = W >= 1024 ? W * 0.75 : W * 0.5;
    const cy = H * 0.5;
    const cardRadius = 280;

    // ── DNA Helix Parameters ───────────────────────────────────────
    const helixCenterY = H * 0.5;
    const amplitude = H * 0.15;       // vertical spread of helix
    const frequency = 2.5;            // number of full rotations visible
    const speed = 0.15;               // rotation speed
    const segments = 120;             // path smoothness
    const rungSpacing = 6;            // draw a rung every N segments

    // Two backbone strands offset by π
    const strand1: { x: number; y: number }[] = [];
    const strand2: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const x = frac * W;
      const angle = frac * Math.PI * 2 * frequency + t * speed;

      // 3D depth simulation via perspective scaling
      const depthScale = 0.6 + 0.4 * Math.sin(angle);
      const depthScale2 = 0.6 + 0.4 * Math.sin(angle + Math.PI);

      const y1 = helixCenterY + Math.sin(angle) * amplitude * depthScale;
      const y2 = helixCenterY + Math.sin(angle + Math.PI) * amplitude * depthScale2;

      strand1.push({ x, y: y1 });
      strand2.push({ x, y: y2 });
    }

    // ── Helper: fade near card area ────────────────────────────────
    const fadeForCard = (x: number, y: number) => {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < cardRadius * 0.6) return 0;
      if (dist > cardRadius * 1.5) return 1;
      return (dist - cardRadius * 0.6) / (cardRadius * 0.9);
    };

    // ── Draw glow layer (thicker, lower alpha) ─────────────────────
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Glow pass for strand 1
    ctx.beginPath();
    for (let i = 0; i < strand1.length; i++) {
      const p = strand1[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(${c0[0]}, ${c0[1]}, ${c0[2]}, ${baseAlpha * 0.3})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Glow pass for strand 2
    ctx.beginPath();
    for (let i = 0; i < strand2.length; i++) {
      const p = strand2[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${baseAlpha * 0.3})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    // ── Draw sharp strand lines ────────────────────────────────────
    ctx.beginPath();
    for (let i = 0; i < strand1.length; i++) {
      const p = strand1[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(${c0[0]}, ${c0[1]}, ${c0[2]}, ${baseAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < strand2.length; i++) {
      const p = strand2[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${baseAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Draw rungs (base pairs) ────────────────────────────────────
    for (let i = 0; i <= segments; i += rungSpacing) {
      const p1 = strand1[i];
      const p2 = strand2[i];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const fade = fadeForCard(midX, midY);
      if (fade < 0.05) continue;

      // Determine depth — rungs behind the helix are dimmer
      const frac = i / segments;
      const angle = frac * Math.PI * 2 * frequency + t * speed;
      const depth = Math.cos(angle);  // -1 = back, +1 = front
      const depthAlpha = 0.15 + 0.85 * ((depth + 1) / 2);

      const rungAlpha = baseAlpha * 0.5 * fade * depthAlpha;

      // Gradient from c0 to c1 across the rung
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(${c0[0]}, ${c0[1]}, ${c0[2]}, ${rungAlpha})`;
      ctx.lineWidth = depth > 0 ? 1 : 0.5;
      ctx.stroke();

      // Node dots at connection points
      if (depth > 0.2) {
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 2 * depthAlpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c0[0]}, ${c0[1]}, ${c0[2]}, ${rungAlpha * 1.5})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 2 * depthAlpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${rungAlpha * 1.5})`;
        ctx.fill();
      }
    }

    // ── Floating AI particles ──────────────────────────────────────
    const particles = particlesRef.current;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      const fade = fadeForCard(p.x, p.y);
      if (fade < 0.05) continue;

      const pulse = 0.6 + 0.4 * Math.sin(t * 1.5 + p.phase);
      const alpha = p.alpha * fade * pulse * baseAlpha * 3;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c0[0]}, ${c0[1]}, ${c0[2]}, ${alpha})`;
      ctx.fill();
    }

    // ── Draw subtle connection lines between nearby particles ──────
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = dx * dx + dy * dy;
        if (dist < 15000) { // ~122px
          const fadeLine = 1 - dist / 15000;
          const midFade = fadeForCard(
            (particles[i].x + particles[j].x) / 2,
            (particles[i].y + particles[j].y) / 2
          );
          if (midFade < 0.05) continue;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${fadeLine * midFade * baseAlpha * 0.5})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check reduced motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      initParticles(window.innerWidth, window.innerHeight);
    }

    resize();
    window.addEventListener('resize', resize);

    if (!prefersReduced) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // Draw one static frame
      lastFrameRef.current = 0;
      draw();
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
});
