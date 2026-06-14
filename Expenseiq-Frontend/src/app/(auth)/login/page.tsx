'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, X, ArrowLeft, Phone, Mail, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser, getToken, isAuthEnabled } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';

/* ── Per-field tooltip guidance (static, never repeats validation text) ── */
const FIELD_HINTS: Record<string, string[]> = {
  loginIdentifier: ['Enter your email address or mobile number.', 'Example: user@mail.com or 9876543210'],
  loginPw:         ['Enter your account password.', 'Password is case-sensitive.'],
  regName:         ['Enter your full name as you would like it displayed.'],
  regEmail:        ['Enter a valid email address.', 'Format: name@company.com'],
  regMobile:       ['Enter your 10-digit mobile number.', 'Either email or mobile is required.'],
  regPurpose:      ['Choose the primary way you plan to use ExpenseIQ.'],
  regPw:           ['Create a strong password.', 'Mix letters, numbers and symbols.'],
  regCf:           ['Re-enter the password you just created.'],
  forgotIdentifier:['Enter the email or mobile number linked to your account.'],
  forgotOtp:       ['Enter the 6-digit OTP sent to your identifier.', 'OTP expires in 10 minutes.'],
  forgotNewPw:     ['Create a new password.', 'Min 8 characters — mix letters, numbers, symbols.'],
  forgotCfPw:      ['Re-enter your new password to confirm.'],
  otpLoginId:      ['Enter your registered email or mobile number.', 'We will send a one-time code to log you in.'],
  otpLoginCode:    ['Enter the 6-digit code sent to your account.', 'Check server console (dev mode — no SMS/email yet).'],
};

/* ── ValidationTooltip ── */
interface TooltipState { lines: string[]; x: number; y: number; visible: boolean; }

function ValidationTooltip({ state, theme }: { state: TooltipState; theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  if (!state.visible || state.lines.length === 0) return null;
  const ARROW = 7;
  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed', left: state.x, top: state.y - ARROW,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 9998, pointerEvents: 'none',
        animation: 'tooltipIn 200ms cubic-bezier(0.22,1,0.36,1) both',
        background: isDark ? 'rgba(12,10,30,0.72)' : 'rgba(255,255,255,0.70)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(124,111,247,0.25)' : 'rgba(124,111,247,0.15)'}`,
        borderRadius: 10,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.08)',
        padding: '8px 12px', whiteSpace: 'nowrap', maxWidth: 280,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {state.lines.map((line, i) => (
          <span key={i} style={{
            fontSize: '0.7rem',
            color: i === 0 ? (isDark ? '#e8e0ff' : '#2a1a3e') : (isDark ? 'rgba(220,210,255,0.55)' : 'rgba(60,40,100,0.55)'),
            fontWeight: i === 0 ? 500 : 400, lineHeight: 1.45,
          }}>{line}</span>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: -ARROW, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: `${ARROW}px solid transparent`, borderRight: `${ARROW}px solid transparent`, borderTop: `${ARROW}px solid ${isDark ? 'rgba(124,111,247,0.25)' : 'rgba(124,111,247,0.15)'}` }} />
      <div style={{ position: 'absolute', bottom: -(ARROW - 1), left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: `${ARROW - 1}px solid transparent`, borderRight: `${ARROW - 1}px solid transparent`, borderTop: `${ARROW - 1}px solid ${isDark ? 'rgba(12,10,30,0.72)' : 'rgba(255,255,255,0.70)'}` }} />
    </div>
  );
}

/* ── FieldError ── */
function FieldError({ msg, theme }: { msg: string; theme: 'dark' | 'light' }) {
  return (
    <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '4px 2px 0', fontSize: '0.688rem', color: theme === 'dark' ? '#f0a0a0' : '#b94040', animation: 'fieldErrIn 180ms cubic-bezier(0.22,1,0.36,1) both', lineHeight: 1.4 }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0, opacity: 0.85 }}>
        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
        <path d="M6 3.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="6" cy="8.5" r="0.6" fill="currentColor"/>
      </svg>
      {msg}
    </p>
  );
}

/* ── SuccessNote ── */
function SuccessNote({ msg, theme }: { msg: string; theme: 'dark' | 'light' }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '4px 2px 0', fontSize: '0.688rem', color: theme === 'dark' ? '#6ee7b7' : '#059669', lineHeight: 1.4 }}>
      <Check style={{ width: 11, height: 11, flexShrink: 0 }} />
      {msg}
    </p>
  );
}

const FIELD_ERR_KEYFRAME = [
  `@keyframes fieldErrIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`,
  `@keyframes tooltipIn{from{opacity:0;transform:translateX(-50%) translateY(calc(-100% + 6px))}to{opacity:1;transform:translateX(-50%) translateY(-100%)}}@keyframes spin{to{transform:rotate(360deg)}}`,
].join('');

/* ── Password rules ── */
const RULES = [
  { id: 'len',     label: 'Min 8 characters',     test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Uppercase (A–Z)',        test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Lowercase (a–z)',        test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit',   label: 'Number (0–9)',            test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Special char (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const PURPOSES = [
  { value: 'personal',   label: 'Personal Finance' },
  { value: 'business',   label: 'Business & Freelance' },
  { value: 'family',     label: 'Family Budget' },
  { value: 'student',    label: 'Student Budget' },
  { value: 'investment', label: 'Investments & Wealth' },
  { value: 'travel',     label: 'Travel & Expenses' },
  { value: 'startup',    label: 'Startup / Side Project' },
  { value: 'savings',    label: 'Savings Goals' },
  { value: 'debt',       label: 'Debt Payoff Tracker' },
  { value: 'other',      label: 'Other' },
];

function strengthInfo(passed: number) {
  if (passed <= 1) return { label: 'Weak',       color: '#ef4444', w: '20%' };
  if (passed === 2) return { label: 'Fair',       color: '#f59e0b', w: '40%' };
  if (passed === 3) return { label: 'Good',       color: '#f59e0b', w: '60%' };
  if (passed === 4) return { label: 'Strong',     color: '#22c55e', w: '80%' };
  return               { label: 'Very Strong', color: '#22c55e', w: '100%' };
}

/** Detect if a string looks like a mobile number (10 digits, optionally prefixed) */
function looksLikeMobile(val: string) {
  return /^(\+91|91)?[6-9]\d{9}$/.test(val.replace(/\s|-/g, ''));
}

/* ── Theme tokens ── */
const DARK_TOKENS = {
  bg: '#08090f', color: '#e4e7f0',
  cardBg: 'rgba(8,12,24,0.25)', cardBorder: 'rgba(255,255,255,0.15)',
  cardShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(124,111,247,0.08)',
  subtitle: 'rgba(255,255,255,0.4)', tagline: 'rgba(255,255,255,0.5)',
  taglineDot0: '#7c6ff7', taglineDot1: '#5ee8b0',
  dot0Shadow: '0 0 8px 2px rgba(124,111,247,0.7)', dot1Shadow: '0 0 8px 2px rgba(94,232,176,0.6)',
  tracker: 'rgba(255,255,255,0.35)',
  waveAlphaBase: 0.14, waveColors: [[124,111,247],[99,102,241]] as [number[],number[]],
  glowA: 'rgba(124,111,247,0.07)', glowB: 'rgba(94,232,176,0.05)',
  inpBg: 'rgba(255,255,255,0.07)', inpBorder: 'rgba(255,255,255,0.18)',
  inpFocus: '0 0 0 3px rgba(124,111,247,0.35)', inpBlur: 'none',
  inpText: '#ffffff', inpPh: 'rgba(255,255,255,0.3)',
  linkColor: '#a78bfa', logoIQ: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)',
};

const LIGHT_TOKENS = {
  bg: '#eeeaf4', color: '#1a1a2e',
  cardBg: 'rgba(250,250,255,0.28)', cardBorder: 'rgba(255,255,255,0.5)',
  cardShadow: '0 12px 40px rgba(0,0,0,0.08)',
  subtitle: 'rgba(30,30,60,0.5)', tagline: 'rgba(30,30,60,0.55)',
  taglineDot0: '#7c6ff7', taglineDot1: '#0ea5e9',
  dot0Shadow: '0 0 8px 2px rgba(124,111,247,0.45)', dot1Shadow: '0 0 8px 2px rgba(14,165,233,0.45)',
  tracker: 'rgba(30,30,60,0.4)',
  waveAlphaBase: 0.16, waveColors: [[148,120,255],[80,140,230]] as [number[],number[]],
  glowA: 'rgba(124,111,247,0.08)', glowB: 'rgba(14,165,233,0.06)',
  inpBg: 'rgba(255,255,255,0.45)', inpBorder: 'rgba(120,120,160,0.12)',
  inpFocus: '0 0 0 3px rgba(109,82,216,0.22)', inpBlur: 'blur(8px)',
  inpText: '#1a1a2e', inpPh: 'rgba(30,30,60,0.35)',
  linkColor: '#6d52d8', logoIQ: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)',
};

type Tokens = typeof DARK_TOKENS;

/* ── WaveBackground ── */
const WaveBackground = memo(function WaveBackground({ tokens }: { tokens: Tokens }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const tokensRef   = useRef<Tokens>(tokens);
  tokensRef.current = tokens;
  const WAVE_TRANSITION_MS = 1100;
  const colorFromRef = useRef<[number[], number[]]>(tokens.waveColors);
  const colorToRef   = useRef<[number[], number[]]>(tokens.waveColors);
  const colorTRef    = useRef<number>(1);
  const colorStartRef= useRef<number>(0);
  const prevColorsRef= useRef<[number[], number[]]>(tokens.waveColors);

  useEffect(() => {
    const next = tokens.waveColors;
    if (next[0].join() === colorToRef.current[0].join() && next[1].join() === colorToRef.current[1].join()) return;
    colorFromRef.current  = prevColorsRef.current;
    colorToRef.current    = next;
    colorTRef.current     = 0;
    colorStartRef.current = performance.now();
  }, [tokens.waveColors]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    const t = performance.now() / 1000; const tk = tokensRef.current;
    ctx.clearRect(0, 0, W, H);
    const elapsed = performance.now() - colorStartRef.current;
    const rawT    = colorTRef.current < 1 ? Math.min(elapsed / WAVE_TRANSITION_MS, 1) : 1;
    const eased   = rawT < 0.5 ? 4 * rawT ** 3 : 1 - (-2 * rawT + 2) ** 3 / 2;
    colorTRef.current = rawT;
    function lerp(a: number[], b: number[], t: number): number[] { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
    const lerpedC0 = lerp(colorFromRef.current[0], colorToRef.current[0], eased);
    const lerpedC1 = lerp(colorFromRef.current[1], colorToRef.current[1], eased);
    prevColorsRef.current = [lerpedC0, lerpedC1];
    const [c0, c1] = [lerpedC0, lerpedC1];
    const bands = [
      { yFrac: 0.35, freq: 1.4, speed: 0.045, amp: 0.065, phase: 0.0, color: c0, boost: 2.0 },
      { yFrac: 0.70, freq: 1.2, speed: 0.050, amp: 0.060, phase: 2.0, color: c1, boost: 2.2 },
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
          const y = yBase + Math.sin((x / W) * Math.PI * 2 * band.freq + t * band.speed * Math.PI * 2 + linePhase) * band.amp * H;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.3})`; ctx.lineWidth = strokeW * 6;
        ctx.shadowColor = `rgba(${r},${g},${b},0.12)`; ctx.shadowBlur = 10; ctx.stroke();
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const y = yBase + Math.sin((x / W) * Math.PI * 2 * band.freq + t * band.speed * Math.PI * 2 + linePhase) * band.amp * H;
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

/* ── ThemeRipple ── */
function ThemeRipple({ active, origin, targetBg, onDone }: { active: boolean; origin: { x: number; y: number }; targetBg: string; onDone: () => void; }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const el = ref.current; if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReduced ? 400 : 1100;
    const easing   = prefersReduced ? 'ease' : 'cubic-bezier(0.22,1,0.36,1)';
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

/* ── OTP digit input ── */
function OtpInput({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: 'dark' | 'light'; }) {
  const isDark = theme === 'dark';
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            const next = (value + '      ').slice(0, 6).split('');
            next[i] = ch;
            onChange(next.join('').trimEnd());
            if (ch && i < 5) {
              const el = document.getElementById(`otp-digit-${i + 1}`);
              if (el) (el as HTMLInputElement).focus();
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              const el = document.getElementById(`otp-digit-${i - 1}`);
              if (el) (el as HTMLInputElement).focus();
              const next = value.slice(0, i - 1) + ' ' + value.slice(i);
              onChange(next.trimEnd());
            }
          }}
          onPaste={e => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            onChange(pasted);
            const el = document.getElementById(`otp-digit-${Math.min(pasted.length, 5)}`);
            if (el) (el as HTMLInputElement).focus();
          }}
          style={{
            width: 44, height: 50, borderRadius: 10, border: `1.5px solid ${isDark ? 'rgba(124,111,247,0.3)' : 'rgba(109,82,216,0.2)'}`,
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)',
            color: isDark ? '#fff' : '#1a1a2e',
            fontSize: '1.25rem', fontWeight: 700, textAlign: 'center',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#7c6ff7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,111,247,0.25)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(124,111,247,0.3)' : 'rgba(109,82,216,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      ))}
    </div>
  );
}

/* ── ResendTimer ── */
function ResendTimer({ onResend, theme }: { onResend: () => void; theme: 'dark' | 'light'; }) {
  const [secs, setSecs] = useState(60);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const isDark = theme === 'dark';
  if (secs > 0) {
    return <span style={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,30,60,0.45)' }}>Resend OTP in {secs}s</span>;
  }
  return (
    <button type="button" onClick={() => { setSecs(60); onResend(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: isDark ? '#a78bfa' : '#6d52d8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <RefreshCw style={{ width: 11, height: 11 }} /> Resend OTP
    </button>
  );
}

const LOGIN_THEME_KEY = 'expenseiq_login_theme';
const LAST_IDENTIFIER_KEY = 'expenseiq_last_identifier';

/* ── Main page ── */
export default function LoginPage() {
  const router = useRouter();
  const qc     = useQueryClient();

  useEffect(() => {
    if (isAuthEnabled() && getToken()) router.replace('/dashboard');
  }, [router]);

  const [loginTheme, setLoginTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(LOGIN_THEME_KEY) as 'dark' | 'light') ?? 'dark';
  });
  const tk = loginTheme === 'light' ? LIGHT_TOKENS : DARK_TOKENS;

  const [identifier, setIdentifier] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LAST_IDENTIFIER_KEY) ?? '';
  });

  const [capsLock, setCapsLock] = useState(false);
  function handleKeyEvent(e: React.KeyboardEvent) {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  }

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', loginTheme);
    if (!document.getElementById('feq-kf')) {
      const s = document.createElement('style'); s.id = 'feq-kf';
      s.textContent = FIELD_ERR_KEYFRAME; document.head.appendChild(s);
    }
  }, [loginTheme]);

  // Ripple
  const qRef     = useRef<HTMLSpanElement>(null);
  const rippling = useRef(false);
  const [ripple, setRipple] = useState<{ active: boolean; x: number; y: number; targetBg: string } | null>(null);
  const holdTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDblTap = useRef<number>(0);

  function fireThemeTransition() {
    if (rippling.current) return;
    rippling.current = true;
    const nextTheme = loginTheme === 'dark' ? 'light' : 'dark';
    const nextTk    = nextTheme === 'light' ? LIGHT_TOKENS : DARK_TOKENS;
    let x = window.innerWidth * 0.08, y = window.innerHeight * 0.12;
    if (qRef.current) { const r = qRef.current.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    setRipple({ active: true, x, y, targetBg: nextTk.bg });
  }
  function handleQDoubleClick() { fireThemeTransition(); }
  function handleQMouseDown() { holdTimer.current = setTimeout(fireThemeTransition, 800); }
  function cancelHold() { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } }
  function handleQTouchEnd(e: React.TouchEvent) {
    e.preventDefault(); const now = Date.now();
    if (now - lastDblTap.current < 350) { fireThemeTransition(); lastDblTap.current = 0; }
    else lastDblTap.current = now;
  }
  function handleRippleDone() {
    const next = loginTheme === 'dark' ? 'light' : 'dark';
    setLoginTheme(next); localStorage.setItem(LOGIN_THEME_KEY, next); setRipple(null); rippling.current = false;
  }

  // ── Views: login | register | forgot-1 | forgot-2 | forgot-3 | otp-login-1 | otp-login-2
  const [view, setView] = useState<'login' | 'register' | 'forgot-1' | 'forgot-2' | 'forgot-3' | 'otp-login-1' | 'otp-login-2'>('login');

  // OTP Login state
  const [otpLoginId,  setOtpLoginId]  = useState('');
  const [otpLoginCode, setOtpLoginCode] = useState('');

  // Login state
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Register state
  const [regEmail,   setRegEmail]   = useState('');
  const [regMobile,  setRegMobile]  = useState('');
  const [regName,    setRegName]    = useState('');
  const [regDob,     setRegDob]     = useState('');
  const [regPurpose, setRegPurpose] = useState('');
  const [regPw,      setRegPw]      = useState('');
  const [regCf,      setRegCf]      = useState('');
  const [showRegPw,  setShowRegPw]  = useState(false);
  const [showRegCf,  setShowRegCf]  = useState(false);
  const [touched,    setTouched]    = useState(false);

  // Forgot-password state
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpOtp,        setFpOtp]        = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpNewPw,      setFpNewPw]      = useState('');
  const [fpCfPw,       setFpCfPw]       = useState('');
  const [showFpPw,     setShowFpPw]     = useState(false);
  const [showFpCf,     setShowFpCf]     = useState(false);

  // Per-field errors
  const [fe, setFe] = useState<Record<string, string>>({});
  function fieldErr(key: string, msg: string) { setFe(p => ({ ...p, [key]: msg })); }
  function clearFe(key: string) { setFe(p => { const n = { ...p }; delete n[key]; return n; }); }

  // Tooltip
  const [tooltip, setTooltip] = useState<TooltipState>({ lines: [], x: 0, y: 0, visible: false });
  const dismissTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTooltip(el: HTMLElement, fieldKey: string) {
    const lines = FIELD_HINTS[fieldKey] ?? []; if (lines.length === 0) return;
    if (hideDelayTimer.current) { clearTimeout(hideDelayTimer.current); hideDelayTimer.current = null; }
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    const r = el.getBoundingClientRect();
    setTooltip({ lines, x: r.left + r.width / 2, y: r.top - 6, visible: true });
    dismissTimer.current = setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 2500);
  }
  function hideTooltip() {
    hideDelayTimer.current = setTimeout(() => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setTooltip(t => ({ ...t, visible: false }));
    }, 150);
  }

  const passedRules    = RULES.filter(r => r.test(regPw));
  const allRulesPassed = passedRules.length === RULES.length;
  const strength       = strengthInfo(passedRules.length);
  const regPwMatch     = regPw === regCf;

  const fpPassedRules    = RULES.filter(r => r.test(fpNewPw));
  const fpAllRulesPassed = fpPassedRules.length === RULES.length;
  const fpPwMatch        = fpNewPw === fpCfPw;

  function switchView(v: typeof view) {
    setError(''); setPassword(''); setRegPw(''); setRegCf('');
    setShowPw(false); setShowRegPw(false); setShowRegCf(false);
    setTouched(false); setFe({}); setFpOtp(''); setFpNewPw(''); setFpCfPw('');
    setOtpLoginCode('');
    setView(v);
  }

  /* ── OTP Login: Step 1 — send OTP ── */
  async function handleOtpLoginSend(ev: React.FormEvent) {
    ev.preventDefault();
    if (!otpLoginId.trim()) { fieldErr('otpLoginId', 'Enter your email or mobile number.'); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      await authApi.sendOtp({ identifier: otpLoginId.trim(), purpose: 'login' });
      setView('otp-login-2');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send OTP'); }
    finally { setLoading(false); }
  }

  async function handleOtpLoginResend() {
    try { await authApi.sendOtp({ identifier: otpLoginId.trim(), purpose: 'login' }); }
    catch { /* silent — ResendTimer UI handles feedback */ }
  }

  /* ── OTP Login: Step 2 — verify OTP → issue JWT ── */
  async function handleOtpLoginVerify(ev: React.FormEvent) {
    ev.preventDefault();
    if (otpLoginCode.replace(/\D/g, '').length < 6) { fieldErr('otpLoginCode', 'Enter all 6 digits.'); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      const res = await authApi.loginWithOtp({ identifier: otpLoginId.trim(), code: otpLoginCode.trim() });
      try { localStorage.setItem(LAST_IDENTIFIER_KEY, otpLoginId.trim()); } catch { /* ignore */ }
      setToken(res.token);
      setStoredUser({ id: res.user.id, email: res.user.email, name: res.user.name, dob: res.user.dob, purpose: res.user.purpose });
      qc.clear();
      const { api } = await import('@/lib/api/client');
      const { setActiveProfileId, clearActiveProfileId } = await import('@/lib/api/profile');
      clearActiveProfileId();
      const profiles = await api.getProfiles();
      if (profiles.length > 0) {
        const def = profiles.find(p => p.isDefault) ?? profiles[0];
        setActiveProfileId(def.profileId);
      }
      router.push('/dashboard');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Invalid or expired OTP'); }
    finally { setLoading(false); }
  }

  /* ── Login ── */
  async function afterLogin(ident: string, pw: string) {
    const res = await authApi.login({ identifier: ident, password: pw });
    try { localStorage.setItem(LAST_IDENTIFIER_KEY, ident); } catch { /* ignore */ }
    setToken(res.token);
    setStoredUser({ id: res.user.id, email: res.user.email, name: res.user.name, dob: res.user.dob, purpose: res.user.purpose });
    qc.clear();
    const { api } = await import('@/lib/api/client');
    const { setActiveProfileId, clearActiveProfileId } = await import('@/lib/api/profile');
    clearActiveProfileId();
    const profiles = await api.getProfiles();
    if (profiles.length > 0) {
      const def = profiles.find(p => p.isDefault) ?? profiles[0];
      setActiveProfileId(def.profileId);
    }
    router.push('/dashboard');
  }

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.loginIdentifier = 'Email or mobile number is required.';
    if (!password)           errs.loginPw         = 'Password is required.';
    if (Object.keys(errs).length) { setFe(errs); return; }
    setFe({}); setError(''); setLoading(true);
    try   { await afterLogin(identifier.trim(), password); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setLoading(false); }
  }

  /* ── Register ── */
  async function handleRegister(ev: React.FormEvent) {
    ev.preventDefault(); setTouched(true);
    const errs: Record<string, string> = {};
    if (!regName.trim()) errs.regName = 'Full name is required.';
    if (!regEmail.trim() && !regMobile.trim()) {
      errs.regEmail  = 'Email or mobile number is required.';
      errs.regMobile = 'Email or mobile number is required.';
    }
    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errs.regEmail = 'Enter a valid email address.';
    }
    if (regMobile.trim() && !looksLikeMobile(regMobile.trim())) {
      errs.regMobile = 'Enter a valid 10-digit mobile number.';
    }
    if (!regPurpose) errs.regPurpose = 'Please select a purpose.';
    if (!allRulesPassed) errs.regPw = 'Password does not meet all requirements.';
    if (!regPwMatch) errs.regCf = 'Passwords do not match.';
    if (Object.keys(errs).length) { setFe(errs); setError(''); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      await authApi.register({
        email:    regEmail.trim()  || undefined,
        mobile:   regMobile.trim() || undefined,
        password: regPw,
        name:     regName.trim(),
        dob:      regDob,
        purpose:  regPurpose,
      });
      // Auto-login after register
      await afterLogin(regEmail.trim() || regMobile.trim(), regPw);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  }

  /* ── Forgot-password Step 1: Send OTP ── */
  async function handleFpSendOtp(ev: React.FormEvent) {
    ev.preventDefault();
    if (!fpIdentifier.trim()) { fieldErr('fpIdentifier', 'Enter your email or mobile number.'); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      await authApi.sendOtp({ identifier: fpIdentifier.trim(), purpose: 'reset' });
      setView('forgot-2');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send OTP'); }
    finally { setLoading(false); }
  }

  async function handleFpResendOtp() {
    try { await authApi.sendOtp({ identifier: fpIdentifier.trim(), purpose: 'reset' }); }
    catch { /* silent — timer UI already gives feedback */ }
  }

  /* ── Forgot-password Step 2: Verify OTP ── */
  async function handleFpVerifyOtp(ev: React.FormEvent) {
    ev.preventDefault();
    if (fpOtp.replace(/\D/g, '').length < 6) { fieldErr('fpOtp', 'Enter all 6 digits of the OTP.'); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      const res = await authApi.verifyOtp({ identifier: fpIdentifier.trim(), code: fpOtp.trim(), purpose: 'reset' });
      setFpResetToken(res.resetToken ?? '');
      setView('forgot-3');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Invalid or expired OTP'); }
    finally { setLoading(false); }
  }

  /* ── Forgot-password Step 3: Reset password ── */
  async function handleFpReset(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!fpAllRulesPassed) errs.fpNewPw = 'Password does not meet all requirements.';
    if (!fpPwMatch) errs.fpCfPw = 'Passwords do not match.';
    if (Object.keys(errs).length) { setFe(errs); return; }
    setFe({}); setError(''); setLoading(true);
    try {
      await authApi.resetPassword({ resetToken: fpResetToken, newPassword: fpNewPw });
      // Auto-login with new password
      await afterLogin(fpIdentifier.trim(), fpNewPw);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reset password'); }
    finally { setLoading(false); }
  }

  /* ── Styles ── */
  const inp = 'w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50';

  const baseInpStyle = useMemo<React.CSSProperties>(() => ({
    background: tk.inpBg, borderColor: tk.inpBorder, color: tk.inpText,
    backdropFilter: tk.inpBlur, WebkitBackdropFilter: tk.inpBlur,
    boxShadow: loginTheme === 'light' ? 'inset 0 1px 3px rgba(0,0,0,0.06)' : 'none',
    transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
  }), [tk, loginTheme]);

  const inpStyle = useCallback((extra?: React.CSSProperties): React.CSSProperties => {
    if (!extra || Object.keys(extra).length === 0) return baseInpStyle;
    return { ...baseInpStyle, ...extra };
  }, [baseInpStyle]);

  const glowAStyle = useMemo<React.CSSProperties>(() => ({ position: 'absolute', top: '10%', left: '5%', width: '50vw', height: '50vw', borderRadius: '50%', background: `radial-gradient(circle, ${tk.glowA} 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.6s ease' }), [tk]);
  const glowBStyle = useMemo<React.CSSProperties>(() => ({ position: 'absolute', bottom: '5%', right: '10%', width: '35vw', height: '35vw', borderRadius: '50%', background: `radial-gradient(circle, ${tk.glowB} 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.6s ease' }), [tk]);
  const panelStyle = useMemo<React.CSSProperties>(() => ({ background: tk.cardBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${tk.cardBorder}`, borderRadius: 24, boxShadow: tk.cardShadow, padding: '2rem', width: '100%', minWidth: 'min(440px, 100vw)', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', transition: 'background 0.4s ease, border-color 0.4s ease' }), [tk]);

  const btn = 'w-full py-3 text-sm font-semibold rounded-xl transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20';

  const logoFontStyle = { fontSize: 'clamp(3rem, 8vw, 7rem)', fontFamily: 'var(--font-space-grotesk), system-ui', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 };

  /* ── Identifier type indicator for login field ── */
  const identifierIsMobile = identifier.trim() && looksLikeMobile(identifier.trim());

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: tk.bg, color: tk.color, transition: 'background 0.4s ease, color 0.4s ease' }}>
      <ValidationTooltip state={tooltip} theme={loginTheme} />
      {ripple && <ThemeRipple active={ripple.active} origin={{ x: ripple.x, y: ripple.y }} targetBg={ripple.targetBg} onDone={handleRippleDone} />}
      <WaveBackground tokens={tk} />

      {/* Glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div style={glowAStyle} />
        <div style={glowBStyle} />
      </div>

      {/* Logo */}
      <div className="absolute top-0 left-0 p-8 sm:p-12 z-10">
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span style={{ ...logoFontStyle, background: 'linear-gradient(135deg, #a78bfa 0%, #7c6ff7 40%, #5ee8b0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 32px rgba(124,111,247,0.4))' }}>Expense</span>
            <span style={{ ...logoFontStyle, background: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>I</span>
            <span ref={qRef} onDoubleClick={handleQDoubleClick} onMouseDown={handleQMouseDown} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchEnd={handleQTouchEnd}
              style={{ ...logoFontStyle, background: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' }}>Q</span>
          </div>
          <p style={{ fontSize: 'clamp(0.7rem, 1.5vw, 1rem)', color: tk.tracker, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'var(--font-space-grotesk)', transition: 'color 0.4s ease' }}>Intelligent Spend Tracker</p>
        </div>
        <div className="hidden lg:flex flex-col gap-4 mt-14">
          {['Zero blind spots — every rupee tracked in real time.', 'AI-grade insights. Human-grade clarity.', 'Cards, goals & budgets — one unified command centre.', 'Infinite profiles. One source of truth, always.'].map((line, i) => (
            <div key={i} className="flex items-center gap-3">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: i % 2 === 0 ? tk.taglineDot0 : tk.taglineDot1, boxShadow: i % 2 === 0 ? tk.dot0Shadow : tk.dot1Shadow, transition: 'background 0.4s ease' }} />
              <span style={{ fontSize: '0.875rem', color: tk.tagline, lineHeight: 1.5, transition: 'color 0.4s ease' }}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="absolute bottom-0 right-0 w-full sm:w-auto p-4 sm:p-8 sm:pb-12 sm:pr-12 z-10">
        <div style={panelStyle}>

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: tk.color, transition: 'color 0.4s ease' }}>Welcome back</h2>
                <p style={{ fontSize: '0.75rem', color: tk.subtitle, transition: 'color 0.4s ease' }}>Sign in with your email or mobile number</p>
              </div>
              <form onSubmit={handleLogin} noValidate className="space-y-3">
                {/* Identifier field */}
                <div>
                  <div className="relative">
                    <input
                      id="login-identifier"
                      type="text"
                      inputMode={identifierIsMobile ? 'numeric' : 'email'}
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); clearFe('loginIdentifier'); }}
                      onBlur={() => { if (!identifier.trim()) fieldErr('loginIdentifier', 'Email or mobile number is required.'); hideTooltip(); }}
                      onFocus={e => showTooltip(e.currentTarget, 'loginIdentifier')}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'loginIdentifier')}
                      onMouseLeave={hideTooltip}
                      placeholder="Email or mobile number"
                      autoFocus disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.loginIdentifier ? { borderColor: 'rgba(239,68,68,0.5)' } : {})}
                    />
                    {/* Icon indicating detected type */}
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, pointerEvents: 'none' }}>
                      {identifierIsMobile ? <Phone style={{ width: 14, height: 14 }} /> : <Mail style={{ width: 14, height: 14 }} />}
                    </span>
                  </div>
                  {fe.loginIdentifier && <FieldError msg={fe.loginIdentifier} theme={loginTheme} />}
                </div>

                {/* Password */}
                <div>
                  <div className="relative" onMouseEnter={e => showTooltip(e.currentTarget.querySelector('input')!, 'loginPw')} onMouseLeave={hideTooltip}>
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); clearFe('loginPw'); }}
                      onKeyUp={handleKeyEvent} onKeyDown={handleKeyEvent}
                      onBlur={() => { if (!password) fieldErr('loginPw', 'Password is required.'); hideTooltip(); }}
                      onFocus={e => showTooltip(e.currentTarget, 'loginPw')}
                      onMouseEnter={undefined} onMouseLeave={undefined}
                      placeholder="Password" disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.loginPw ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fe.loginPw && <FieldError msg={fe.loginPw} theme={loginTheme} />}
                  {capsLock && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '3px 2px 0', fontSize: '0.688rem', color: loginTheme === 'dark' ? 'rgba(251,191,36,0.85)' : 'rgba(161,121,0,0.9)' }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M6 1.5L9.5 5H7.5v3.5h-3V5H2.5L6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>
                      Caps Lock is on
                    </p>
                  )}
                  {/* Forgot password link */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button type="button" onClick={() => { setFpIdentifier(identifier); switchView('forgot-1'); }}
                      style={{ fontSize: '0.7rem', color: tk.linkColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
                      Forgot password?
                    </button>
                  </div>
                </div>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading} className={btn} style={{ color: '#fff' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: tk.cardBorder }} />
                <span style={{ fontSize: '0.65rem', color: tk.subtitle, whiteSpace: 'nowrap' }}>or</span>
                <div style={{ flex: 1, height: 1, background: tk.cardBorder }} />
              </div>

              {/* OTP login shortcut */}
              <button
                type="button"
                id="otp-login-btn"
                onClick={() => { setOtpLoginId(identifier); switchView('otp-login-1'); }}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600,
                  border: `1.5px solid ${tk.cardBorder}`, background: 'transparent',
                  color: tk.linkColor, cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = loginTheme === 'dark' ? 'rgba(124,111,247,0.08)' : 'rgba(109,82,216,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                Login with OTP
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: tk.subtitle, transition: 'color 0.4s ease' }}>
                No account?{' '}
                <button type="button" onClick={() => switchView('register')}
                  style={{ color: tk.linkColor, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ── OTP LOGIN — Step 1: Enter identifier ── */}
          {view === 'otp-login-1' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => switchView('login')}
                  style={{ color: tk.subtitle, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', transition: 'color 0.4s ease' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color, transition: 'color 0.4s ease' }}>Login with OTP</h2>
                  <p style={{ fontSize: '0.7rem', color: tk.subtitle, transition: 'color 0.4s ease' }}>We&apos;ll send a one-time code to your account</p>
                </div>
              </div>
              <form onSubmit={handleOtpLoginSend} noValidate className="space-y-3">
                <div>
                  <div className="relative">
                    <input
                      id="otp-login-identifier"
                      type="text"
                      inputMode={otpLoginId.trim() && looksLikeMobile(otpLoginId.trim()) ? 'numeric' : 'email'}
                      value={otpLoginId}
                      onChange={e => { setOtpLoginId(e.target.value); clearFe('otpLoginId'); }}
                      onFocus={e => showTooltip(e.currentTarget, 'otpLoginId')}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'otpLoginId')}
                      onMouseLeave={hideTooltip}
                      onBlur={() => { if (!otpLoginId.trim()) fieldErr('otpLoginId', 'Enter your email or mobile number.'); hideTooltip(); }}
                      placeholder="Email or mobile number"
                      autoFocus disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.otpLoginId ? { borderColor: 'rgba(239,68,68,0.5)' } : {})}
                    />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, pointerEvents: 'none' }}>
                      {otpLoginId.trim() && looksLikeMobile(otpLoginId.trim()) ? <Phone style={{ width: 14, height: 14 }} /> : <Mail style={{ width: 14, height: 14 }} />}
                    </span>
                  </div>
                  {fe.otpLoginId && <FieldError msg={fe.otpLoginId} theme={loginTheme} />}
                </div>

                {/* Dev notice */}
                <p style={{ fontSize: '0.65rem', color: tk.subtitle, textAlign: 'center', lineHeight: 1.5 }}>
                  📋 OTP will be printed to the server console (no SMS/email in dev mode)
                </p>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading} className={btn} style={{ color: '#fff' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : 'Send OTP'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', color: tk.subtitle }}>
                Have a password?{' '}
                <button type="button" onClick={() => switchView('login')}
                  style={{ color: tk.linkColor, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  Sign in with password
                </button>
              </p>
            </div>
          )}

          {/* ── OTP LOGIN — Step 2: Enter OTP ── */}
          {view === 'otp-login-2' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => switchView('otp-login-1')}
                  style={{ color: tk.subtitle, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color }}>Enter OTP</h2>
                  <p style={{ fontSize: '0.7rem', color: tk.subtitle }}>
                    Code sent to <span style={{ color: tk.color, fontWeight: 600 }}>{otpLoginId}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleOtpLoginVerify} noValidate className="space-y-5">
                <OtpInput value={otpLoginCode} onChange={v => { setOtpLoginCode(v); clearFe('otpLoginCode'); }} theme={loginTheme} />
                {fe.otpLoginCode && <FieldError msg={fe.otpLoginCode} theme={loginTheme} />}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ResendTimer onResend={handleOtpLoginResend} theme={loginTheme} />
                </div>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button
                  type="submit"
                  disabled={loading || otpLoginCode.replace(/\D/g, '').length < 6}
                  className={btn}
                  style={{ color: '#fff' }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify & Sign In'}
                </button>
              </form>
            </div>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => switchView('login')}
                  style={{ color: tk.subtitle, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', transition: 'color 0.4s ease' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color, transition: 'color 0.4s ease' }}>Create account</h2>
                  <p style={{ fontSize: '0.7rem', color: tk.subtitle, transition: 'color 0.4s ease' }}>At least email or mobile is required</p>
                </div>
              </div>

              <form onSubmit={handleRegister} noValidate className="space-y-3">
                {/* Name */}
                <div>
                  <input type="text" value={regName} onChange={e => { setRegName(e.target.value); clearFe('regName'); }}
                    onBlur={() => { if (!regName.trim()) fieldErr('regName', 'Full name is required.'); hideTooltip(); }}
                    onFocus={e => showTooltip(e.currentTarget, 'regName')}
                    onMouseEnter={e => showTooltip(e.currentTarget, 'regName')} onMouseLeave={hideTooltip}
                    placeholder="Full Name" className={inp}
                    style={inpStyle(fe.regName ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                  {fe.regName && <FieldError msg={fe.regName} theme={loginTheme} />}
                </div>

                {/* Email */}
                <div>
                  <div className="relative">
                    <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); clearFe('regEmail'); clearFe('regMobile'); }}
                      onBlur={hideTooltip}
                      onFocus={e => showTooltip(e.currentTarget, 'regEmail')}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'regEmail')} onMouseLeave={hideTooltip}
                      placeholder="Email address (optional if mobile provided)"
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.regEmail ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, pointerEvents: 'none' }}>
                      <Mail style={{ width: 14, height: 14 }} />
                    </span>
                  </div>
                  {fe.regEmail && <FieldError msg={fe.regEmail} theme={loginTheme} />}
                </div>

                {/* Mobile */}
                <div>
                  <div className="relative">
                    <input type="tel" value={regMobile} onChange={e => { setRegMobile(e.target.value.replace(/[^\d+\s-]/g, '')); clearFe('regMobile'); clearFe('regEmail'); }}
                      onBlur={hideTooltip}
                      onFocus={e => showTooltip(e.currentTarget, 'regMobile')}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'regMobile')} onMouseLeave={hideTooltip}
                      placeholder="Mobile number (optional if email provided)"
                      inputMode="tel" maxLength={15}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.regMobile ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, pointerEvents: 'none' }}>
                      <Phone style={{ width: 14, height: 14 }} />
                    </span>
                  </div>
                  {fe.regMobile && <FieldError msg={fe.regMobile} theme={loginTheme} />}
                  {!fe.regEmail && !fe.regMobile && !regEmail.trim() && !regMobile.trim() && touched && (
                    <FieldError msg="Enter at least an email address or mobile number." theme={loginTheme} />
                  )}
                </div>

                {/* DOB + Purpose */}
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)}
                    className={inp} style={inpStyle({ colorScheme: loginTheme as 'dark' | 'light' })} />
                  <div>
                    <select value={regPurpose} onChange={e => { setRegPurpose(e.target.value); clearFe('regPurpose'); }}
                      onFocus={e => showTooltip(e.currentTarget, 'regPurpose')} onBlur={hideTooltip}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'regPurpose')} onMouseLeave={hideTooltip}
                      className={`${inp} appearance-none`}
                      style={inpStyle({ colorScheme: loginTheme as 'dark' | 'light', ...(fe.regPurpose ? { borderColor: 'rgba(239,68,68,0.5)' } : {}) })}>
                      <option value="" style={{ background: loginTheme === 'dark' ? '#1a1b26' : '#f5f3ee' }}>Purpose...</option>
                      {PURPOSES.map(p => <option key={p.value} value={p.value} style={{ background: loginTheme === 'dark' ? '#1a1b26' : '#f5f3ee' }}>{p.label}</option>)}
                    </select>
                    {fe.regPurpose && <FieldError msg={fe.regPurpose} theme={loginTheme} />}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="relative" onMouseEnter={e => showTooltip(e.currentTarget.querySelector('input')!, 'regPw')} onMouseLeave={hideTooltip}>
                    <input type={showRegPw ? 'text' : 'password'} value={regPw}
                      onChange={e => { setRegPw(e.target.value); setTouched(true); clearFe('regPw'); }}
                      onBlur={hideTooltip} onFocus={e => showTooltip(e.currentTarget, 'regPw')}
                      onMouseEnter={undefined} onMouseLeave={undefined}
                      placeholder="Create password" className={`${inp} pr-11`}
                      style={inpStyle(fe.regPw ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <button type="button" onClick={() => setShowRegPw(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fe.regPw && <FieldError msg={fe.regPw} theme={loginTheme} />}
                  {regPw.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: strength.w, height: '100%', background: strength.color, borderRadius: 4, transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: strength.color, fontWeight: 600, minWidth: 60 }}>{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {RULES.map(r => {
                          const ok = r.test(regPw);
                          return (
                            <div key={r.id} className="flex items-center gap-1.5">
                              {ok ? <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#22c55e' }} />
                                  : <X    className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />}
                              <span style={{ fontSize: '0.65rem', color: ok ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{r.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <div className="relative" onMouseEnter={e => showTooltip(e.currentTarget.querySelector('input')!, 'regCf')} onMouseLeave={hideTooltip}>
                    <input type={showRegCf ? 'text' : 'password'} value={regCf}
                      onChange={e => { setRegCf(e.target.value); clearFe('regCf'); }}
                      onBlur={hideTooltip} onFocus={e => showTooltip(e.currentTarget, 'regCf')}
                      onMouseEnter={undefined} onMouseLeave={undefined}
                      placeholder="Confirm password" className={`${inp} pr-11`}
                      style={inpStyle(fe.regCf ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <button type="button" onClick={() => setShowRegCf(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showRegCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fe.regCf && <FieldError msg={fe.regCf} theme={loginTheme} />}
                </div>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading} className={btn} style={{ color: '#fff' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', color: tk.subtitle, transition: 'color 0.4s ease' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => switchView('login')}
                  style={{ color: tk.linkColor, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── FORGOT-1: Enter identifier ── */}
          {view === 'forgot-1' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => switchView('login')}
                  style={{ color: tk.subtitle, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color }}>Reset password</h2>
                  <p style={{ fontSize: '0.7rem', color: tk.subtitle }}>We'll send a one-time code to your account</p>
                </div>
              </div>
              <form onSubmit={handleFpSendOtp} noValidate className="space-y-3">
                <div>
                  <div className="relative">
                    <input id="fp-identifier" type="text" value={fpIdentifier}
                      onChange={e => { setFpIdentifier(e.target.value); clearFe('fpIdentifier'); }}
                      onFocus={e => showTooltip(e.currentTarget, 'forgotIdentifier')}
                      onMouseEnter={e => showTooltip(e.currentTarget, 'forgotIdentifier')} onMouseLeave={hideTooltip}
                      onBlur={hideTooltip}
                      placeholder="Email or mobile number"
                      autoFocus disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.fpIdentifier ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, pointerEvents: 'none' }}>
                      {fpIdentifier.trim() && looksLikeMobile(fpIdentifier.trim())
                        ? <Phone style={{ width: 14, height: 14 }} />
                        : <Mail style={{ width: 14, height: 14 }} />}
                    </span>
                  </div>
                  {fe.fpIdentifier && <FieldError msg={fe.fpIdentifier} theme={loginTheme} />}
                </div>
                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading} className={btn} style={{ color: '#fff' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : 'Send OTP'}
                </button>
              </form>
            </div>
          )}

          {/* ── FORGOT-2: Enter OTP ── */}
          {view === 'forgot-2' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => switchView('forgot-1')}
                  style={{ color: tk.subtitle, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex' }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color }}>Enter OTP</h2>
                  <p style={{ fontSize: '0.7rem', color: tk.subtitle }}>
                    Code sent to <span style={{ color: tk.color, fontWeight: 600 }}>{fpIdentifier}</span> (check server console)
                  </p>
                </div>
              </div>

              <form onSubmit={handleFpVerifyOtp} noValidate className="space-y-5">
                <OtpInput value={fpOtp} onChange={setFpOtp} theme={loginTheme} />
                {fe.fpOtp && <FieldError msg={fe.fpOtp} theme={loginTheme} />}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ResendTimer onResend={handleFpResendOtp} theme={loginTheme} />
                </div>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading || fpOtp.replace(/\D/g, '').length < 6} className={btn} style={{ color: '#fff' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify OTP'}
                </button>
              </form>
            </div>
          )}

          {/* ── FORGOT-3: Set new password ── */}
          {view === 'forgot-3' && (
            <div className="space-y-5">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Check style={{ width: 16, height: 16, color: '#22c55e' }} />
                  <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>OTP verified successfully</span>
                </div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: tk.color }}>Set new password</h2>
                <p style={{ fontSize: '0.7rem', color: tk.subtitle }}>Choose a strong password for your account</p>
              </div>

              <form onSubmit={handleFpReset} noValidate className="space-y-3">
                {/* New password */}
                <div className="space-y-1.5">
                  <div className="relative" onMouseEnter={e => showTooltip(e.currentTarget.querySelector('input')!, 'forgotNewPw')} onMouseLeave={hideTooltip}>
                    <input type={showFpPw ? 'text' : 'password'} value={fpNewPw}
                      onChange={e => { setFpNewPw(e.target.value); clearFe('fpNewPw'); }}
                      onBlur={hideTooltip} onFocus={e => showTooltip(e.currentTarget, 'forgotNewPw')}
                      onMouseEnter={undefined} onMouseLeave={undefined}
                      placeholder="New password" disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.fpNewPw ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <button type="button" onClick={() => setShowFpPw(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showFpPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fe.fpNewPw && <FieldError msg={fe.fpNewPw} theme={loginTheme} />}
                  {fpNewPw.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: strengthInfo(fpPassedRules.length).w, height: '100%', background: strengthInfo(fpPassedRules.length).color, borderRadius: 4, transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: strengthInfo(fpPassedRules.length).color, fontWeight: 600, minWidth: 60 }}>{strengthInfo(fpPassedRules.length).label}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {RULES.map(r => {
                          const ok = r.test(fpNewPw);
                          return (
                            <div key={r.id} className="flex items-center gap-1.5">
                              {ok ? <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#22c55e' }} />
                                  : <X    className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />}
                              <span style={{ fontSize: '0.65rem', color: ok ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{r.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="space-y-1">
                  <div className="relative" onMouseEnter={e => showTooltip(e.currentTarget.querySelector('input')!, 'forgotCfPw')} onMouseLeave={hideTooltip}>
                    <input type={showFpCf ? 'text' : 'password'} value={fpCfPw}
                      onChange={e => { setFpCfPw(e.target.value); clearFe('fpCfPw'); }}
                      onBlur={hideTooltip} onFocus={e => showTooltip(e.currentTarget, 'forgotCfPw')}
                      onMouseEnter={undefined} onMouseLeave={undefined}
                      placeholder="Confirm new password" disabled={loading}
                      className={`${inp} pr-11`}
                      style={inpStyle(fe.fpCfPw ? { borderColor: 'rgba(239,68,68,0.5)' } : {})} />
                    <button type="button" onClick={() => setShowFpCf(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: tk.inpPh, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showFpCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fe.fpCfPw && <FieldError msg={fe.fpCfPw} theme={loginTheme} />}
                  {fpCfPw.length > 0 && fpPwMatch && <SuccessNote msg="Passwords match" theme={loginTheme} />}
                </div>

                {error && <FieldError msg={error} theme={loginTheme} />}
                <button type="submit" disabled={loading || !fpAllRulesPassed || !fpPwMatch} className={btn} style={{ color: '#fff' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Resetting...
                    </span>
                  ) : 'Reset Password & Sign In'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
