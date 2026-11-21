/* Gryd — banner de cookies con consentimiento previo + formulario de contacto. Sin dependencias. */
(function () {
  "use strict";

  // ---- Configuración -------------------------------------------------------
  // Si algún día agregás Google Analytics, poné tu ID (ej. "G-XXXXXXX") y
  // sumá https://www.googletagmanager.com y https://*.google-analytics.com al CSP de vercel.json.
  var GA_ID = "";
  var CONSENT_KEY = "gryd_consent_v1";

  // ---- Utilidades de almacenamiento (nunca rompen la página) ---------------
  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); } catch (e) { return null; }
  }
  function saveConsent(c) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) { /* modo privado */ }
  }

  // ---- Scripts de medición: solo se cargan con consentimiento --------------
  var analyticsLoaded = false;
  function loadAnalytics() {
    if (analyticsLoaded || !GA_ID) return;
    analyticsLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }
  function applyConsent(c) { if (c && c.analytics) loadAnalytics(); }

  // ---- Banner ---------------------------------------------------------------
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  function showBanner(openPrefs) {
    var old = document.getElementById("cookie-banner");
    if (old) old.remove();
    var current = readConsent() || { analytics: false };

    var box = el("div", { id: "cookie-banner", class: "cookie", role: "dialog", "aria-live": "polite", "aria-label": "Preferencias de cookies" });
    var inner = el("div", { class: "cookie-in" });
    var p = el("p");
    p.appendChild(document.createTextNode("Usamos solo lo necesario para que el sitio funcione. Las cookies de medición se activan únicamente si las aceptás. "));
    var link = el("a", { href: "/privacidad#cookies" }, "Más información");
    p.appendChild(link);

    var actions = el("div", { class: "actions" });
    var bReject = el("button", { type: "button", class: "btn btn-ghost" }, "Rechazar");
    var bConfig = el("button", { type: "button", class: "btn btn-ghost", "aria-expanded": "false", "aria-controls": "cookie-prefs" }, "Configurar");
    var bAccept = el("button", { type: "button", class: "btn" }, "Aceptar");
    actions.append(bReject, bConfig, bAccept);

    var prefs = el("div", { class: "cookie-prefs", id: "cookie-prefs" });
    prefs.hidden = true;
    var l1 = el("label");
    var c1 = el("input", { type: "checkbox", checked: "", disabled: "" });
    l1.append(c1, el("span", null, "Necesarias: guardan tu elección sobre cookies. Siempre activas."));
    var l2 = el("label", { for: "ck-analytics" });
    var c2 = el("input", { type: "checkbox", id: "ck-analytics" });
    c2.checked = !!current.analytics;
    l2.append(c2, el("span", null, "Medición: estadísticas anónimas de visitas para mejorar el sitio."));
    var bSave = el("button", { type: "button", class: "btn" }, "Guardar preferencias");
    prefs.append(l1, l2, bSave);

    inner.append(p, actions, prefs);
    box.appendChild(inner);
    document.body.appendChild(box);

    function done(analytics) {
      var c = { analytics: !!analytics, date: new Date().toISOString() };
      saveConsent(c);
      applyConsent(c);
      box.remove();
    }
    bAccept.addEventListener("click", function () { done(true); });
    bReject.addEventListener("click", function () { done(false); });
    bSave.addEventListener("click", function () { done(c2.checked); });
    bConfig.addEventListener("click", function () {
      prefs.hidden = !prefs.hidden;
      bConfig.setAttribute("aria-expanded", String(!prefs.hidden));
      if (!prefs.hidden) c2.focus();
    });
    if (openPrefs) { prefs.hidden = false; bConfig.setAttribute("aria-expanded", "true"); }
  }

  // ---- Formulario -----------------------------------------------------------
  function initForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var btn = document.getElementById("enviar");
    var consent = document.getElementById("acepto");
    var status = document.getElementById("form-status");
    var ts = document.getElementById("ts");
    ts.value = String(Date.now());

    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = "status" + (kind ? " " + kind : "");
    }
    consent.addEventListener("change", function () { btn.disabled = !consent.checked; });

    var EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
    function validate(d) {
      if (d.nombre.length < 2 || d.nombre.length > 80) return ["nombre", "Escribí tu nombre (entre 2 y 80 caracteres)."];
      if (!EMAIL_RE.test(d.email) || d.email.length > 120) return ["email", "Revisá el email: parece incompleto."];
      if (d.mensaje.length < 10 || d.mensaje.length > 2000) return ["mensaje", "Contame un poco más del proyecto (mínimo 10 caracteres)."];
      if (!d.acepto) return ["acepto", "Para enviar tenés que aceptar la Política de Privacidad."];
      return null;
    }

    var sending = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var d = {
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        mensaje: form.mensaje.value.trim(),
        acepto: consent.checked,
        empresa_web: form.empresa_web.value,
        ts: ts.value
      };
      var err = validate(d);
      if (err) {
        setStatus(err[1], "err");
        var f = document.getElementById(err[0]);
        if (f) { f.setAttribute("aria-invalid", "true"); f.focus(); }
        return;
      }
      ["nombre", "email", "mensaje"].forEach(function (id) { document.getElementById(id).removeAttribute("aria-invalid"); });

      sending = true;
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Enviando…";
      setStatus("", "");

      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            ts.value = String(Date.now());
            setStatus("¡Listo! Recibí tu consulta y te respondo a la brevedad.", "ok");
          } else {
            setStatus(res.j.error || "No se pudo enviar. Probá de nuevo o escribime por WhatsApp.", "err");
          }
        })
        .catch(function () {
          setStatus("No hay conexión o el servidor tardó demasiado. Probá de nuevo o escribime por WhatsApp.", "err");
        })
        .then(function () {
          clearTimeout(timer);
          sending = false;
          btn.textContent = label;
          btn.disabled = !consent.checked;
        });
    });
  }

  // ---- Arranque -------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());

    var c = readConsent();
    if (c) applyConsent(c); else showBanner(false);

    document.querySelectorAll("[data-cookie-settings]").forEach(function (b) {
      b.addEventListener("click", function () { showBanner(true); });
    });
    initForm();
  });
})();
