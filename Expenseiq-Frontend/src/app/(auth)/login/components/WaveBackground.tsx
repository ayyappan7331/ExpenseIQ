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

    // Boost alpha for a stronger, glowing effect
    const baseAlpha = Math.max(tk.waveAlphaBase * 4.0, 0.45);

    // Two layers representing the two strands of DNA, perfectly 180 degrees (Math.PI) out of phase
    const strands = [
      { color: green, blur: 16, alphaMulti: 1.0, lines: 12, dotSpace: 15, thickness: 3.5, phaseOffset: 0 },
      { color: saffron, blur: 16, alphaMulti: 1.0, lines: 12, dotSpace: 15, thickness: 3.5, phaseOffset: Math.PI },
    ];

    const yCentre = 0.5 * H; // Centered vertically
    const spread = 0.08; // Vertical spread of the inner lines of a single strand
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const strand of strands) {
      const half = spread * H;
      ctx.shadowBlur = strand.blur;
      ctx.shadowColor = `rgba(${strand.color[0]}, ${strand.color[1]}, ${strand.color[2]}, ${baseAlpha * strand.alphaMulti * 0.8})`;
      
      for (let li = 0; li < strand.lines; li++) {
        const liFrac = strand.lines > 1 ? li / (strand.lines - 1) : 0.5;
        const yBase = yCentre - half + liFrac * half * 2;
        const distEdge = Math.abs(liFrac - 0.5) * 2;
        
        const alpha = (baseAlpha * strand.alphaMulti) * (1 - distEdge * 0.5);
        if (alpha <= 0.01) continue;
        
        const strokeW = strand.thickness;
        // Inner lines slightly offset in phase to create a "ribbon" thickness
        const linePhase = strand.phaseOffset + (liFrac - 0.5) * 0.4; 
        const [r, g, b] = strand.color;
        
        ctx.beginPath();
        ctx.setLineDash([0, strand.dotSpace]);
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        
        const step = Math.max(4, strand.dotSpace / 2);
        for (let x = 0; x <= W + step; x += step) {
          const xNorm = x / W;
          
          // DNA specific math
          const twists = 2.5; // Number of full helical twists across the screen
          const spinSpeed = 0.25; // Speed of horizontal rotation
          
          // Global gentle undulation so the DNA isn't completely rigid
          const globalWobble = Math.sin(xNorm * Math.PI * 1.5 + t * 0.15) * 0.08 * H;
          
          // Helix rotation angle
          const theta = xNorm * Math.PI * 2 * twists - t * spinSpeed * Math.PI * 2 + linePhase;
          
          // Y position based on sine to create the 2D projection of a 3D helix
          const dynamicAmp = 0.18; // Helix radius
          const y = yBase + globalWobble + Math.sin(theta) * dynamicAmp * H;
          
          // Simulate 3D depth by changing stroke thickness/alpha based on cosine (z-axis)
          // Wait, stroke() draws the whole path with one style. We can't change thickness per point easily with stroke().
          // But the phase shift alone successfully creates the spinning DNA illusion.
          
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
