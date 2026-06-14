import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError } from '../components/FormElements';
import { OtpInput } from '../components/OtpInput';
import { ResendTimer } from '../components/ResendTimer';

const RULES = [
  { id: 'len',     label: 'Min 8 characters',     test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Uppercase (A–Z)',        test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Lowercase (a–z)',        test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit',   label: 'Number (0–9)',            test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Special char (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function strengthInfo(passed: number) {
  if (passed <= 1) return { label: 'Weak',       color: '#ef4444', w: '20%' };
  if (passed === 2) return { label: 'Fair',       color: '#f59e0b', w: '40%' };
  if (passed === 3) return { label: 'Good',       color: '#f59e0b', w: '60%' };
  if (passed === 4) return { label: 'Strong',     color: '#22c55e', w: '80%' };
  return               { label: 'Very Strong', color: '#22c55e', w: '100%' };
}

export function ForgotPasswordForm({
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

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Forgot-password state
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpCfPw, setFpCfPw] = useState('');
  const [showFpPw, setShowFpPw] = useState(false);
  const [showFpCf, setShowFpCf] = useState(false);
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

  const fpPassedRules = RULES.filter(r => r.test(fpNewPw));
  const fpAllRulesPassed = fpPassedRules.length === RULES.length;
  const fpPwMatch = fpNewPw === fpCfPw;
  const strength = strengthInfo(fpPassedRules.length);

  async function handleFpSendOtp(ev: React.FormEvent) {
    ev.preventDefault();
    if (!fpIdentifier.trim()) { setFieldErrs({ fpIdentifier: 'Enter your email or mobile number.' }); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      await authApi.sendOtp({ identifier: fpIdentifier.trim(), purpose: 'reset' });
      setStep(2);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send OTP'); }
    finally { setLoading(false); }
  }

  async function handleFpResendOtp() {
    try { await authApi.sendOtp({ identifier: fpIdentifier.trim(), purpose: 'reset' }); }
    catch { /* silent — timer UI already gives feedback */ }
  }

  async function handleFpVerifyOtp(ev: React.FormEvent) {
    ev.preventDefault();
    if (fpOtp.replace(/\D/g, '').length < 6) { setFieldErrs({ fpOtp: 'Enter all 6 digits of the OTP.' }); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      const res = await authApi.verifyOtp({ identifier: fpIdentifier.trim(), code: fpOtp.trim(), purpose: 'reset' });
      setFpResetToken(res.resetToken ?? '');
      setStep(3);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Invalid or expired OTP'); }
    finally { setLoading(false); }
  }

  async function handleFpReset(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!fpAllRulesPassed) errs.fpNewPw = 'Password does not meet all requirements.';
    if (!fpPwMatch) errs.fpCfPw = 'Passwords do not match.';
    if (Object.keys(errs).length) { setFieldErrs(errs); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      await authApi.resetPassword({ resetToken: fpResetToken, newPassword: fpNewPw });
      await afterLogin(fpIdentifier.trim(), fpNewPw);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reset password'); }
    finally { setLoading(false); }
  }

  const isDark = theme === 'dark';
  const inpBase = "w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50";
  const inpStyle = {
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.45)',
    borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,120,160,0.12)',
    color: isDark ? '#ffffff' : '#1a1a2e',
    boxShadow: !isDark ? 'inset 0 1px 3px rgba(0,0,0,0.06)' : 'none',
  };

  if (step === 1) {
    return (
      <>
        <button type="button" onClick={() => onSwitchView('login')} className="mb-6 flex items-center gap-2 text-sm font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} /> Back to Login
        </button>
        <p className="text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>Enter the email address or mobile number associated with your account, and we&apos;ll send you a link to reset your password.</p>
        <form onSubmit={handleFpSendOtp} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>Account Identifier</label>
            <input
              type="text" value={fpIdentifier}
              onChange={e => { setFpIdentifier(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.fpIdentifier; return n; }); }}
              onFocus={e => showTooltip(e.currentTarget, 'forgotIdentifier')} onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="Email or Mobile Number" disabled={loading}
            />
            {fieldErrs.fpIdentifier && <FieldError msg={fieldErrs.fpIdentifier} theme={theme} />}
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20">
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <button type="button" onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-sm font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} /> Change Identifier
        </button>
        <p className="text-sm mb-6 text-center" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
          We sent a 6-digit code to <br/><strong style={{ color: isDark ? '#fff' : '#000' }}>{fpIdentifier}</strong>
        </p>
        <form onSubmit={handleFpVerifyOtp} className="space-y-6" noValidate>
          <div>
            <div onFocus={e => showTooltip(e.currentTarget, 'forgotOtp')} onBlur={hideTooltip}>
              <OtpInput value={fpOtp} onChange={v => { setFpOtp(v); setFieldErrs(p => { const n = { ...p }; delete n.fpOtp; return n; }); }} theme={theme} />
            </div>
            {fieldErrs.fpOtp && <div className="flex justify-center mt-2"><FieldError msg={fieldErrs.fpOtp} theme={theme} /></div>}
            <div className="flex justify-center mt-4">
              <ResendTimer onResend={handleFpResendOtp} theme={theme} />
            </div>
          </div>
          <button type="submit" disabled={loading || fpOtp.replace(/\D/g, '').length < 6} className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20">
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>Your code was verified. You can now securely reset your password.</p>
      <form onSubmit={handleFpReset} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>New Password</label>
          <div className="relative">
            <input
              type={showFpPw ? 'text' : 'password'} value={fpNewPw}
              onChange={e => { setFpNewPw(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.fpNewPw; return n; }); }}
              onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
              onFocus={e => showTooltip(e.currentTarget, 'forgotNewPw')} onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="••••••••" disabled={loading}
            />
            <button type="button" onClick={() => setShowFpPw(!showFpPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity" tabIndex={-1}>
              {showFpPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {capsLock && <p className="text-xs text-orange-400 mt-1 ml-1">Caps Lock is ON</p>}
          {fieldErrs.fpNewPw && <FieldError msg={fieldErrs.fpNewPw} theme={theme} />}
          {fpNewPw.length > 0 && (
            <div className="mt-2 space-y-1.5 px-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Password Strength</span>
                <span style={{ color: strength.color }}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div className="h-full transition-all duration-300 rounded-full" style={{ width: strength.w, background: strength.color }} />
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>Confirm New Password</label>
          <div className="relative">
            <input
              type={showFpCf ? 'text' : 'password'} value={fpCfPw}
              onChange={e => { setFpCfPw(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.fpCfPw; return n; }); }}
              onFocus={e => showTooltip(e.currentTarget, 'forgotCfPw')} onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="••••••••" disabled={loading}
            />
            <button type="button" onClick={() => setShowFpCf(!showFpCf)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity" tabIndex={-1}>
              {showFpCf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrs.fpCfPw && <FieldError msg={fieldErrs.fpCfPw} theme={theme} />}
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}
