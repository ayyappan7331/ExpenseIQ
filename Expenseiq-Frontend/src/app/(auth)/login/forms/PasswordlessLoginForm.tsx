import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError } from '../components/FormElements';
import { OtpInput } from '../components/OtpInput';
import { ResendTimer } from '../components/ResendTimer';

export function PasswordlessLoginForm({
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

  const [step, setStep] = useState<1 | 2>(1);
  const [otpLoginId, setOtpLoginId] = useState('');
  const [otpLoginCode, setOtpLoginCode] = useState('');

  async function handleOtpLoginSend(ev: React.FormEvent) {
    ev.preventDefault();
    if (!otpLoginId.trim()) { setFieldErrs({ otpLoginId: 'Enter your email or mobile number.' }); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      await authApi.sendOtp({ identifier: otpLoginId.trim(), purpose: 'login' });
      setStep(2);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send OTP'); }
    finally { setLoading(false); }
  }

  async function handleOtpLoginResend() {
    try { await authApi.sendOtp({ identifier: otpLoginId.trim(), purpose: 'login' }); }
    catch { /* silent — ResendTimer UI handles feedback */ }
  }

  async function handleOtpLoginVerify(ev: React.FormEvent) {
    ev.preventDefault();
    if (otpLoginCode.replace(/\D/g, '').length < 6) { setFieldErrs({ otpLoginCode: 'Enter all 6 digits.' }); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      const res = await authApi.loginWithOtp({ identifier: otpLoginId.trim(), code: otpLoginCode.trim() });
      try { localStorage.setItem('expenseiq_last_identifier', otpLoginId.trim()); } catch { /* ignore */ }
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
        <p className="text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>Login instantly without a password. We&apos;ll send a secure one-time code to your registered email or mobile.</p>
        <form onSubmit={handleOtpLoginSend} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold mb-1 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#333' }}>Account Identifier</label>
            <input
              type="text" value={otpLoginId}
              onChange={e => { setOtpLoginId(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.otpLoginId; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="Email or Mobile Number" disabled={loading}
            />
            {fieldErrs.otpLoginId && <FieldError msg={fieldErrs.otpLoginId} theme={theme} />}
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 cursor-pointer">
            {loading ? 'Sending...' : 'Send Login Code'}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-sm font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity">
        <ArrowLeft size={16} /> Change Identifier
      </button>
      <p className="text-sm mb-6 text-center" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
        We sent a 6-digit code to <br/><strong style={{ color: isDark ? '#fff' : '#000' }}>{otpLoginId}</strong>
      </p>
      <form onSubmit={handleOtpLoginVerify} className="space-y-6" noValidate>
        <div>
          <div onBlur={hideTooltip}>
            <OtpInput value={otpLoginCode} onChange={v => { setOtpLoginCode(v); setFieldErrs(p => { const n = { ...p }; delete n.otpLoginCode; return n; }); }} theme={theme} />
          </div>
          {fieldErrs.otpLoginCode && <div className="flex justify-center mt-2"><FieldError msg={fieldErrs.otpLoginCode} theme={theme} /></div>}
          <div className="flex justify-center mt-4">
            <ResendTimer onResend={handleOtpLoginResend} theme={theme} />
          </div>
        </div>
        <button type="submit" disabled={loading || otpLoginCode.replace(/\D/g, '').length < 6} className="w-full py-3 mt-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-500/20">
          {loading ? 'Verifying...' : 'Login Securely'}
        </button>
      </form>
    </>
  );
}
