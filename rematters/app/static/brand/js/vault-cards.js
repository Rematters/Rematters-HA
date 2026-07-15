/**
 * Shared vault cards (Matter + HomeKit stickers) for Cloud + HA Ingress.
 */
(function (global) {
  function actionLabel(key, fallback) {
    const i18n = global.RemattersI18n;
    return i18n && typeof i18n.t === "function"
      ? i18n.t("action." + key)
      : fallback;
  }

  function codeProtocol(code) {
    const ct = String(code?.code_type || "").toLowerCase();
    if (ct === "zwave" || ct === "homekit") return ct;
    const ZW = global.RemattersZWavePayload;
    if (ZW?.hasScannableQr?.(code?.qr_payload)) return "zwave";
    const q = String(code.qr_payload || "").trim();
    if (q.toUpperCase().startsWith("X-HM://")) return "homekit";
    if (q.toUpperCase().startsWith("MT:")) return "matter";
    return "matter";
  }

  function hasMtPayload(code) {
    const q = String(code.qr_payload || "").trim();
    return q.toUpperCase().startsWith("MT:");
  }

  function displayManual(code) {
    if (codeProtocol(code) === "homekit") {
      const HK = global.RemattersHomeKitPayload;
      if (HK) return HK.formatPairingDisplay(code.manual_code);
    }
    if (codeProtocol(code) === "zwave") {
      const ZW = global.RemattersZWavePayload;
      if (ZW) return ZW.formatDskDisplay(code.manual_code);
    }
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
      <img class="matter-sticker-logo" src="${assetsPrefix}/matter_logo.svg" alt="" decoding="async" />
    </div>`;
  }

  function qrSlotHtml(code, opts) {
    const apiPrefix = opts.qrApiPrefix || "/api";
    const hasMt = hasMtPayload(code);
    if (hasMt) {
      return `<div class="matter-sticker-qr-slot">
        <img class="matter-sticker-qr" src="${apiPrefix}/codes/${code.id}/qr.png?fit=1" alt="" loading="lazy" decoding="async" />
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

  function buildMatterStickerHtml(code, opts) {
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

  function buildHomeKitStickerHtml(code, opts) {
    const apiPrefix = opts.qrApiPrefix || "/api";
    const HK = global.RemattersHomeKitPayload;
    const hasQr =
      HK && typeof HK.hasScannableQr === "function"
        ? HK.hasScannableQr(code.qr_payload)
        : String(code.qr_payload || "")
            .toUpperCase()
            .startsWith("X-HM://");
    if (!hasQr) {
      return `<div class="homekit-sticker homekit-sticker--empty">
        <p class="matter-sticker-empty-msg">No HomeKit code yet</p>
      </div>`;
    }
    return `<div class="homekit-sticker">
      <img class="homekit-sticker-img" src="${apiPrefix}/codes/${code.id}/card.svg" alt="" loading="lazy" decoding="async" />
    </div>`;
  }

  function buildZWaveStickerHtml(code, opts) {
    const apiPrefix = opts.qrApiPrefix || "/api";
    const ZW = global.RemattersZWavePayload;
    const hasQr = ZW?.hasScannableQr?.(code.qr_payload);
    if (!hasQr) {
      const dsk = displayManual(code);
      if (!dsk) {
        return `<div class="zwave-sticker zwave-sticker--empty">
          <p class="matter-sticker-empty-msg">No Z-Wave code yet</p>
        </div>`;
      }
      return `<div class="zwave-sticker zwave-sticker--dsk-only">
        <p class="zwave-sticker-brand">Z-Wave</p>
        <p class="zwave-sticker-pin">PIN ${opts.escapeHtml(ZW?.pinFromDsk?.(dsk) || "")}</p>
        <p class="zwave-sticker-dsk">${opts.escapeHtml(dsk)}</p>
      </div>`;
    }
    return `<div class="zwave-sticker">
      <img class="zwave-sticker-img" src="${apiPrefix}/codes/${code.id}/card.svg" alt="" loading="lazy" decoding="async" />
    </div>`;
  }

  function buildStickerHtml(code, opts) {
    const proto = codeProtocol(code);
    if (proto === "homekit") return buildHomeKitStickerHtml(code, opts);
    if (proto === "zwave") return buildZWaveStickerHtml(code, opts);
    return buildMatterStickerHtml(code, opts);
  }

  function buildCodeCardHtml(code, opts) {
    const escapeHtml = opts.escapeHtml;
    const iconsHref = opts.iconsHref || "/brand/icons.svg";
    const proto = codeProtocol(code);
    const icons =
      global.RemattersVaultShareUi?.cardIconButtonsHtml({
        iconsHref,
        showShare: proto === "matter",
        shareLabel: actionLabel("share", "Share"),
        editLabel: actionLabel("edit", "Edit"),
        deleteLabel: actionLabel("delete", "Delete"),
      }) || "";

    const wrapClass =
      proto === "homekit"
        ? "homekit-label-wrap"
        : proto === "zwave"
          ? "zwave-label-wrap"
          : "matter-label-wrap";
    const cardClass =
      proto === "homekit"
        ? "code-card homekit-sticker-card"
        : proto === "zwave"
          ? "code-card zwave-sticker-card"
          : "code-card matter-sticker-card";

    return `
      <div class="${wrapClass}">
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
    const none =
      global.RemattersI18n?.t?.("categories.none") ?? "Uncategorized";
    return c ? c.name : none;
  }

  function fillCategorySelect(sel, vault) {
    const none =
      global.RemattersI18n?.t?.("code.category_none") ?? "No category";
    sel.innerHTML = `<option value="">${none}</option>`;
    for (const cat of vault.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      sel.appendChild(opt);
    }
  }

  global.RemattersVaultCards = {
    actionLabel,
    codeProtocol,
    hasMtPayload,
    displayManual,
    buildCodeCardHtml,
    wireCodeCard,
    categoryNameDefault,
    fillCategorySelect,
  };
})(typeof window !== "undefined" ? window : globalThis);
