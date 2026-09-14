(function () {
  var language = window.SiteLanguage;

  // ---------- Terminbuchung: Cal.com inline einbetten; ohne Skript bleibt der Link sichtbar ----------
  var booking = document.getElementById('booking'), calLink = booking.getAttribute('data-booking-link');
  function currentCalLink() {
    return language.current === 'en' ? booking.getAttribute('data-booking-link-en') : calLink;
  }
  function localizeCalendar() {
    var url = new URL('https://cal.com/' + currentCalLink());
    document.getElementById('cal-link').href = url.href;
    document.querySelectorAll('#cal-embed iframe').forEach(function (frame) {
      frame.title = language.current === 'de' ? 'Terminbuchung' : 'Book a conversation';
      if (!frame.getAttribute('src')) return;
      var source = new URL(frame.src);
      var pathname = '/' + currentCalLink() + '/embed';
      if (source.pathname !== pathname) {
        source.pathname = pathname;
        source.searchParams.delete('locale');
        // Ein Sprachwechsel beginnt die Auswahl für den anderen Ereignistyp neu.
        ['date', 'slot', 'duration', 'month'].forEach(function (key) { source.searchParams.delete(key); });
        frame.src = source.href;
      }
    });
  }
  localizeCalendar();
  window.addEventListener('site-languagechange', localizeCalendar);
  new MutationObserver(localizeCalendar).observe(document.getElementById('cal-embed'), { childList: true, subtree: true });

  // ---------- Einwilligung: Cal.com wird erst nach Zustimmung geladen ----------
  // Gespeichert wird nur die Entscheidung mit Zeitpunkt, Ablauf und Textversion, lokal im Browser.
  var storeKey = 'rjl-calendar-consent';
  var version = '2026-09-14.1'; // bei geändertem Einwilligungstext hochzählen: alle müssen neu entscheiden
  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var banner = document.getElementById('consent-banner');
  var settings = document.getElementById('consent-settings');
  var close = document.getElementById('consent-close');
  var notice = document.getElementById('booking-notice');
  var started = false, expiryTimer, returnFocus;

  function readChoice() {
    try {
      var value = JSON.parse(localStorage.getItem(storeKey));
      if (value && value.version === version && typeof value.allowed === 'boolean' &&
          Number.isFinite(value.at) && value.at <= Date.now() &&
          value.expires === value.at + maxAge && value.expires > Date.now()) return value;
    } catch (_) { /* Speicher nicht verfügbar: gilt als keine Zustimmung. */ }
    return null;
  }
  var choice = readChoice();

  function resizeBanner() {
    document.body.style.setProperty('--consent-height', banner.hidden ? '0px' : banner.offsetHeight + 'px');
  }
  function showBanner(focus) {
    banner.hidden = false;
    close.hidden = !choice;
    settings.setAttribute('aria-expanded', 'true');
    resizeBanner();
    if (focus) { returnFocus = document.activeElement; document.getElementById('consent-title').focus(); }
  }
  function hideBanner() {
    banner.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    resizeBanner();
    if (returnFocus) { returnFocus.focus(); returnFocus = null; }
  }

  function startCalendar() {
    if (started || !choice || !choice.allowed) return;
    started = true;
    notice.hidden = true;
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; var s = d.createElement('script'); s.src = A; s.async = true; s.onerror = function(){ booking.classList.remove('loaded'); }; d.head.appendChild(s); cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', 'robin-james-lewis', { origin: 'https://app.cal.com' });
    Cal.ns['robin-james-lewis']('inline', { elementOrSelector: '#cal-embed', calLink: currentCalLink(),
      config: { theme: 'light', layout: 'month_view', useSlotsViewOnSmallScreen: 'true' } });
    Cal.ns['robin-james-lewis']('ui', { theme: 'light', hideEventTypeDetails: true, layout: 'month_view',
      cssVarsPerTheme: { light: { 'cal-brand': '#D97932', 'cal-brand-emphasis': '#D97932', 'cal-brand-text': '#1F1F1F',
        'cal-bg': '#F3EFE5', 'cal-bg-emphasis': '#EDE5D8', 'cal-bg-subtle': '#F3EFE5', 'cal-bg-muted': '#F3EFE5',
        'cal-text': '#1F1F1F', 'cal-text-emphasis': '#1F1F1F', 'cal-text-subtle': '#5C5C5C', 'cal-text-muted': '#5C5C5C',
        'cal-border': '#DFD5C5', 'cal-border-emphasis': '#D97932', 'cal-border-subtle': '#E8DFD1', 'cal-border-booker': '#DFD5C5' } } });
    Cal.ns['robin-james-lewis']('on', { action: 'linkReady', callback: function () { booking.classList.add('loaded'); } });
  }

  function checkExpiry() {
    clearTimeout(expiryTimer);
    if (!choice) return;
    if (Date.now() >= choice.expires) {
      choice = null;
      if (started) { location.reload(); return; }
      showBanner(false);
      return;
    }
    // Timer reichen nur etwa 24 Tage; lange offene Tabs prüfen täglich nach.
    expiryTimer = setTimeout(checkExpiry, Math.min(choice.expires - Date.now(), 86400000));
  }

  function choose(allowed) {
    var now = Date.now();
    choice = { allowed: allowed, at: now, expires: now + maxAge, version: version };
    try { localStorage.setItem(storeKey, JSON.stringify(choice)); } catch (_) {}
    hideBanner();
    // Beim Widerruf räumt ein Neuladen Skript und Iframe des Anbieters vollständig ab.
    if (!allowed && started) { location.reload(); return; }
    notice.hidden = allowed;
    if (allowed) startCalendar();
    settings.focus();
    checkExpiry();
  }

  document.getElementById('consent-allow').addEventListener('click', function () { choose(true); });
  document.getElementById('consent-deny').addEventListener('click', function () { choose(false); });
  settings.addEventListener('click', function () { showBanner(true); });
  close.addEventListener('click', hideBanner);
  banner.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && choice) hideBanner();
  });
  document.getElementById('consent-privacy').addEventListener('click', function () {
    document.getElementById('privacy').open = true;
  });
  // Entscheidung in einem anderen Tab übernehmen.
  window.addEventListener('storage', function (event) {
    if (event.key !== storeKey && event.key !== null) return;
    var next = readChoice();
    if (started && (!next || !next.allowed)) { location.reload(); return; }
    choice = next;
    if (!choice) showBanner(false);
    else { hideBanner(); notice.hidden = choice.allowed; if (choice.allowed) startCalendar(); }
    checkExpiry();
  });
  window.addEventListener('pageshow', checkExpiry);
  document.addEventListener('visibilitychange', checkExpiry);
  window.addEventListener('resize', resizeBanner);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resizeBanner).observe(banner);

  settings.hidden = false;
  notice.hidden = !!(choice && choice.allowed);
  if (!choice) showBanner(false);
  else if (choice.allowed) startCalendar();
  checkExpiry();
})();
