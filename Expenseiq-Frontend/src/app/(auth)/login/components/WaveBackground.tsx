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

    // Card center approximation for fading
    const cx = W >= 1024 ? W * 0.75 : W * 0.5;
    const cy = H * 0.5;

    // Smoothstep function for fading
    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    const baseAlpha = tk.waveAlphaBase * 1.5; // Reduced overall visibility

    // Premium depth layers: Back (blurriest/slowest) to Front (sharpest)
    const layers = [
      { z: 0.3, color: lerpedC0, blur: 40, alphaMulti: 0.5, speed: 0.08, amp: 0.3, freq: 1.5, lines: 5, thickness: 4 },
      { z: 0.6, color: lerpedC1, blur: 20, alphaMulti: 0.7, speed: 0.12, amp: 0.2, freq: 2.0, lines: 7, thickness: 2 },
      { z: 1.0, color: lerpedC0, blur: 4,  alphaMulti: 1.0, speed: 0.16, amp: 0.1, freq: 2.5, lines: 9, thickness: 1 },
    ];

    const yCentre = 0.5 * H;
    const spread = 0.4; // Vertically span 40% of screen

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const layer of layers) {
      const half = (spread * H) * layer.z;
      ctx.shadowBlur = layer.blur;
      ctx.shadowColor = `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, ${baseAlpha * layer.alphaMulti})`;
      
      for (let li = 0; li < layer.lines; li++) {
        const liFrac = layer.lines > 1 ? li / (layer.lines - 1) : 0.5;
        // Offset yBase slightly based on layer and line index
        const yBase = yCentre - half + liFrac * half * 2;
        
        // Edge strengthening: Lines further from the vertical center are slightly more opaque
        const distVerticalEdge = Math.abs(liFrac - 0.5) * 2;
        const lineBaseAlpha = (baseAlpha * layer.alphaMulti) * (0.4 + 0.6 * distVerticalEdge);
        
        if (lineBaseAlpha <= 0.01) continue;
        
        const phaseOffset = li * 0.3 + layer.z * 5;
        
        ctx.beginPath();
        ctx.lineWidth = layer.thickness;
        
        let first = true;
        for (let x = 0; x <= W; x += W / 80) { // 80 segments for smooth curves
          const xNorm = x / W;
          
          // Smooth, non-random sine wave
          const y = yBase + Math.sin(xNorm * Math.PI * layer.freq + phaseOffset + t * layer.speed) * (layer.amp * H);
          
          // Calculate distance from card to fade out near the form
          const distToCard = Math.hypot(x - cx, y - cy);
          const fadeMultiplier = smoothstep(150, 600, distToCard);
          
          // Also strengthen on extreme horizontal edges
          const distHorizontalEdge = Math.abs(xNorm - 0.5) * 2;
          const edgeMultiplier = 0.5 + 0.5 * distHorizontalEdge;

          const finalAlpha = lineBaseAlpha * fadeMultiplier * edgeMultiplier;
          
          ctx.strokeStyle = `rgba(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]}, ${finalAlpha})`;
          
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
            // Apply stroke segment by segment to allow dynamic alpha fading along the line
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
          }
        }
      }
    }
    
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
