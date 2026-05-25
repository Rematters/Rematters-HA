/**
 * Category color field: visible swatch, hex label, close native picker after selection.
 */
(function (global) {
  function sync() {
    const input = document.getElementById("category-color");
    if (!input) return;
    const swatch = document.getElementById("category-color-swatch");
    const hex = document.getElementById("category-color-hex");
    const value = input.value || "#6366f1";
    if (swatch) swatch.style.backgroundColor = value;
    if (hex) hex.textContent = value.toUpperCase();
  }

  function bind() {
    const input = document.getElementById("category-color");
    if (!input || input.dataset.colorPickerBound === "1") return;
    input.dataset.colorPickerBound = "1";

    input.addEventListener("input", sync);
    input.addEventListener("change", () => {
      sync();
      input.blur();
    });

    sync();
  }

  global.RemattersCategoryColor = { bind, sync };
})(typeof window !== "undefined" ? window : globalThis);
