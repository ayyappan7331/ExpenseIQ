import type { ReactNode } from 'react';

// Auth pages restore the persisted login-page theme (dark/light) from
// localStorage before hydration to avoid flash. Falls back to dark.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: [
            `(function(){`,
            `var t=localStorage.getItem('expenseiq_login_theme')||'dark';`,
            `document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');`,
            `document.documentElement.setAttribute('data-surface','flat');`,
            `})();`,
          ].join(''),
        }}
      />
      {children}
    </>
  );
}
