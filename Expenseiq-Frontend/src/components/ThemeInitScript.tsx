// Pre-hydration script. Sets data-theme on <html> BEFORE React mounts,
// so the page never flashes the default theme. Rendered inside <head>
// in app/layout.tsx.
//
// Kept as a server-component so it ships zero client JS itself — the
// inline script is the only thing that runs in the browser.

import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/lib/themes';

const KNOWN_THEMES = ['dark','light','ocean','forest','sunset','nord','lavender','monokai','dracula','solarized','rose','amber','slate','crimson','mint','cyberpunk','caramel','steel','aurora','espresso','sakura','onyx','teal','volcanic','glacier','matrix','grape','paper'];

export function ThemeInitScript() {
  const code = `(function(){
    try{
      var k=${JSON.stringify(THEME_STORAGE_KEY)};
      var known=${JSON.stringify(KNOWN_THEMES)};
      var t=localStorage.getItem(k);
      if(known.indexOf(t)===-1)t=${JSON.stringify(DEFAULT_THEME)};
      document.documentElement.setAttribute('data-theme',t);
    }catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(DEFAULT_THEME)});}
    try{
      var s=localStorage.getItem('expenseiq.surfaceStyle');
      if(['flat','glossy','frozen'].indexOf(s)===-1)s='flat';
      document.documentElement.setAttribute('data-surface',s);
    }catch(e){document.documentElement.setAttribute('data-surface','flat');}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
