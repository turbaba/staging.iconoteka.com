// Reveal on load and on scroll, LINE BY LINE, on every page of the site.
//
// The page is walked down to its smallest visual units: a heading, a paragraph, a list item's text,
// a button row, a card, an image, a code snippet. Each unit fades in and rises 24px the first time it
// comes into view. Units that arrive together are grouped into lines by their top edge, and the lines
// follow each other top to bottom, 80 ms apart; units sharing a line rise together.
//
// A unit is:
//   - anything that paints a box of its own (background colour or image, border, shadow) and is shorter
//     than 60% of the viewport, e.g. cards, tiles, snippets, buttons. It moves as one piece;
//   - media and controls: img, svg, video, canvas, picture, iframe, button, input, textarea, select;
//   - a text leaf: an element whose children are all inline (a paragraph with links, a heading);
//   - a single row: a flex or grid container whose children all share one top edge (chips, buttons).
// Everything else is a container and is walked into. A container that draws a RULE (a border on one to
// three sides, or a gradient background drawn as a 1px line) has that line faded in on the same timing,
// keyed to where the line sits: its top edge, or its bottom edge for a bottom border.
//
// Markup switches:
//   data-reveal="off"     leave this element and everything inside it alone (the homepage grid)
//   data-reveal="unit"    treat this element as one unit
//   data-reveal="manual"  one unit, but revealed by the page's own code (the About counters add .in)
// ?noreveal in the URL and prefers-reduced-motion switch the whole thing off.
(() => {
  const root = document.documentElement;
  const done = () => root.classList.remove('rv-pending');   // the head snippet hides main + footer until units are set
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || /noreveal/.test(location.search)) { window.revealMore = () => {}; done(); return; }

  const MEDIA = 'img, svg, video, canvas, picture, iframe, button, input, textarea, select';
  const BLOCKISH = /^(block|flex|grid|table|list-item|flow-root|contents)$/;
  const units = new Set();

  const paintsBox = cs => {
    const bg = cs.backgroundColor, a = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : bg === 'transparent' ? 0 : 1;
    if (a > 0.01) return true;
    if (/url\(/.test(cs.backgroundImage)) return true;   // a gradient is usually a drawn rule, not a box, so it does not count
    if (cs.boxShadow !== 'none') return true;
    return ['Top', 'Right', 'Bottom', 'Left'].every(s => parseFloat(cs['border' + s + 'Width']) > 0);
  };
  const skip = (el, cs) => cs.display === 'none' || cs.visibility === 'hidden' || /^(absolute|fixed|sticky)$/.test(cs.position)
    || cs.animationName !== 'none' || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|BR)$/.test(el.tagName);

  const isUnit = (el, cs) => {
    const mode = el.dataset.reveal;
    if (mode === 'unit' || mode === 'manual') return true;
    if (el.matches(MEDIA)) return true;
    const h = el.getBoundingClientRect().height;
    if (paintsBox(cs) && h < innerHeight * .6) return true;
    if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) return true;   // a sideways scroller (the gallery) moves as one
    // text of its own (a heading with its number as a block above it): the element is one unit, or that
    // loose text would never be revealed
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return true;
    const kids = [...el.children].filter(k => { const kcs = getComputedStyle(k); return !skip(k, kcs); });
    if (!kids.length) return true;
    if (kids.every(k => !BLOCKISH.test(getComputedStyle(k).display))) return true;   // text leaf
    if (/flex|grid/.test(cs.display) && h < 160) {                                    // one row of items
      const t0 = kids[0].getBoundingClientRect().top;
      if (kids.every(k => Math.abs(k.getBoundingClientRect().top - t0) < 6)) return true;
    }
    return false;
  };

  const walk = (el, out) => {
    for (const c of el.children) {
      if (c.dataset.reveal === 'off' || c.dataset.rv) continue;
      const cs = getComputedStyle(c);
      if (skip(c, cs)) continue;
      if (cs.display === 'contents') { walk(c, out); continue; }   // no box of its own: its children are the units
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (isUnit(c, cs)) out.push(c); else { lineOf(c, cs); walk(c, out); }
    }
    return out;
  };

  // after the rise, the unit gives its transition back to its own CSS (hover fades and the like)
  // The rise runs on the separate `translate` property with the Web Animations API, so it never touches a
  // unit's own `transform` or `transition`: a card lifting on hover keeps its own timing even mid-reveal.
  const settle = el => el.classList.remove('reveal', 'in', 'now');
  const EASE = 'cubic-bezier(.2,.6,.2,1)';
  const show = (el, delay, instant) => {
    if (!units.has(el)) return; units.delete(el);
    el.classList.add('in');                                  // the hidden state lifts; the animation holds it until it starts
    if (instant) { settle(el); return; }
    const cs = getComputedStyle(el);
    const a = el.animate([{ opacity: 0, translate: '0 24px' }, { opacity: cs.opacity, translate: cs.translate }],
                         { duration: 800, delay, easing: EASE, fill: 'backwards' });
    a.finished.then(() => settle(el), () => settle(el));
  };

  // ---- lines drawn by containers --------------------------------------------------------------
  // Hidden with inline styles (border colour transparent, gradient 0px tall) and animated back to the
  // page's own values with the Web Animations API, then the inline styles are dropped again.
  const lines = new Map();   // el -> { sides, grad, colors, size, atBottom }
  let linesLive = false;
  const lineOf = (el, cs) => {
    if (lines.has(el) || el.dataset.rvLine) return;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(s => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
    const grad = /gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage);
    if (!(sides.length && sides.length < 4) && !grad) return;
    const L = { sides: sides.length < 4 ? sides : [], grad, colors: {}, size: cs.backgroundSize, atBottom: sides.length === 1 && sides[0] === 'Bottom' };
    L.sides.forEach(s => { L.colors[s] = cs['border' + s + 'Color']; el.style['border' + s + 'Color'] = 'transparent'; });
    if (grad) { const w = L.size.slice(0, L.size.lastIndexOf(' ')); L.from = w + ' 0px'; el.style.backgroundSize = L.from; }   // width may be a calc() with spaces: keep all but the height
    el.dataset.rvLine = '1';
    lines.set(el, L);
    if (linesLive) lio.observe(el);   // built after load (MutationObserver): observe straight away
  };
  const lineY = (el, L) => { const r = el.getBoundingClientRect(); return L.atBottom ? r.bottom : r.top; };
  const showLine = (el, delay, instant) => {
    const L = lines.get(el); if (!L) return; lines.delete(el); lio.unobserve(el);
    const from = {}, to = {};
    L.sides.forEach(s => { from['border' + s + 'Color'] = 'transparent'; to['border' + s + 'Color'] = L.colors[s]; el.style['border' + s + 'Color'] = ''; });
    if (L.grad) { from.backgroundSize = L.from; to.backgroundSize = L.size; el.style.backgroundSize = ''; }
    if (!instant) el.animate([from, to], { duration: 800, delay, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'backwards' });
  };
  // the delay of the units that started with it, so a line lands in step with the text around it
  let recent = [];   // { y, delay, t }
  const delayAt = y => {
    const now = performance.now(); recent = recent.filter(r => now - r.t < 120);
    const above = recent.filter(r => r.y <= y + 1).map(r => r.delay);
    return above.length ? Math.min(MAX, Math.max(...above) + LINE) : 0;
  };
  const lio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const L = lines.get(e.target); if (!L) return;
    const y = lineY(e.target, L);
    if (y < 0) return showLine(e.target, 0, true);                // above the fold already: at once
    if (y > innerHeight * .96) return;                             // the line itself is not in view yet
    showLine(e.target, delayAt(y), false);
  }), { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

  const LINE = 80, MAX = 1400;   // one delay per line: units sharing a line rise TOGETHER, so baselines that line up stay lined up while they move
  const io = new IntersectionObserver(entries => {
    const rising = [];
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.boundingClientRect.top < 0) show(e.target, 0, true);   // coming in from the top while scrolling up: at once
      else rising.push(e);
    });
    rising.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
    let line = -1, lineTop = -Infinity;
    rising.forEach(e => {
      const r = e.boundingClientRect;
      if (r.top - lineTop > 12) { line++; lineTop = r.top; }
      const d = Math.min(MAX, line * LINE);
      recent.push({ y: r.top, delay: d, t: performance.now() });
      show(e.target, d, false);
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });

  const add = els => els.forEach(el => {
    if (el.dataset.rv) return;
    el.dataset.rv = '1';
    el.classList.add('reveal');
    units.add(el);
    if (el.getBoundingClientRect().bottom < 0) { show(el, 0, true); return; }   // already scrolled past (restored position, anchor jump)
    if (el.dataset.reveal !== 'manual') io.observe(el);
  });

  const scopes = () => [...document.querySelectorAll('main, footer, [data-reveal="root"]')].filter(s => s.dataset.reveal !== 'off');
  scopes().forEach(s => { lineOf(s, getComputedStyle(s)); add(walk(s, [])); });
  // units get the first observer callback, so their delays are known when the lines ask for theirs
  requestAnimationFrame(() => { linesLive = true; lines.forEach((L, el) => { if (lineY(el, L) < 0) showLine(el, 0, true); else lio.observe(el); }); });
  done();

  // content the page builds right after load (lists from icons.json, the weight cards) joins in;
  // later changes (hover previews, copy icons, filters) are left alone
  const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 3) {   // text poured into an element that was empty at load (support.js fills About's lead): that element is the unit
      const el = n.parentElement;
      if (!n.textContent.trim() || !el || el.closest('[data-rv], [data-reveal="off"]') || !scopes().some(s => s.contains(el))) return;
      if (!skip(el, getComputedStyle(el))) add([el]);
      return;
    }
    if (n.nodeType !== 1 || n.closest('[data-rv], [data-reveal="off"]')) return;
    if (!scopes().some(s => s.contains(n))) return;
    const cs = getComputedStyle(n);
    if (skip(n, cs)) return;
    add(isUnit(n, cs) ? [n] : walk(n, []));
  })));
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 4000);

  // pages that build units later can hand them over; they reveal line by line like the rest
  window.revealMore = els => add([...els]);
  // the page's own code (the About counters) reveals a manual unit with its own delay
  window.revealNow = (el, delay = 0) => show(el, delay, false);

  // safety net: at the very bottom of the page everything left is shown
  addEventListener('scroll', () => {
    if (innerHeight + scrollY >= root.scrollHeight - 2) { [...units].forEach(el => el.dataset.reveal !== 'manual' && show(el, 0, false)); [...lines.keys()].forEach(el => showLine(el, 0, false)); }
  }, { passive: true });
})();
