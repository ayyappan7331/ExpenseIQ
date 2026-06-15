import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError } from '../components/FormElements';

export function LoginForm({
  theme,
  onSwitchView,
  hideTooltip,
  fieldErrs,
  setFieldErrs,
  setError,
  setLoading,
  loading,
}: SharedFormProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function handleKeyEvent(e: React.KeyboardEvent) {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  }

  async function afterLogin(ident: string, pw: string) {
    const res = await authApi.login({ identifier: ident, password: pw });
    try { localStorage.setItem('expenseiq_last_identifier', ident); } catch { /* ignore */ }
    setToken(res.token);
    setStoredUser({ id: res.user.id, email: res.user.email, name: res.user.name, dob: res.user.dob, purpose: res.user.purpose });
    qc.clear();
    // Profile logic removed
    router.push('/dashboard');
  }

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.loginIdentifier = 'Email or mobile number is required.';
    if (!password) errs.loginPw = 'Password is required.';
    if (Object.keys(errs).length) { setFieldErrs(errs); return; }
    
    setFieldErrs({}); setError(''); setLoading(true);
    try { 
      await afterLogin(identifier.trim(), password); 
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : 'Login failed'); 
    } finally { 
      setLoading(false); 
    }
  }

  const isDark = theme === 'dark';
  const inpBase = "w-full px-4 py-3.5 text-sm rounded-2xl border transition-all duration-300 ease-out focus:outline-none focus:ring-[3px] focus:ring-violet-500/20 focus:border-violet-500/60";
  const inpStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    color: isDark ? '#ffffff' : '#1a1a2e',
    boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Email or Mobile</label>
        <input
          type="text"
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.loginIdentifier; return n; }); }}
          onBlur={hideTooltip}
          className={inpBase}
          style={inpStyle}
          placeholder="Enter your email or mobile"
          autoComplete="username"
          disabled={loading}
        />
        {fieldErrs.loginIdentifier && <FieldError msg={fieldErrs.loginIdentifier} theme={theme} />}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.loginPw; return n; }); }}
            onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
            onBlur={hideTooltip}
            className={inpBase}
            style={inpStyle}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" tabIndex={-1}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {capsLock && <p className="text-xs text-orange-400 mt-1 ml-1">Caps Lock is ON</p>}
        {fieldErrs.loginPw && <FieldError msg={fieldErrs.loginPw} theme={theme} />}
        
        <div className="flex justify-end mt-2">
          <button type="button" onClick={() => onSwitchView('forgot-password')} className="text-sm font-medium hover:underline cursor-pointer" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>Forgot password?</button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="relative w-full py-3.5 mt-4 text-sm font-semibold rounded-2xl text-white transition-all duration-300 ease-out hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          boxShadow: '0 8px 20px -8px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
        }}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
        <span className="flex-shrink-0 mx-4 text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>or continue with</span>
        <div className="flex-grow border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
      </div>

      <button
        type="button"
        onClick={() => onSwitchView('passwordless-login')}
        disabled={loading}
        className="w-full py-3.5 text-sm font-medium rounded-2xl transition-all duration-300 ease-out hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.98] cursor-pointer"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          color: isDark ? '#fff' : '#1a1a2e',
          boxShadow: '0 4px 12px -4px rgba(0,0,0,0.1)'
        }}
      >
        Login with OTP
      </button>

      <p className="text-center text-sm mt-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={() => onSwitchView('register')} className="font-semibold hover:underline cursor-pointer" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>
          Create one now
        </button>
      </p>
    </form>
  );
}
