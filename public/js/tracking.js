/* Tracking do navegador: Meta Pixel + réplica server-side (CAPI) com o mesmo event_id. */
(function () {
  var cfg = window.__TA || {};
  var pixelId = cfg.pixelId;

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  }

  // Pixel base
  if (pixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', pixelId);
  }

  function serverEvent(name, params, eventId) {
    try {
      var body = JSON.stringify({ name: name, eventId: eventId, params: params || {}, url: location.href });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
      else fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true });
    } catch (e) {}
  }

  /** taTrack('ViewContent', {content_name: 'Black'}, eventIdOpcional, {server: true}) */
  window.taTrack = function (name, params, eventId, opts) {
    opts = opts || {};
    eventId = eventId || uuid();
    if (window.fbq) fbq('track', name, params || {}, { eventID: eventId });
    if (opts.server !== false) serverEvent(name, params, eventId);
    return eventId;
  };

  // PageView em toda página (browser + server, deduplicado)
  var pvId = uuid();
  if (window.fbq) fbq('track', 'PageView', {}, { eventID: pvId });
  serverEvent('PageView', {}, pvId);

  // Eventos declarativos: data-track="ViewContent" data-track-params='{"content_name":"x"}'
  document.querySelectorAll('[data-track-view]').forEach(function (el) {
    var p = {}; try { p = JSON.parse(el.getAttribute('data-track-params') || '{}'); } catch (e) {}
    window.taTrack(el.getAttribute('data-track-view'), p);
  });
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest('[data-track-click]');
    if (!el) return;
    var p = {}; try { p = JSON.parse(el.getAttribute('data-track-params') || '{}'); } catch (e) {}
    window.taTrack(el.getAttribute('data-track-click'), p);
  }, true);

  // Lead disparado pela página /obrigado com o mesmo event_id que o servidor usou
  if (cfg.leadEventId) {
    if (window.fbq) fbq('track', 'Lead', cfg.leadParams || {}, { eventID: cfg.leadEventId });
  }
})();
