/*
 * Tracking da página (v2). Duas partes independentes:
 *  1) Meta: Pixel no navegador + cópia no servidor (CAPI) com o mesmo event_id, para deduplicar.
 *  2) Comportamento: ações na página gravadas no nosso banco (sessoes + comportamento). Não vai para a Meta.
 * Guia dos dados: ANALISE.md na raiz do app.
 */
(function () {
  var cfg = window.__TA || {};
  var pixelId = cfg.pixelId;
  var T0 = Date.now();
  var PAGINA = location.pathname;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  }
  function cookie(n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; }
  function setCookie(n, v, seg) { document.cookie = n + '=' + encodeURIComponent(v) + '; path=/; max-age=' + seg + '; samesite=lax' + (location.protocol === 'https:' ? '; secure' : ''); }
  function beacon(url, obj) {
    try {
      var body = JSON.stringify(obj);
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true });
    } catch (e) {}
  }

  /* ---------------- 1) Meta ---------------- */
  // Eventos padrão da Meta que passam por track() (os demais vão como trackCustom). SERVIDOR: os que o /api/event
  // aceita (src/pages/api/event.ts); clique só de analytics (CliqueBio etc.) não gera POST que o servidor descartaria.
  var PADRAO = { PageView: 1, Contact: 1, Schedule: 1, InitiateCheckout: 1, AddToCart: 1 };
  var SERVIDOR = { PageView: 1, InitiateCheckout: 1, AddToCart: 1, Contact: 1, Schedule: 1, AbriuFormulario: 1 };
  if (pixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    // Advanced matching: só na /obrigado, com dados já em hash vindos do servidor
    fbq('init', pixelId, cfg.am || {});
  }

  // _fbp só existe depois que o fbevents.js (script de terceiro, assíncrono) terminar de rodar.
  // Num clique muito rápido (ex.: CTA do topo, a pessoa já clica assim que a página abre) a réplica
  // pro servidor pode sair sem esse cookie, piorando o match da CAPI. Espera até ~800ms por ele,
  // sem atrasar o Pixel (que dispara na hora, de qualquer forma).
  function aguardarFbp(cb) {
    if (cookie('_fbp') || !pixelId) return cb();
    var tentativas = 0;
    var iv = setInterval(function () {
      tentativas++;
      if (cookie('_fbp') || tentativas >= 16) { clearInterval(iv); cb(); } // 16 x 50ms = 800ms
    }, 50);
  }

  /** track('Contact', {content_name: 'x'}) -> Pixel + CAPI com o mesmo event_id */
  function track(name, params) {
    var eventId = uuid();
    if (window.fbq) fbq(PADRAO[name] ? 'track' : 'trackCustom', name, params || {}, { eventID: eventId });
    if (SERVIDOR[name]) aguardarFbp(function () { beacon('/api/event', { name: name, eventId: eventId, params: params || {}, url: location.href }); });
  }

  var pvId = uuid();
  if (window.fbq) fbq('track', 'PageView', {}, { eventID: pvId });
  aguardarFbp(function () { beacon('/api/event', { name: 'PageView', eventId: pvId, params: {}, url: location.href }); });

  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest('[data-track-click]');
    if (!el) return;
    // data-track-once="chave": manda para a Meta só uma vez por navegador (ex.: clique no grupo)
    var uma = el.getAttribute('data-track-once');
    if (uma) {
      try { if (localStorage.getItem('ta_once_' + uma)) return; localStorage.setItem('ta_once_' + uma, '1'); } catch (e) {}
    }
    var p = {}; try { p = JSON.parse(el.getAttribute('data-track-params') || '{}'); } catch (e) {}
    track(el.getAttribute('data-track-click'), p);
  }, true);

  // Lead: dispara só na /obrigado, com o mesmo event_id que o servidor já mandou pela CAPI nesta mesma carga
  if (cfg.leadEventId && window.fbq) fbq('track', 'Lead', {}, { eventID: cfg.leadEventId });

  /* ---------------- 2) Comportamento ---------------- */
  var vid = cookie('ta_vid') || uuid();
  setCookie('ta_vid', vid, 400 * 86400);
  var sid = cookie('ta_sid');
  var sessaoNova = !sid;
  if (!sid) sid = uuid();
  function renovarSessao() { setCookie('ta_sid', sid, 30 * 60); }
  renovarSessao();

  var fila = [];
  var primeiroLote = true;
  function reg(tipo, alvo, valor) { fila.push({ tipo: tipo, alvo: alvo == null ? undefined : String(alvo), valor: valor == null ? undefined : valor, t: Date.now() - T0 }); }
  function enviar() {
    if (!fila.length) return;
    var w = window.innerWidth;
    var corpo = { vid: vid, sid: sid, pagina: PAGINA, eventos: fila.splice(0, 80) };
    if (primeiroLote) {
      corpo.sessao = {
        referrer: document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : undefined,
        largura: w, altura: window.innerHeight,
        dispositivo: w < 768 ? 'celular' : w < 1024 ? 'tablet' : 'computador',
        fbclid: /[?&]fbclid=/.test(location.search),
      };
      primeiroLote = false;
    }
    renovarSessao();
    beacon('/api/comportamento', corpo);
  }
  reg('pagina', sessaoNova ? 'nova_sessao' : 'mesma_sessao');

  // Rolagem: marcos de 25, 50, 75 e 90%
  var scrollMax = 0, marcos = [25, 50, 75, 90];
  function medirScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
    if (pct <= scrollMax) return;
    scrollMax = pct;
    while (marcos.length && pct >= marcos[0]) {
      var m = marcos.shift();
      reg('scroll', null, m);
      // (Rolou75 não é mais enviado para a Meta — fica só no comportamento acima)
    }
  }
  window.addEventListener('scroll', medirScroll, { passive: true });

  // Seções: [data-secao="nome"]. Registra quando aparece e quanto tempo ficou na tela.
  var tempoSecao = {}, visiveis = {};
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var nome = en.target.getAttribute('data-secao');
        // Conta como vista com 35% da seção na tela OU ocupando 40% da altura da tela (seções altas)
        var naTela = en.isIntersecting && (en.intersectionRatio >= 0.35 || en.intersectionRect.height >= window.innerHeight * 0.4);
        if (naTela) {
          if (!(nome in tempoSecao)) { tempoSecao[nome] = 0; reg('secao_vista', nome); }
          if (!visiveis[nome]) visiveis[nome] = Date.now();
        } else if (!naTela && visiveis[nome]) {
          tempoSecao[nome] += Date.now() - visiveis[nome]; delete visiveis[nome];
        }
      });
    }, { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1] });
    document.querySelectorAll('[data-secao]').forEach(function (el) { io.observe(el); });
  }
  function fecharSecoes() { var now = Date.now(); for (var n in visiveis) { tempoSecao[n] += now - visiveis[n]; visiveis[n] = now; } }

  // Cliques: usa data-alvo; senão o content_name do botão; senão o texto.
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest('a, button, summary, [data-alvo]');
    if (!el) return;
    var alvo = el.getAttribute('data-alvo');
    if (!alvo) { try { alvo = JSON.parse(el.getAttribute('data-track-params') || '{}').content_name; } catch (e) {} }
    if (!alvo) alvo = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) || el.tagName.toLowerCase();
    var sec = el.closest('[data-secao]');
    reg('clique', alvo + (sec && alvo.indexOf(':') === -1 ? ' @' + sec.getAttribute('data-secao') : ''));
    if (el.tagName === 'A' && el.href && el.target !== '_blank') enviar(); // sai da página: manda já
  }, true);

  // Pop-up do formulário (<dialog>)
  document.querySelectorAll('dialog').forEach(function (dlg) {
    var aberto = false, abriuEm = 0;
    new MutationObserver(function () {
      if (dlg.open && !aberto) { aberto = true; abriuEm = Date.now(); reg('popup_aberto', dlg.id); }
      else if (!dlg.open && aberto) { aberto = false; reg('popup_fechado', dlg.id, Math.round((Date.now() - abriuEm) / 1000)); enviar(); }
    }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  });

  // Formulário: começou, campos tocados, erros e envio (erros e envio vêm de eventos do LeadForm)
  var formIniciado = false, camposVistos = {};
  document.addEventListener('focusin', function (ev) {
    var inp = ev.target;
    if (!inp || !inp.form || !inp.form.classList.contains('lead-form') || !inp.name || inp.type === 'hidden') return;
    if (!formIniciado) { formIniciado = true; reg('form_inicio', inp.name); }
    if (!camposVistos[inp.name]) { camposVistos[inp.name] = 1; reg('form_campo', inp.name); }
  });
  window.addEventListener('ta:form-erro', function (e) { reg('form_erro', (e.detail && e.detail.campo) || 'geral'); enviar(); });
  window.addEventListener('ta:form-envio', function () { reg('form_envio'); enviar(); });

  // Tempo ativo: aba visível e alguma interação nos últimos 30 s
  var ultimoGesto = Date.now(), ativoTotal = 0, ativoEnviado = 0;
  ['scroll', 'mousemove', 'touchstart', 'keydown', 'click'].forEach(function (t) { window.addEventListener(t, function () { ultimoGesto = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - ultimoGesto < 30000) {
      ativoTotal++;
      // (Engajou60s não é mais enviado para a Meta — fica só no comportamento acima)
    }
  }, 1000);
  function lancarTempo() { var novo = ativoTotal - ativoEnviado; if (novo > 0) { reg('tempo_ativo', null, novo); ativoEnviado = ativoTotal; } }

  setInterval(function () { lancarTempo(); enviar(); }, 10000);

  var saiu = false;
  function sair() {
    fecharSecoes();
    lancarTempo();
    if (!saiu) {
      for (var n in tempoSecao) if (tempoSecao[n] > 0) reg('secao_tempo', n, tempoSecao[n]);
      reg('saida', 'scroll_max', scrollMax);
      saiu = true;
    }
    enviar();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sair();
    else if (saiu) { saiu = false; for (var n in tempoSecao) tempoSecao[n] = 0; }
  });
  window.addEventListener('pagehide', sair);
  medirScroll();
})();
