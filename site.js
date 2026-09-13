
  (function () {
    var language = window.SiteLanguage;
    function setStatus(key, ok) {
      var status = document.getElementById('status');
      status.dataset.message = key;
      status.className = ok ? 'status ok' : 'status';
      status.textContent = language.t(key);
    }
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
          // A language change starts a fresh booking selection for the other event type.
          ['date', 'slot', 'duration', 'month'].forEach(function (key) { source.searchParams.delete(key); });
          frame.src = source.href;
        }
      });
    }
    localizeCalendar();
    window.addEventListener('site-languagechange', localizeCalendar);
    new MutationObserver(localizeCalendar).observe(document.getElementById('cal-embed'), { childList: true, subtree: true });
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

    // Formular: ohne Endpunkt öffnet sich das Mailprogramm; mit data-endpoint (z. B. Formspree) wird gesendet.
    var form = document.getElementById('form'), status = document.getElementById('status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      if (f.get('company')) return; // Honigtopf
      var name = (f.get('name') || '').trim(), email = (f.get('email') || '').trim(), msg = (f.get('message') || '').trim();
      var phone = (f.get('phone') || '').trim();
      if (!name || !email || !msg || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setStatus('invalid'); return;
      }
      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        setStatus('sending');
        fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, phone: phone, message: msg }) })
          .then(function (r) { if (!r.ok) throw new Error(); setStatus('success', true); form.reset(); })
          .catch(function () { setStatus('error'); });
        return;
      }
      var subject = language.t('subject') + name;
      var body = msg + '\n\n— ' + name + '\n' + email;
      if (phone) body += '\n' + language.t('phoneBody') + ': ' + phone;
      window.location.href = 'mailto:robinjameslewis@googlemail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      setStatus('mailOpened', true);
    });
  })();
