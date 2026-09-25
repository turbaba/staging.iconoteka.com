/* ── Support the project ──────────────────────────────────────────────────────
   One list, three "ways". Cards always render so the layout is complete; a way
   with no url / no addresses shows a "Coming soon" button instead of a live one.
   Paste the Ko-fi URL and wallet addresses below to switch them on. */
const SUPPORT_WAYS = [
  { key: 'patreon', title: 'Patreon', tag: '',
    text: 'Ongoing support. Choose a comfortable tier and help the project\u2019s development.',
    cta: 'Subscribe on Patreon', url: 'https://www.patreon.com/c/iconoteka',
    tiers: [                                     // the campaign's published tiers (About page section only)
      { name: 'Project Supporter', price: '$1 / month' },
      { name: 'Contributor',       price: '$10 / month' },
      { name: 'Partner',           price: '$100 / month' },
      { name: 'Sponsorship',       price: '$500 / month' },   // listed without its description (user)
    ] },
  { key: 'kofi', title: 'Ko-fi', tag: '',
    text: 'A one-time tip. A simple way to contribute, with no subscription attached.',
    cta: 'Tip on Ko-fi', url: 'https://ko-fi.com/iconoteka' },
  { key: 'crypto', title: 'Crypto', tag: '',
    text: 'Direct support in crypto, as a one-time transaction. Tap a network to copy the address.',
    addresses: [                                 // paste wallet addresses to switch the buttons on
      { label: 'BTC',  network: 'Bitcoin',        address: 'bc1qpc5wq2qeepn3dyqx20709duvx7eknlfgegxw83' },
      { label: 'ETH',  network: 'Ethereum',       address: '0x15254E45F78A2a7BC8b5A74a36414B35236aea4e' },
      { label: 'USDT', network: 'Tether, TRC-20', address: 'TQQ8eVurpxkYNT4bxzLRaitNjtc4eeBDS5' },
    ] },
];

(function initSupport() {
  const btn = document.getElementById('supportBtn');
  const track = (option) => { if (typeof sendAnalytics === 'function') sendAnalytics({ type: 'support', option }); };
  const toast = (msg) => { if (typeof showToast === 'function') showToast(msg); };
  // Copy an address; confirm in place on the element that was tapped (no bottom toast on success)
  const copyAddr = (label, address, el) => {
    track(label);
    navigator.clipboard.writeText(address.trim()).then(() => {
      if (!el) return toast(label + ' address copied');
      if (el._t) clearTimeout(el._t);
      if (!el.dataset.orig) el.dataset.orig = el.textContent;
      el.textContent = 'Copied'; el.classList.add('copied');
      el._t = setTimeout(() => { el.textContent = el.dataset.orig; el.classList.remove('copied'); }, 1600);
    }).catch(() => toast('Copy failed'));
  };
  const live = (w) => w.url ? w.url.trim() : (w.addresses || []).some(a => a.address && a.address.trim());

  // ── the three cards: used by the header panel and by the About page's Support section ──
  const INTRO = 'Iconoteka is a free, open-source project. Become a contributor with a subscription or a one-time donation to support its development.';
  const cardsHTML = () => SUPPORT_WAYS.map(w => {
      let action;
      if (w.addresses) {
        action = '<div class="support-addr">' + w.addresses.map(a => (a.address && a.address.trim())
          ? '<button type="button" data-addr="' + a.address.trim() + '" data-label="' + a.label + '">' + a.label + '</button>'
          : '<button type="button" data-placeholder="' + a.label + '">' + a.label + '</button>').join('') + '</div>';
      } else {
        action = w.url && w.url.trim()
          ? '<a class="support-cta" href="' + w.url + '" target="_blank" rel="noopener" data-track="' + w.title + '">' + w.cta + (w.arrow ? ' ↗' : '') + '</a>'
          : '<button type="button" class="support-cta" data-placeholder="' + w.title + '">' + w.cta + (w.arrow ? ' ↗' : '') + '</button>';
      }
      return '<div class="support-card" data-way="' + w.key + '"><h4>' + w.title + (w.tag ? '<small>' + w.tag + '</small>' : '') + '</h4><p>' + w.text + '</p>' + action + '</div>';
    }).join('');
  const wireCards = root => {
    root.querySelectorAll('[data-addr]').forEach(b => b.addEventListener('click', () => copyAddr(b.dataset.label, b.dataset.addr, b)));
    root.querySelectorAll('[data-track]').forEach(a => a.addEventListener('click', () => track(a.dataset.track)));
    root.querySelectorAll('[data-placeholder]').forEach(b => b.addEventListener('click', () => toast('Coming soon')));
  };
  // About page (#support): the same three ways in a DETAILED form — Patreon lists its tiers, Crypto lists every
  // network with its address and a Copy button; the header panel keeps the compact cards
  const short = a => a.length > 18 ? a.slice(0, 9) + '…' + a.slice(-6) : a;   // long form
  const tiny = a => a.slice(0, 5) + '…' + a.slice(-4);                          // narrow columns (≤1100): one line
  const price = p => '<span class="p-long">' + p + '</span><span class="p-short">' + p.replace(' / month', '/mo') + '</span>';
  const detailedHTML = () => SUPPORT_WAYS.map(w => {
    let body = '<p>' + w.text + '</p>', action = '';
    if (w.tiers) body += '<ul class="support-tiers">' + w.tiers.map(t => '<li><span class="t-name">' + t.name + '</span><span class="t-price">' + price(t.price) + '</span>' + (t.note ? '<span class="t-note">' + t.note + '</span>' : '') + '</li>').join('') + '</ul>';
    if (w.addresses) body += '<ul class="support-list">' + w.addresses.map(a => (a.address && a.address.trim())
        ? '<li><span class="a-net"><b>' + a.label + '</b> <span class="net">' + (a.network || '') + '</span></span><code class="a-addr" title="' + a.address.trim() + '"><span class="a-long">' + short(a.address.trim()) + '</span><span class="a-short">' + tiny(a.address.trim()) + '</span></code><button type="button" data-addr="' + a.address.trim() + '" data-label="' + a.label + '">Copy</button></li>'
        : '<li><span class="a-net"><b>' + a.label + '</b></span><button type="button" data-placeholder="' + a.label + '">Copy</button></li>').join('') + '</ul>';
    else action = (w.url && w.url.trim())
        ? '<a class="support-cta" href="' + w.url + '" target="_blank" rel="noopener" data-track="' + w.title + '">' + w.cta + '</a>'
        : '<button type="button" class="support-cta" data-placeholder="' + w.title + '">' + w.cta + '</button>';
    return '<div class="support-card" data-way="' + w.key + '"><h4>' + w.title + '</h4>' + body + action + '</div>';
  }).join('');
  const sec = document.getElementById('supportCards'), lead = document.getElementById('supportLead');
  if (lead) lead.textContent = INTRO;
  if (sec) { sec.innerHTML = detailedHTML(); wireCards(sec); }

  // ── mega-panel (desktop + tablet) ─────────────────────────────────────────
  if (btn) {
    const backdrop = document.createElement('div'); backdrop.className = 'support-backdrop'; backdrop.id = 'supportBackdrop';
    const panel = document.createElement('div'); panel.className = 'support-panel'; panel.id = 'supportPanel'; panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="support-inner"><div class="support-grid">' +
      '<div class="support-intro"><p>' + INTRO + '</p></div>' +
      '<div class="support-cards">' + cardsHTML() + '</div></div></div>';
    document.body.appendChild(backdrop); document.body.appendChild(panel);
    wireCards(panel);

    let openTimer = null, closeTimer = null, isOpen = false;
    const place = () => { const h = document.querySelector('header').getBoundingClientRect(); panel.style.top = (h.bottom - 1) + 'px'; backdrop.style.top = h.bottom + 'px'; };
    const open = () => {
      clearTimeout(closeTimer); if (isOpen) return;
      place(); isOpen = true;
      panel.classList.remove('closing'); panel.classList.add('open'); backdrop.classList.add('open');
      document.querySelector('header').classList.add('support-open');
      panel.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      clearTimeout(openTimer); if (!isOpen) return;
      isOpen = false;
      panel.classList.remove('open'); panel.classList.add('closing'); backdrop.classList.remove('open');
      document.querySelector('header').classList.remove('support-open');
      panel.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!isOpen) panel.classList.remove('closing'); }, 300);   // just past the 280ms close
    };
    const hoverable = window.matchMedia('(hover: hover)').matches;
    // hover: small delay in, grace period out (so the pointer can travel from the button to the panel)
    if (hoverable) {
      btn.addEventListener('mouseenter', () => { clearTimeout(closeTimer); openTimer = setTimeout(open, 90); });
      btn.addEventListener('mouseleave', () => { clearTimeout(openTimer); closeTimer = setTimeout(close, 220); });
      panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      panel.addEventListener('mouseleave', () => { closeTimer = setTimeout(close, 220); });
    }
    // click / tap: toggles on touch devices; on hover devices a click never closes the panel
    // that hover just opened (it only opens / keeps it open — Esc, backdrop or mouseleave close it)
    btn.addEventListener('click', e => { e.stopPropagation(); (isOpen && !hoverable) ? close() : open(); });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', close);
  }

  // ── footer row (About page): every way as a plain text button; networks copy the address ──
  const foot = document.getElementById('footerSupport');
  if (foot) {
    SUPPORT_WAYS.forEach(w => {
      if (w.addresses) {
        const label = document.createElement('span'); label.className = 'footer-crypto-label'; label.textContent = w.title + ':';   // "Crypto:" — a grey, non-clickable line
        foot.appendChild(label);
        const row = document.createElement('div'); row.className = 'footer-crypto';   // the networks share the next line
        w.addresses.forEach(a => {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = a.label;
          b.addEventListener('click', () => (a.address && a.address.trim()) ? copyAddr(a.label, a.address, b) : toast('Coming soon'));
          row.appendChild(b);
        });
        foot.appendChild(row);
      } else {
        const on = w.url && w.url.trim();
        const el = on ? Object.assign(document.createElement('a'), { href: w.url, target: '_blank', rel: 'noopener' })
                      : Object.assign(document.createElement('button'), { type: 'button' });
        el.textContent = w.cta || w.title;
        el.addEventListener('click', () => { track(w.title); if (!on) toast('Coming soon'); });
        foot.appendChild(el);
      }
    });
  }

  // ── burger group (tablet + mobile): title + three text rows; crypto networks always shown ──
  const group = document.getElementById('burgerSupport');
  if (group) {
    SUPPORT_WAYS.forEach(w => {
      if (w.addresses) {
        const row = document.createElement('div'); row.className = 'burger-link burger-crypto';
        // the word itself acts as the first network (BTC)
        const first = w.addresses[0];
        const word = document.createElement('button'); word.type = 'button'; word.className = 'burger-crypto-word'; word.textContent = w.title;
        word.addEventListener('click', e => { e.stopPropagation(); (first.address && first.address.trim()) ? copyAddr(first.label, first.address, word) : toast('Coming soon'); });
        row.appendChild(word);
        const nets = document.createElement('div'); nets.className = 'burger-networks';
        w.addresses.forEach(a => {
          const chip = document.createElement('button'); chip.type = 'button'; chip.textContent = a.label;
          chip.addEventListener('click', e => { e.stopPropagation(); (a.address && a.address.trim()) ? copyAddr(a.label, a.address, chip) : toast('Coming soon'); });
          nets.appendChild(chip);
        });
        row.appendChild(nets); group.appendChild(row);
      } else {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'burger-link'; b.textContent = w.cta || w.title;   // 'Subscribe on Patreon', 'Tip on Ko-fi'
        b.addEventListener('click', () => { track(w.title); (w.url && w.url.trim()) ? window.open(w.url, '_blank', 'noopener') : toast('Coming soon'); });
        group.appendChild(b);
      }
    });
  }
})();
