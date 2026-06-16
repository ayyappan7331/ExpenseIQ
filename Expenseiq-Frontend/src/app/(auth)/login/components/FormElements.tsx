import { Check } from 'lucide-react';
import { TooltipState } from '../types';

export const FIELD_HINTS: Record<string, string[]> = {
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

export const FIELD_ERR_KEYFRAME = [
  `@keyframes fieldErrIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`,
  `@keyframes tooltipIn{from{opacity:0;transform:translateX(-50%) translateY(calc(-100% + 6px))}to{opacity:1;transform:translateX(-50%) translateY(-100%)}}@keyframes spin{to{transform:rotate(360deg)}}`,
].join('');

export function ValidationTooltip({ state, theme }: { state: TooltipState; theme: 'dark' | 'light' }) {
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

export function FieldError({ msg, theme }: { msg: string; theme: 'dark' | 'light' }) {
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

export function SuccessNote({ msg, theme }: { msg: string; theme: 'dark' | 'light' }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '4px 2px 0', fontSize: '0.688rem', color: theme === 'dark' ? '#6ee7b7' : '#059669', lineHeight: 1.4 }}>
      <Check style={{ width: 11, height: 11, flexShrink: 0 }} />
      {msg}
    </p>
  );
}

export function PremiumButton({ loading, success, text, loadingText, type = 'submit', disabled = false, onClick }: { loading: boolean, success?: boolean, text: string, loadingText?: string, type?: 'button' | 'submit', disabled?: boolean, onClick?: () => void }) {
  return (
    <>
      <style>{`
        .premium-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #7c3aed 100%);
          background-size: 200% 200%;
          background-position: 0% 50%;
          box-shadow: 0 8px 20px -8px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255,255,255,0.2);
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .premium-btn:hover:not(:disabled) {
          background-position: 100% 50%;
          box-shadow: 0 14px 28px -6px rgba(124, 58, 237, 0.6), inset 0 1px 1px rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        .premium-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.98);
          box-shadow: 0 4px 10px -4px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255,255,255,0.2);
        }
      `}</style>
      <button
        type={type}
        disabled={disabled || loading || success}
        onClick={onClick}
        className="premium-btn relative w-full mt-4 text-sm font-semibold rounded-2xl text-white overflow-hidden group flex justify-center items-center h-[52px] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {success ? (
            <Check className="w-5 h-5 animate-in zoom-in duration-300" />
          ) : loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingText || text}
            </>
          ) : (
            text
          )}
        </span>
      </button>
    </>
  );
}
