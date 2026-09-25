// Cookie consent. Google Analytics starts denied; nothing is stored on the visitor's device until they accept.
// The choice is remembered in localStorage, so the banner is shown once. Declining keeps the site fully working.
// Anything with [data-consent-reopen] brings the banner back, which is what makes the choice as easy to take back as to give.
(() => {
  const KEY = 'iconoteka-consent';
  const set = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const tell = v => { if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: v, ad_storage: 'denied' }); };

  const saved = get();
  if (saved === 'granted') tell('granted');

  const css = `
.consent { position: fixed; left: 0; right: 0; bottom: 20px; margin: 0 auto; z-index: 1500; width: max-content; max-width: calc(100vw - 40px); display: flex; align-items: center; gap: 18px; background: var(--ui-surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--r-md, 10px); box-shadow: var(--shadow-lg); padding: 14px 14px 14px 18px; font-size: 13px; line-height: 19px; }
.consent-text { display: flex; flex-direction: column; gap: 2px; max-width: 440px; }
.consent strong { font-size: 14px; font-weight: 600; line-height: 20px; }
.consent p { margin: 0; color: var(--text-muted); }
.consent a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, currentColor 40%, transparent); }
.consent a:hover { text-decoration-color: currentColor; }
.consent-row { display: flex; gap: 8px; flex-shrink: 0; align-self: flex-end; }   /* the bottom edge is dropped onto the last text line's baseline in sit(), since the two pages use different fonts */
.consent button { height: 32px; padding: 0 14px; border: none; border-radius: var(--r-sm, 6px); font-family: inherit; font-size: 14px; font-weight: 500; line-height: 1; letter-spacing: .01em; cursor: pointer; transition: background var(--t-fast, .2s), color var(--t-fast, .2s), opacity var(--t-fast, .2s); }
.consent .yes { background: var(--text); color: #fff; }
.consent .yes:hover { background: #333; }
[data-theme="dark"] .consent .yes { color: var(--bg); }
[data-theme="dark"] .consent .yes:hover { background: var(--text); opacity: .85; }
.consent .no { background: var(--ui-surface-hover); color: var(--text); }
.consent .no:hover { background: color-mix(in srgb, var(--ui-surface-hover) 92%, var(--text)); }   /* one step lighter, never the full invert -- that would make Decline look identical to Accept */
.consent button:active { opacity: .6; }
.consent { animation: consent-in var(--t-slow, .4s) cubic-bezier(.4,0,.2,1) both; }
@keyframes consent-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .consent { animation: none; } }
@media (max-width: 640px) { .consent { left: 12px; right: 12px; bottom: 12px; width: auto; max-width: none; flex-direction: column; align-items: stretch; gap: 12px; padding: 15px; } .consent-row { align-self: stretch; margin-bottom: 0; } .consent-text { max-width: none; } .consent-row button { flex: 1; } }
`;
  let styled = false, box = null;

  function show() {
    if (box) return;
    if (!styled) { const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style); styled = true; }
    box = document.createElement('div');
    box.className = 'consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookies');
    box.innerHTML = '<div class="consent-text"><strong>Iconoteka uses cookies</strong><p>Google Analytics counts visits: the pages you open, the site you came from, your country and browser. Icon downloads and empty searches are counted separately, without cookies. <a href="/about.html#privacy">Learn more</a></p></div>'
      + '<div class="consent-row"><button type="button" class="no">Decline</button><button type="button" class="yes">Accept</button></div>';
    document.body.appendChild(box);
    sit();
    // About loads a webfont: the first measurement uses fallback metrics, so re-sit once the real face is in.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sit);
    addEventListener('resize', sit);

    const close = choice => { set(choice); tell(choice); removeEventListener('resize', sit); box.remove(); box = null; };
    box.querySelector('.yes').addEventListener('click', () => close('granted'));
    box.querySelector('.no').addEventListener('click', () => close('denied'));
  }

  // Sit the buttons on the baseline of the copy's last line rather than on its line-box bottom.
  // The offset is measured, not assumed: the two pages load different fonts, so it is not the same number on each.
  function sit() {
    if (!box) return;
    const row = box.querySelector('.consent-row'), p = box.querySelector('p');
    row.style.marginBottom = '';
    if (row.getBoundingClientRect().top > p.getBoundingClientRect().bottom) return;   // stacked: nothing to align to
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    p.appendChild(probe);
    const drop = row.getBoundingClientRect().bottom - probe.getBoundingClientRect().bottom;
    probe.remove();
    if (drop > 0) row.style.marginBottom = drop + 'px';
  }

  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-consent-reopen]');
    if (!t) return;
    e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (err) {}
    tell('denied');   // back to the default until they choose again
    show();
  });

  if (!saved) show();
})();
