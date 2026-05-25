/**
 * Rematters theme: light | dark | auto (system).
 * Preference key: rematters-theme
 */
(function () {
  var STORAGE_KEY = "rematters-theme";
  var MODES = ["light", "dark", "auto"];
  var ICON_IDS = {
    light: "rm-icon-sun",
    dark: "rm-icon-moon",
    auto: "rm-icon-auto",
  };

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function resolve(mode) {
    return mode === "auto" ? systemTheme() : mode;
  }

  function getStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return MODES.indexOf(v) >= 0 ? v : "light";
    } catch (e) {
      return "light";
    }
  }

  function apply(mode) {
    var resolved = resolve(mode);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) { /* ignore */ }
    updateToggleUI(mode);
  }

  function updateToggleUI(mode) {
    document.querySelectorAll("[data-theme-set]").forEach(function (btn) {
      var active = btn.getAttribute("data-theme-set") === mode;
      btn.classList.toggle("is-active", active);
      if (btn.getAttribute("role") === "option") {
        btn.setAttribute("aria-selected", active ? "true" : "false");
      } else {
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      }
    });
    document.querySelectorAll("[data-theme-dropdown]").forEach(function (root) {
      var use = root.querySelector(".theme-dropdown-use");
      if (!use) return;
      var base = root.getAttribute("data-icons-href") || "/brand/icons.svg";
      var id = ICON_IDS[mode] || ICON_IDS.light;
      use.setAttribute("href", base + "#" + id);
    });
  }

  function clearMenuPosition(menu) {
    menu.classList.remove("theme-dropdown-menu--open");
    menu.style.position = "";
    menu.style.top = "";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.minWidth = "";
    menu.style.zIndex = "";
  }

  function positionMenu(menu, trigger) {
    var rect = trigger.getBoundingClientRect();
    var gap = 6;
    menu.classList.add("theme-dropdown-menu--open");
    menu.style.position = "fixed";
    menu.style.top = rect.bottom + gap + "px";
    menu.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
    menu.style.left = "auto";
    menu.style.minWidth = Math.max(rect.width, 152) + "px";
    menu.style.zIndex = "1000";
  }

  function closeAllDropdowns() {
    document.querySelectorAll("[data-theme-dropdown]").forEach(function (root) {
      var menu = root.querySelector(".theme-dropdown-menu");
      var trigger = root.querySelector(".theme-dropdown-trigger");
      if (!menu || !trigger) return;
      menu.hidden = true;
      clearMenuPosition(menu);
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  function toggleDropdown(root) {
    var menu = root.querySelector(".theme-dropdown-menu");
    var trigger = root.querySelector(".theme-dropdown-trigger");
    if (!menu || !trigger) return;
    var open = menu.hidden;
    closeAllDropdowns();
    if (open) {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      positionMenu(menu, trigger);
    }
  }

  function bindToggles() {
    document.querySelectorAll("[data-theme-set]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        apply(btn.getAttribute("data-theme-set"));
        closeAllDropdowns();
      });
    });

    document.querySelectorAll(".theme-dropdown-trigger").forEach(function (trigger) {
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var root = trigger.closest("[data-theme-dropdown]");
        if (root) toggleDropdown(root);
      });
    });

    document.querySelectorAll(".theme-dropdown-menu").forEach(function (menu) {
      menu.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });

    document.addEventListener("click", function () {
      closeAllDropdowns();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllDropdowns();
    });

    window.addEventListener("resize", closeAllDropdowns);
    window.addEventListener(
      "scroll",
      function () {
        closeAllDropdowns();
      },
      true
    );
  }

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", function () {
    if (getStored() === "auto") {
      apply("auto");
    }
  });

  function init() {
    apply(getStored());
    bindToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.RemattersTheme = { apply: apply, get: getStored };
})();
