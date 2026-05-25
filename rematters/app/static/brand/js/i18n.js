/**
 * Rematters UI translations. Default locale: en.
 * Set window.REMATTERS_LOCALE_BASE before load (e.g. "/assets/locales/" or "./static/locales/").
 */
(function (global) {
  const STORAGE_KEY = "rematters_locale";
  const LOCALE_CHOSEN_KEY = "rematters_locale_chosen";
  const DEFAULT_LOCALE = "en";
  const SUPPORTED = ["en", "nl", "de", "fr", "es", "it"];

  const LOCALE_LABELS = {
    en: "English",
    nl: "Nederlands",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
  };

  const LOCALE_FLAGS = {
    en: "🇬🇧",
    nl: "🇳🇱",
    de: "🇩🇪",
    fr: "🇫🇷",
    es: "🇪🇸",
    it: "🇮🇹",
  };

  function localeBase() {
    const base = global.REMATTERS_LOCALE_BASE || "/assets/locales/";
    return base.endsWith("/") ? base : base + "/";
  }

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
    const res = await fetch(`${localeBase()}${code}.json`);
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
    syncLocaleUi();
  }

  function syncLocaleUi() {
    const code = SUPPORTED.includes(locale) ? locale : DEFAULT_LOCALE;
    document.querySelectorAll(".locale-trigger-flag").forEach((el) => {
      el.textContent = LOCALE_FLAGS[code] || LOCALE_FLAGS.en;
    });
    document.querySelectorAll("[data-locale-set]").forEach((btn) => {
      const active = btn.getAttribute("data-locale-set") === code;
      btn.classList.toggle("is-active", active);
      if (btn.getAttribute("role") === "option") {
        btn.setAttribute("aria-selected", active ? "true" : "false");
      }
    });
  }

  function clearLocaleMenuPosition(menu) {
    menu.classList.remove("locale-dropdown-menu--open");
    menu.style.position = "";
    menu.style.top = "";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.minWidth = "";
    menu.style.zIndex = "";
  }

  function positionLocaleMenu(menu, trigger) {
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    menu.classList.add("locale-dropdown-menu--open");
    menu.style.position = "fixed";
    menu.style.top = rect.bottom + gap + "px";
    menu.style.right = Math.max(8, global.innerWidth - rect.right) + "px";
    menu.style.left = "auto";
    menu.style.minWidth = Math.max(rect.width, 52) + "px";
    menu.style.zIndex = "1000";
  }

  function closeAllLocaleDropdowns() {
    document.querySelectorAll("[data-locale-dropdown]").forEach((root) => {
      const menu = root.querySelector(".locale-dropdown-menu");
      const trigger = root.querySelector(".locale-dropdown-trigger");
      if (!menu || !trigger) return;
      menu.hidden = true;
      clearLocaleMenuPosition(menu);
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  function toggleLocaleDropdown(root) {
    const menu = root.querySelector(".locale-dropdown-menu");
    const trigger = root.querySelector(".locale-dropdown-trigger");
    if (!menu || !trigger) return;
    const open = menu.hidden;
    closeAllLocaleDropdowns();
    if (open) {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      positionLocaleMenu(menu, trigger);
    }
  }

  function bindLocaleDropdown() {
    if (document.documentElement.dataset.localeBound === "1") return;
    document.documentElement.dataset.localeBound = "1";

    document.querySelectorAll("[data-locale-set]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = btn.getAttribute("data-locale-set");
        if (!code || !SUPPORTED.includes(code) || code === locale) {
          closeAllLocaleDropdowns();
          return;
        }
        setLocale(code);
        closeAllLocaleDropdowns();
      });
    });

    document.querySelectorAll(".locale-dropdown-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const root = trigger.closest("[data-locale-dropdown]");
        if (root) toggleLocaleDropdown(root);
      });
    });

    document.querySelectorAll(".locale-dropdown-menu").forEach((menu) => {
      menu.addEventListener("click", (e) => e.stopPropagation());
    });

    document.addEventListener("click", () => closeAllLocaleDropdowns());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllLocaleDropdowns();
    });
    global.addEventListener("resize", closeAllLocaleDropdowns);
    global.addEventListener("scroll", closeAllLocaleDropdowns, true);
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
    bindLocaleDropdown();
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
    LOCALE_FLAGS,
  };
})(window);
