import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError } from '../components/FormElements';

export function LoginForm({
  theme,
  onSwitchView,
  showTooltip,
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
  const inpBase = "w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50";
  const inpStyle = {
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.45)',
    borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,120,160,0.12)',
    color: isDark ? '#ffffff' : '#1a1a2e',
    boxShadow: !isDark ? 'inset 0 1px 3px rgba(0,0,0,0.06)' : 'none',
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4" noValidate>
      <div>
        <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>Email or Mobile</label>
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
        <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>Password</label>
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
          <button type="button" onClick={() => onSwitchView('forgot-password')} className="text-xs font-medium hover:underline cursor-pointer" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>Forgot password?</button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 cursor-pointer"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
        <span className="flex-shrink-0 mx-4 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>or continue with</span>
        <div className="flex-grow border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
      </div>

      <button
        type="button"
        onClick={() => onSwitchView('passwordless-login')}
        disabled={loading}
        className="w-full py-3 text-sm font-semibold rounded-xl transition-all duration-200"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          color: isDark ? '#fff' : '#1a1a2e'
        }}
      >
        Login with OTP
      </button>

      <p className="text-center text-sm mt-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={() => onSwitchView('register')} className="font-semibold hover:underline" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>
          Create one now
        </button>
      </p>
    </form>
  );
}
