/**
 * Ingress UI translations. Default locale: en.
 * Switch via header dropdown, ?lang=, or localStorage rematters_locale.
 */
(function (global) {
  const STORAGE_KEY = "rematters_locale";
  const LOCALE_CHOSEN_KEY = "rematters_locale_chosen";
  const DEFAULT_LOCALE = "en";
  const SUPPORTED = ["en", "nl", "de", "fr", "es", "it"];

  /** Native language names for the locale dropdown. */
  const LOCALE_LABELS = {
    en: "English",
    nl: "Nederlands",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
  };

  let locale = DEFAULT_LOCALE;
  let strings = {};

  function t(key, vars) {
    let text = strings[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  }

  function resolveLocale(requested) {
    if (requested && SUPPORTED.includes(requested)) return requested;
    const param = new URLSearchParams(location.search).get("lang");
    if (param && SUPPORTED.includes(param)) return param;
    if (localStorage.getItem(LOCALE_CHOSEN_KEY) === "1") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    }
    return DEFAULT_LOCALE;
  }

  async function loadLocaleFile(code) {
    const res = await fetch(`./static/locales/${code}.json`);
    if (!res.ok) throw new Error(`Locale ${code} not found`);
    return res.json();
  }

  function applyToDom() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key) el.title = t(key);
    });
    syncLocaleSelect();
  }

  function syncLocaleSelect() {
    const sel = document.getElementById("locale-select");
    if (!sel) return;
    if (!SUPPORTED.includes(locale)) {
      sel.value = DEFAULT_LOCALE;
      return;
    }
    sel.value = locale;
  }

  function bindLocaleSelect() {
    const sel = document.getElementById("locale-select");
    if (!sel || sel.dataset.localeBound === "1") return;
    sel.dataset.localeBound = "1";
    SUPPORTED.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LOCALE_LABELS[code] || code;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      const code = sel.value;
      if (!SUPPORTED.includes(code) || code === locale) return;
      setLocale(code);
    });
    syncLocaleSelect();
  }

  async function setLocale(next) {
    locale = resolveLocale(next);
    localStorage.setItem(STORAGE_KEY, locale);
    localStorage.setItem(LOCALE_CHOSEN_KEY, "1");
    document.documentElement.lang = locale;
    try {
      strings = await loadLocaleFile(locale);
    } catch {
      strings = await loadLocaleFile(DEFAULT_LOCALE);
      locale = DEFAULT_LOCALE;
    }
    applyToDom();
    refreshDynamicUi();
    global.dispatchEvent(new CustomEvent("rematters:locale", { detail: { locale } }));
  }

  function refreshDynamicUi() {
    if (typeof global.RemattersUI?.refreshBackupStatus === "function") {
      global.RemattersUI.refreshBackupStatus();
    }
  }

  async function initI18n() {
    bindLocaleSelect();
    locale = resolveLocale();
    document.documentElement.lang = locale;
    try {
      strings = await loadLocaleFile(locale);
    } catch {
      strings = await loadLocaleFile(DEFAULT_LOCALE);
      locale = DEFAULT_LOCALE;
      document.documentElement.lang = locale;
    }
    applyToDom();
    refreshDynamicUi();
  }

  global.RemattersI18n = {
    t,
    initI18n,
    setLocale,
    getLocale: () => locale,
    SUPPORTED,
    LOCALE_LABELS,
  };
})(window);
