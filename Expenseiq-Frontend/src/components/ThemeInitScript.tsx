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
      var isCustom = t && t.startsWith('custom:');
      if(!isCustom && known.indexOf(t)===-1) t=${JSON.stringify(DEFAULT_THEME)};
      document.documentElement.setAttribute('data-theme',t);
      if(isCustom){
        var cRaw=localStorage.getItem('expenseiq.customThemes');
        if(cRaw){
          var ct=JSON.parse(cRaw);
          var activeTheme=ct.find(function(x){return x.key===t});
          if(activeTheme){
            var style=document.createElement('style');
            style.id='expenseiq-custom-themes-init';
            style.textContent=":root[data-theme='"+t+"']{--bg:"+activeTheme.bg+";--bg-2:"+activeTheme.bg2+";--bg-3:"+activeTheme.bg3+";--card:"+activeTheme.card+";--text:"+activeTheme.text+";--text-2:"+activeTheme.text2+";--text-3:"+activeTheme.text3+";--accent:"+activeTheme.accent+";--income:"+activeTheme.income+";--expense:"+activeTheme.expense+";--warning:"+activeTheme.warning+";}";
            document.head.appendChild(style);
          }
        }
      }
    }catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(DEFAULT_THEME)});}
    try{
      var s=localStorage.getItem('expenseiq.surfaceStyle');
      if(['flat','glossy','frozen'].indexOf(s)===-1)s='flat';
      document.documentElement.setAttribute('data-surface',s);
    }catch(e){document.documentElement.setAttribute('data-surface','flat');}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
