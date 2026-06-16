import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError, PremiumButton, FloatingInput } from '../components/FormElements';

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
  const [success, setSuccess] = useState(false);

  function handleKeyEvent(e: React.KeyboardEvent) {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  }

  async function afterLogin(ident: string, pw: string) {
    const res = await authApi.login({ identifier: ident, password: pw });
    try { localStorage.setItem('expenseiq_last_identifier', ident); } catch { /* ignore */ }
    setToken(res.token);
    setStoredUser({ id: res.user.id, email: res.user.email, name: res.user.name, dob: res.user.dob, purpose: res.user.purpose });
    qc.clear();
    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 1500);
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
      setLoading(false);
    }
  }

  const isDark = theme === 'dark';

  return (
    <form onSubmit={handleLogin} className="space-y-4" noValidate>
      <div>
        <FloatingInput
          label="Email or Mobile"
          type="text"
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.loginIdentifier; return n; }); }}
          onBlur={hideTooltip}
          placeholder=" "
          autoComplete="username"
          disabled={loading}
          theme={theme}
          error={!!fieldErrs.loginIdentifier}
        />
        {fieldErrs.loginIdentifier && <FieldError msg={fieldErrs.loginIdentifier} theme={theme} />}
      </div>
      <div>
        <FloatingInput
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.loginPw; return n; }); }}
          onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
          onBlur={hideTooltip}
          placeholder=" "
          autoComplete="current-password"
          disabled={loading}
          theme={theme}
          error={!!fieldErrs.loginPw}
        >
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" tabIndex={-1}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </FloatingInput>
        {capsLock && <p className="text-xs text-orange-400 mt-1 ml-1">Caps Lock is ON</p>}
        {fieldErrs.loginPw && <FieldError msg={fieldErrs.loginPw} theme={theme} />}
        
        <div className="flex justify-end mt-2">
          <button type="button" onClick={() => onSwitchView('forgot-password')} className="text-sm font-medium hover:underline cursor-pointer" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>Forgot password?</button>
        </div>
      </div>

      <PremiumButton loading={loading} success={success} text="Sign In" loadingText="Signing in..." />

      <p className="text-center text-sm mt-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={() => onSwitchView('register')} className="font-semibold hover:underline cursor-pointer" style={{ color: isDark ? '#a78bfa' : '#6d52d8' }}>
          Create one now
        </button>
      </p>
    </form>
  );
}
