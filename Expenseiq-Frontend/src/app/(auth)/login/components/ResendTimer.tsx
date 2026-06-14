import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export function ResendTimer({ 
  onResend, 
  theme 
}: { 
  onResend: () => void; 
  theme: 'dark' | 'light'; 
}) {
  const [secs, setSecs] = useState(60);
  
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  
  const isDark = theme === 'dark';
  
  if (secs > 0) {
    return <span style={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,30,60,0.45)' }}>Resend OTP in {secs}s</span>;
  }
  
  return (
    <button 
      type="button" 
      onClick={() => { setSecs(60); onResend(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: isDark ? '#a78bfa' : '#6d52d8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <RefreshCw style={{ width: 11, height: 11 }} /> Resend OTP
    </button>
  );
}
