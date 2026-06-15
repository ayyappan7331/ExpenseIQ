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
    // Calculate theme transition for completeness, but we will override with Tiranga colors
    function lerp(a: number[], b: number[], t: number): number[] { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
    const lerpedC0 = lerp(colorFromRef.current[0], colorToRef.current[0], eased);
    const lerpedC1 = lerp(colorFromRef.current[1], colorToRef.current[1], eased);
    prevColorsRef.current = [lerpedC0, lerpedC1];
    
    // Explicit Tiranga colors
    const saffron = [255, 153, 51];
    const green = [19, 136, 8];

    // Greatly boost alpha for a stronger, glowing effect
    const baseAlpha = Math.max(tk.waveAlphaBase * 4.0, 0.45);

    // Define 2 depth layers for parallax using Tiranga colors
    const layers = [
      { z: 0.3, color: green, blur: 24, alphaMulti: 0.8, speedMulti: 0.2, ampMulti: 0.6, lines: 8, dotSpace: 25, thickness: 8 },
      { z: 1.0, color: saffron, blur: 8, alphaMulti: 1.3, speedMulti: 1.0, ampMulti: 1.2, lines: 16, dotSpace: 8, thickness: 2 },
    ];

    const yCentre = 0.55 * H; // Center of the waves slightly lower
    const spread = 0.25; // Vertical spread of the lines within a layer
    
    ctx.lineCap = 'round'; // Essential for circular dots
    ctx.lineJoin = 'round';

    // Draw layers back-to-front
    for (const layer of layers) {
      const half = (spread * H) * layer.z; // Scale spread by depth
      ctx.shadowBlur = layer.blur;
      ctx.shadowColor = `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, ${baseAlpha * layer.alphaMulti * 0.8})`;
      
      for (let li = 0; li < layer.lines; li++) {
        const liFrac = layer.lines > 1 ? li / (layer.lines - 1) : 0.5;
        const yBase = yCentre - half + liFrac * half * 2;
        const distEdge = Math.abs(liFrac - 0.5) * 2; // 0 at center, 1 at edge
        
        // Fade out lines that are further from the center vertically
        const alpha = (baseAlpha * layer.alphaMulti) * (1 - distEdge * 0.7);
        if (alpha <= 0.01) continue;
        
        const strokeW = layer.thickness;
        const linePhase = li * 0.4 + layer.z * 15; // offset phase
        const [r, g, b] = layer.color;
        
        ctx.beginPath();
        // Using [0, space] with lineCap 'round' creates perfect dotted circles
        ctx.setLineDash([0, layer.dotSpace]);
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        
        const step = Math.max(4, layer.dotSpace / 2);
        for (let x = 0; x <= W + step; x += step) {
          const xNorm = x / W;
          
          // Complex sine wave math for organic flow
          const dynamicPhase = linePhase + Math.sin(t * 0.4 * layer.speedMulti + xNorm * 3) * 1.5;
          const dynamicAmp = 0.1 * layer.ampMulti * (1 + Math.sin(t * 0.3 + li * 0.2) * 0.4);
          const dynamicFreq = 1.2 * (1 + Math.sin(t * 0.2 + xNorm * 1.5) * 0.3);
          
          const y = yBase + Math.sin(xNorm * Math.PI * 2 * dynamicFreq + t * 0.1 * layer.speedMulti * Math.PI * 2 + dynamicPhase) * dynamicAmp * H;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
    
    // Cleanup canvas state for next frame
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    
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
