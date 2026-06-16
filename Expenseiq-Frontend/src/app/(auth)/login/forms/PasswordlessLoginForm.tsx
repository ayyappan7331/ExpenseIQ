import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError, PremiumButton } from '../components/FormElements';
import { OtpInput } from '../components/OtpInput';
import { ResendTimer } from '../components/ResendTimer';

export function PasswordlessLoginForm({
  theme,
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
  const [success, setSuccess] = useState(false);

  async function handleOtpLoginSend(ev: React.FormEvent) {
    ev.preventDefault();
    if (!otpLoginId.trim()) { setFieldErrs({ otpLoginId: 'Enter your email or mobile number.' }); return; }
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      await authApi.sendOtp({ identifier: otpLoginId.trim(), purpose: 'login' });
      setSuccess(true);
      setTimeout(() => {
        setStep(2);
        setSuccess(false);
      }, 800);
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
      setSuccess(true);
      setTimeout(() => {
        setToken(res.token);
        setStoredUser({ id: res.user.id, email: res.user.email, name: res.user.name, dob: res.user.dob, purpose: res.user.purpose });
        qc.clear();
        router.push('/dashboard');
      }, 1500);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Invalid or expired OTP'); }
    finally { setLoading(false); }
  }

  const isDark = theme === 'dark';
  const inpBase = "w-full px-4 py-3 text-sm rounded-xl border border-[var(--inp-border)] bg-[var(--inp-bg)] text-[var(--inp-text)] shadow-[var(--inp-shadow)] transition-all duration-200 ease-out focus:outline-none focus:border-[var(--inp-focus-border)] focus:ring-[3px] focus:ring-[var(--inp-focus-ring)] placeholder:text-[var(--inp-ph)]";
  const inpStyle = {
    '--inp-bg': isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
    '--inp-border': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    '--inp-text': isDark ? '#ffffff' : '#1a1a2e',
    '--inp-shadow': isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 1px rgba(255,255,255,0.04)' : 'inset 0 2px 4px rgba(0,0,0,0.04), 0 1px 1px rgba(255,255,255,1)',
    '--inp-focus-border': isDark ? '#8b5cf6' : '#7c3aed',
    '--inp-focus-ring': isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.15)',
    '--inp-ph': isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.4)',
  } as React.CSSProperties;

  if (step === 1) {
    return (
      <>
        <p className="text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>Login instantly without a password. We&apos;ll send a secure one-time code to your registered email or mobile.</p>
        <form onSubmit={handleOtpLoginSend} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Account Identifier</label>
            <input
              type="text" value={otpLoginId}
              onChange={e => { setOtpLoginId(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.otpLoginId; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="Enter your email or mobile" disabled={loading}
            />
            {fieldErrs.otpLoginId && <FieldError msg={fieldErrs.otpLoginId} theme={theme} />}
          </div>
          <PremiumButton loading={loading} success={success} text="Send Login Code" loadingText="Sending..." />
        </form>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-sm font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
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
        <PremiumButton loading={loading} success={success} text="Login Securely" loadingText="Verifying..." disabled={otpLoginCode.replace(/\D/g, '').length < 6} />
      </form>
    </>
  );
}
