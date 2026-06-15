import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { setToken, setStoredUser } from '@/lib/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { SharedFormProps } from '../types';
import { FieldError } from '../components/FormElements';

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

function looksLikeMobile(val: string) {
  return /^(\+91|91)?[6-9]\d{9}$/.test(val.replace(/\s|-/g, ''));
}

export function RegisterForm({
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

  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regName, setRegName] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPurpose, setRegPurpose] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regCf, setRegCf] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegCf, setShowRegCf] = useState(false);
  const [touched, setTouched] = useState(false);
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

  const passedRules = RULES.filter(r => r.test(regPw));
  const allRulesPassed = passedRules.length === RULES.length;
  const strength = strengthInfo(passedRules.length);
  const regPwMatch = regPw === regCf;

  async function handleRegister(ev: React.FormEvent) {
    ev.preventDefault(); setTouched(true);
    const errs: Record<string, string> = {};
    if (!regName.trim()) errs.regName = 'Full name is required.';
    if (!regEmail.trim() && !regMobile.trim()) {
      errs.regEmail = 'Email or mobile number is required.';
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
    
    if (Object.keys(errs).length) { setFieldErrs(errs); setError(''); return; }
    
    setFieldErrs({}); setError(''); setLoading(true);
    try {
      await authApi.register({
        email: regEmail.trim() || undefined,
        mobile: regMobile.trim() || undefined,
        password: regPw,
        name: regName.trim(),
        dob: regDob,
        purpose: regPurpose,
      });
      await afterLogin(regEmail.trim() || regMobile.trim(), regPw);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
    <>
      <button type="button" onClick={() => onSwitchView('login')} className="mb-6 flex items-center gap-2 text-sm font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity">
        <ArrowLeft size={16} /> Back to Login
      </button>
      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Full Name *</label>
          <input
            type="text" value={regName}
            onChange={e => { setRegName(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regName; return n; }); }}
            onBlur={hideTooltip}
            className={inpBase} style={inpStyle} placeholder="John Doe" disabled={loading}
          />
          {fieldErrs.regName && <FieldError msg={fieldErrs.regName} theme={theme} />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Email (Optional)</label>
            <input
              type="email" value={regEmail}
              onChange={e => { setRegEmail(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regEmail; delete n.regMobile; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="name@company.com" disabled={loading}
            />
            {fieldErrs.regEmail && <FieldError msg={fieldErrs.regEmail} theme={theme} />}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Mobile (Optional)</label>
            <input
              type="tel" value={regMobile}
              onChange={e => { setRegMobile(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regMobile; delete n.regEmail; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="9876543210" disabled={loading}
            />
            {fieldErrs.regMobile && <FieldError msg={fieldErrs.regMobile} theme={theme} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Date of Birth (Optional)</label>
            <input
              type="date" value={regDob}
              onChange={e => setRegDob(e.target.value)}
              className={inpBase} style={inpStyle} disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Primary Purpose *</label>
            <select
              value={regPurpose}
              onChange={e => { setRegPurpose(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regPurpose; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={{ ...inpStyle, appearance: 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${isDark ? '%23ffffff' : '%23000000'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
              disabled={loading}
            >
              <option value="" disabled>Select a purpose...</option>
              {PURPOSES.map(p => <option key={p.value} value={p.value} style={{ color: '#000', background: '#fff' }}>{p.label}</option>)}
            </select>
            {fieldErrs.regPurpose && <FieldError msg={fieldErrs.regPurpose} theme={theme} />}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Password *</label>
          <div className="relative">
            <input
              type={showRegPw ? 'text' : 'password'} value={regPw}
              onChange={e => { setRegPw(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regPw; return n; }); }}
              onKeyDown={handleKeyEvent} onKeyUp={handleKeyEvent}
              onBlur={hideTooltip}
              className={inpBase} style={inpStyle} placeholder="••••••••" disabled={loading}
            />
            <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" tabIndex={-1}>
              {showRegPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {capsLock && <p className="text-xs text-orange-400 mt-1 ml-1">Caps Lock is ON</p>}
          {fieldErrs.regPw && <FieldError msg={fieldErrs.regPw} theme={theme} />}
          {regPw.length > 0 && (
            <div className="mt-2 space-y-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between text-xs font-medium">
                <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Password Strength</span>
                <span style={{ color: strength.color }}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div className="h-full transition-all duration-300 rounded-full" style={{ width: strength.w, background: strength.color }} />
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {RULES.map(r => {
                  const pass = r.test(regPw);
                  return (
                    <div key={r.id} className="flex items-center gap-1.5 text-[0.65rem] transition-colors duration-200" style={{ color: pass ? (isDark ? '#e2e8f0' : '#1e293b') : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)') }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: pass ? '#22c55e' : 'currentColor' }}>
                        {pass ? (
                          <>
                            <circle cx="6" cy="6" r="5" fill="currentColor" fillOpacity="0.2"/>
                            <path d="M4 6l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </>
                        ) : (
                          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1"/>
                        )}
                      </svg>
                      {r.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#4b5563' }}>Confirm Password *</label>
          <div className="relative">
            <input
              type={showRegCf ? 'text' : 'password'} value={regCf}
              onChange={e => { setRegCf(e.target.value); setFieldErrs(p => { const n = { ...p }; delete n.regCf; return n; }); }}
              onBlur={hideTooltip}
              className={inpBase} style={{ ...inpStyle, borderColor: touched && regCf && !regPwMatch ? '#ef4444' : inpStyle.borderColor }} placeholder="••••••••" disabled={loading}
            />
            <button type="button" onClick={() => setShowRegCf(!showRegCf)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" tabIndex={-1}>
              {showRegCf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrs.regCf && <FieldError msg={fieldErrs.regCf} theme={theme} />}
        </div>
        <button
          type="submit" disabled={loading}
          className="relative w-full py-3.5 mt-4 text-sm font-semibold rounded-2xl text-white transition-all duration-300 ease-out hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            boxShadow: '0 8px 20px -8px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
          }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10">{loading ? 'Creating Account...' : 'Create Account'}</span>
        </button>
      </form>
    </>
  );
}
