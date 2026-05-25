/**
 * Shared Matter sticker cards (Rematters Cloud + HA Ingress).
 * Sticker is HTML/CSS (official matter_logo.svg + qr.png + pin).
 */
(function (global) {
  const LABELS = { share: "Share", edit: "Edit", delete: "Delete" };

  /** Match QR width on sticker (viewBox 338.667 × 72.644). */
  const MATTER_STICKER_QR = 220;
  const MATTER_LOGO_WIDTH = MATTER_STICKER_QR;
  const MATTER_LOGO_HEIGHT = Math.round(MATTER_STICKER_QR * (72.644 / 338.667));

  function hasMtPayload(code) {
    const q = String(code.qr_payload || "").trim();
    return q.toUpperCase().startsWith("MT:");
  }

  function displayManual(code) {
    const manual = String(code.manual_code || "").trim();
    if (!manual) return "";
    const digits = manual.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
    }
    return manual;
  }

  function matterBrandHtml(opts) {
    const assetsPrefix = opts.assetsPrefix || "/assets";
    return `<div class="matter-sticker-brand" aria-label="matter">
      <img class="matter-sticker-logo" src="${assetsPrefix}/matter_logo.svg" alt="" width="${MATTER_LOGO_WIDTH}" height="${MATTER_LOGO_HEIGHT}" decoding="async" />
    </div>`;
  }

  function qrSlotHtml(code, opts) {
    const apiPrefix = opts.qrApiPrefix || "/api";
    const hasMt = hasMtPayload(code);
    if (hasMt) {
      return `<div class="matter-sticker-qr-slot">
        <img class="matter-sticker-qr" src="${apiPrefix}/codes/${code.id}/qr.png" alt="" width="220" height="220" loading="lazy" decoding="async" />
      </div>`;
    }
    return `<div class="matter-sticker-qr-slot" aria-hidden="true">
      <div class="matter-sticker-qr-placeholder">
        <svg class="matter-sticker-qr-ph-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
          <path fill="currentColor" stroke="none" d="M7 12h.01M12 12h.01M17 12h.01M12 17h.01"/>
        </svg>
      </div>
    </div>`;
  }

  function buildStickerHtml(code, opts) {
    const escapeHtml = opts.escapeHtml;
    const hasMt = hasMtPayload(code);
    const pin = displayManual(code);
    const brand = matterBrandHtml(opts);

    if (!hasMt && !pin) {
      return `
        <div class="matter-sticker matter-sticker--empty">
          <div class="matter-sticker-box">
            ${brand}
            <p class="matter-sticker-empty-msg">No setup code yet</p>
          </div>
        </div>`;
    }

    const pinBlock = pin
      ? `<p class="matter-sticker-pin">${escapeHtml(pin)}</p>`
      : "";

    return `
      <div class="matter-sticker">
        <div class="matter-sticker-box matter-sticker-box--full">
          ${brand}
          ${qrSlotHtml(code, opts)}
          ${pinBlock}
        </div>
      </div>`;
  }

  function buildCodeCardHtml(code, opts) {
    const escapeHtml = opts.escapeHtml;
    const iconsHref = opts.iconsHref || "/brand/icons.svg";
    const icons =
      global.RemattersVaultShareUi?.cardIconButtonsHtml({
        iconsHref,
        showShare: true,
        shareLabel: LABELS.share,
        editLabel: LABELS.edit,
        deleteLabel: LABELS.delete,
      }) || "";

    return `
      <div class="matter-label-wrap">
        <div class="card-actions-overlay">${icons}</div>
        ${buildStickerHtml(code, opts)}
      </div>
      <p class="code-card-caption" title="${escapeHtml(code.name)}">${escapeHtml(code.name)}</p>
    `;
  }

  function wireCodeCard(card, code, handlers) {
    const shareBtn = card.querySelector("[data-share]");
    if (shareBtn && handlers.onShare) {
      shareBtn.onclick = (e) => {
        e.stopPropagation();
        handlers.onShare(code);
      };
    }
    const editBtn = card.querySelector("[data-edit]");
    if (editBtn && handlers.onEdit) {
      editBtn.onclick = (e) => {
        e.stopPropagation();
        handlers.onEdit(code);
      };
    }
    const delBtn = card.querySelector("[data-delete]");
    if (delBtn && handlers.onDelete) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        handlers.onDelete(code.id);
      };
    }
  }

  function categoryNameDefault(vault, categoryId) {
    const c = vault.categories.find((x) => x.id === categoryId);
    return c ? c.name : "Uncategorized";
  }

  function fillCategorySelect(selectEl, vault) {
    selectEl.innerHTML = `<option value="">No category</option>`;
    for (const cat of vault.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      selectEl.appendChild(opt);
    }
  }

  global.RemattersVaultCards = {
    LABELS,
    hasMtPayload,
    displayManual,
    buildCodeCardHtml,
    wireCodeCard,
    categoryNameDefault,
    fillCategorySelect,
  };
})(typeof window !== "undefined" ? window : globalThis);
