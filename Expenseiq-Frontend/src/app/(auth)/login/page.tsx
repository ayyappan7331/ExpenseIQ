'use client';

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthEnabled, getToken } from '@/lib/api/token';

import { ViewState, TooltipState } from './types';
import { DARK_TOKENS, LIGHT_TOKENS, LOGIN_THEME_KEY } from './constants';
import { FIELD_HINTS, FIELD_ERR_KEYFRAME, ValidationTooltip } from './components/FormElements';
import { WaveBackground } from './components/WaveBackground';
import { ThemeRipple } from './components/ThemeRipple';

import { LoginForm } from './forms/LoginForm';
import { RegisterForm } from './forms/RegisterForm';
import { ForgotPasswordForm } from './forms/ForgotPasswordForm';
import { PasswordlessLoginForm } from './forms/PasswordlessLoginForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthEnabled() && getToken()) router.replace('/dashboard');
  }, [router]);

  const [loginTheme, setLoginTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem(LOGIN_THEME_KEY) as 'dark' | 'light') ?? 'light';
  });
  const tk = loginTheme === 'light' ? LIGHT_TOKENS : DARK_TOKENS;

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', loginTheme);
    if (!document.getElementById('feq-kf')) {
      const s = document.createElement('style'); s.id = 'feq-kf';
      s.textContent = FIELD_ERR_KEYFRAME; document.head.appendChild(s);
    }
  }, [loginTheme]);

  // Ripple
  const qRef = useRef<HTMLSpanElement>(null);
  const rippling = useRef(false);
  const [ripple, setRipple] = useState<{ active: boolean; x: number; y: number; targetBg: string } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDblTap = useRef<number>(0);

  function fireThemeTransition() {
    if (rippling.current) return;
    rippling.current = true;
    const nextTheme = loginTheme === 'dark' ? 'light' : 'dark';
    const nextTk = nextTheme === 'light' ? LIGHT_TOKENS : DARK_TOKENS;
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

  // State shared across forms
  const [view, setView] = useState<ViewState>('passwordless-login');
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tooltip
  const [tooltip, setTooltip] = useState<TooltipState>({ lines: [], x: 0, y: 0, visible: false });
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function handleSwitchView(v: ViewState) {
    setError('');
    setFieldErrs({});
    setView(v);
  }

  const glowAStyle = useMemo<React.CSSProperties>(() => ({ position: 'absolute', top: '10%', left: '5%', width: '50vw', height: '50vw', borderRadius: '50%', background: `radial-gradient(circle, ${tk.glowA} 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.6s ease' }), [tk]);
  const glowBStyle = useMemo<React.CSSProperties>(() => ({ position: 'absolute', bottom: '5%', right: '10%', width: '35vw', height: '35vw', borderRadius: '50%', background: `radial-gradient(circle, ${tk.glowB} 0%, transparent 70%)`, filter: 'blur(60px)', transition: 'background 0.6s ease' }), [tk]);
  const panelStyle = useMemo<React.CSSProperties>(() => ({ 
    background: loginTheme === 'dark' ? 'rgba(15, 15, 20, 0.4)' : 'rgba(255, 255, 255, 0.65)', 
    backdropFilter: 'blur(40px)', 
    WebkitBackdropFilter: 'blur(40px)', 
    border: `1px solid ${loginTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)'}`, 
    borderRadius: 28, 
    boxShadow: `
      0 40px 80px -20px rgba(0,0,0,0.4), 
      0 0 0 1px ${loginTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'},
      inset 0 1px 0 ${loginTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)'},
      inset 0 0 20px ${loginTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)'}
    `, 
    padding: '2rem', 
    width: '100%', 
    maxWidth: 400, 
    maxHeight: '90vh', 
    overflowY: 'auto', 
    transition: 'background 0.4s ease, border-color 0.4s ease',
    position: 'relative',
    zIndex: 30
  }), [tk, loginTheme]);

  const logoFontStyle = { fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontFamily: 'var(--font-space-grotesk), system-ui', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 };

  const formProps = {
    theme: loginTheme,
    onSwitchView: handleSwitchView,
    showTooltip,
    hideTooltip,
    fieldErrs,
    setFieldErrs,
    setError,
    setLoading,
    loading
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: tk.bg, color: tk.color, transition: 'background 0.4s ease, color 0.4s ease' }}>
      <ValidationTooltip state={tooltip} theme={loginTheme} />
      {ripple && <ThemeRipple active={ripple.active} origin={{ x: ripple.x, y: ripple.y }} targetBg={ripple.targetBg} onDone={handleRippleDone} />}
      <WaveBackground tokens={tk} />

      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div style={glowAStyle} />
        <div style={glowBStyle} />
      </div>

      <div className="relative min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2 z-20">
        
        {/* Left Side: Branding */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-20 order-1 lg:order-1 lg:h-full mt-[5vh] lg:mt-0">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-baseline gap-1">
              <span style={{ ...logoFontStyle, background: 'linear-gradient(135deg, #a78bfa 0%, #7c6ff7 40%, #5ee8b0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 24px rgba(124,111,247,0.3))' }}>Expense</span>
              <span style={{ ...logoFontStyle, background: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>I</span>
              <span ref={qRef} onDoubleClick={handleQDoubleClick} onMouseDown={handleQMouseDown} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchEnd={handleQTouchEnd}
                style={{ ...logoFontStyle, background: 'linear-gradient(135deg,#5ee8b0 0%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' }}>Q</span>
            </div>
            <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1.1rem)', color: tk.tracker, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-space-grotesk)', transition: 'color 0.4s ease' }} className="font-medium">Intelligent Spend Tracker</p>
          </div>
          
          <div className="hidden lg:flex flex-col gap-6 mt-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-500/10 backdrop-blur-md border border-violet-500/20" style={{ boxShadow: tk.dot0Shadow, transition: 'box-shadow 0.4s ease' }}>
                <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.8)]" style={{ background: tk.taglineDot0, transition: 'background 0.4s ease' }} />
              </div>
              <span style={{ color: tk.subtitle, transition: 'color 0.4s ease' }} className="text-lg font-medium tracking-wide">Sync everywhere</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20" style={{ boxShadow: tk.dot1Shadow, transition: 'box-shadow 0.4s ease' }}>
                <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" style={{ background: tk.taglineDot1, transition: 'background 0.4s ease' }} />
              </div>
              <span style={{ color: tk.subtitle, transition: 'color 0.4s ease' }} className="text-lg font-medium tracking-wide">Zero config</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 order-2 lg:order-2 flex-grow relative">
          
          {/* Soft background radial gradient for the entire right side to separate depth */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, rgba(255,255,255, ${loginTheme === 'dark' ? 0.02 : 0.15}) 0%, transparent 70%)` }} aria-hidden />

          {/* Layered ambient glows immediately behind the card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[800px] rounded-full pointer-events-none opacity-20 mix-blend-screen" style={{ background: `radial-gradient(circle, ${tk.glowB} 0%, transparent 70%)`, filter: 'blur(100px)' }} aria-hidden />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[500px] rounded-full pointer-events-none opacity-50 mix-blend-screen" style={{ background: `radial-gradient(circle, ${tk.glowA} 0%, transparent 50%)`, filter: 'blur(60px)' }} aria-hidden />

          <div style={panelStyle} className="animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-700 ease-out">
            <div className="mb-10 space-y-1.5">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
                {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Create Account' : view === 'forgot-password' ? 'Reset Password' : 'Sign in securely'}
              </h2>
              <p className="text-sm font-medium tracking-wide" style={{ color: tk.tagline, transition: 'color 0.4s ease' }}>
                {view === 'login' ? 'Enter your details to access your dashboard.' : view === 'register' ? 'Set up your ExpenseIQ profile.' : view === 'forgot-password' ? 'We\'ll help you get back in.' : 'Receive a one-time code to sign in instantly.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl text-sm font-medium border bg-red-500/10 border-red-500/20 text-red-500 animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            {view === 'login' && <LoginForm {...formProps} />}
            {view === 'register' && <RegisterForm {...formProps} />}
            {view === 'forgot-password' && <ForgotPasswordForm {...formProps} />}
            {view === 'passwordless-login' && <PasswordlessLoginForm {...formProps} />}
          </div>
        </div>

      </div>
    </div>
  );
}
