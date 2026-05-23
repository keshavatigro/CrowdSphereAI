/** Runs before paint to avoid theme flash */
export function ThemeInitScript() {
  const script = `(function(){try{var t=localStorage.getItem('crowdsphere-theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){document.documentElement.classList.remove('dark');}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
