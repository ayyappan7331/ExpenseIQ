import { useRef, useEffect, useCallback, memo } from 'react';
import { ThemeTokens } from '../types';

export const WaveBackground = memo(function WaveBackground({ tokens }: { tokens: ThemeTokens }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tokensRef = useRef<ThemeTokens>(tokens);
  tokensRef.current = tokens;
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    const t = performance.now() / 1000; const tk = tokensRef.current;
    ctx.clearRect(0, 0, W, H);
    const elapsed = performance.now() - colorStartRef.current;
    const rawT = colorTRef.current < 1 ? Math.min(elapsed / WAVE_TRANSITION_MS, 1) : 1;
    const eased = rawT < 0.5 ? 4 * rawT ** 3 : 1 - (-2 * rawT + 2) ** 3 / 2;
    colorTRef.current = rawT;
    function lerp(a: number[], b: number[], t: number): number[] { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
    const lerpedC0 = lerp(colorFromRef.current[0], colorToRef.current[0], eased);
    const lerpedC1 = lerp(colorFromRef.current[1], colorToRef.current[1], eased);
    prevColorsRef.current = [lerpedC0, lerpedC1];
    
    // Use Tiranga colors explicitly regardless of theme
    const saffron = [255, 153, 51];
    const green = [19, 136, 8];
    const bands = [
      { yFrac: 0.35, freq: 1.4, speed: 0.045, amp: 0.065, phase: 0.0, color: saffron, boost: 2.0 },
      { yFrac: 0.70, freq: 1.2, speed: 0.050, amp: 0.060, phase: 2.0, color: green, boost: 2.2 },
    ];
    const LINES_PER_BAND = 18; const BAND_SPREAD = 0.07;
    const baseAlpha = tk.waveAlphaBase;
    for (const band of bands) {
      const yCentre = band.yFrac * H; const spread = BAND_SPREAD; const half = (spread * H) / 2;
      for (let li = 0; li < LINES_PER_BAND; li++) {
        const liFrac = li / (LINES_PER_BAND - 1); const yBase = yCentre - half + liFrac * half * 2;
        const distEdge = Math.abs(liFrac - 0.5) * 2;
        const alpha = (baseAlpha - distEdge * 0.09) * (band.boost ?? 1);
        if (alpha <= 0) continue;
        const strokeW = 0.4 + (1 - distEdge) * 0.4;
        const linePhase = band.phase + li * 0.22;
        const [r, g, b] = band.color;
        
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const r1 = Math.sin(t * 1.13 + li * 0.71);
          const r2 = Math.cos(t * 0.87 + (x / W) * 4.3 + li * 0.47);
          const dynamicPhase = linePhase + Math.sin(t * 0.6 + (x / W) * 3) * 1.5 + r1 * 2.5;
          const dynamicAmp = band.amp * (1 + Math.sin(t * 0.4 + li * 0.3) * 0.6 + r2 * 0.7);
          const dynamicFreq = band.freq * (1 + Math.sin(t * 0.3 + (x / W)) * 0.4 + (r1 * r2) * 0.5);
          const y = yBase + Math.sin((x / W) * Math.PI * 2 * dynamicFreq + t * band.speed * Math.PI * 2 + dynamicPhase) * dynamicAmp * H;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.3})`; ctx.lineWidth = strokeW * 6;
        ctx.shadowColor = `rgba(${r},${g},${b},0.12)`; ctx.shadowBlur = 10; ctx.stroke();
        
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const r1 = Math.sin(t * 1.13 + li * 0.71);
          const r2 = Math.cos(t * 0.87 + (x / W) * 4.3 + li * 0.47);
          const dynamicPhase = linePhase + Math.sin(t * 0.6 + (x / W) * 3) * 1.5 + r1 * 2.5;
          const dynamicAmp = band.amp * (1 + Math.sin(t * 0.4 + li * 0.3) * 0.6 + r2 * 0.7);
          const dynamicFreq = band.freq * (1 + Math.sin(t * 0.3 + (x / W)) * 0.4 + (r1 * r2) * 0.5);
          const y = yBase + Math.sin((x / W) * Math.PI * 2 * dynamicFreq + t * band.speed * Math.PI * 2 + dynamicPhase) * dynamicAmp * H;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`; ctx.lineWidth = strokeW; ctx.shadowBlur = 0; ctx.stroke();
      }
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    function resize() { if (!canvas) return; canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize); rafRef.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden />;
});
