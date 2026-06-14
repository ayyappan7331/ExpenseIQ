export function OtpInput({ 
  value, 
  onChange, 
  theme 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  theme: 'dark' | 'light'; 
}) {
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
