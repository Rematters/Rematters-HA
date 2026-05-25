/**
 * Shared Matter sticker cards (Rematters Cloud + HA Ingress).
 */
(function (global) {
  const LABELS = { share: "Share", edit: "Edit", delete: "Delete" };

  function hasMtPayload(code) {
    const q = String(code.qr_payload || "").trim();
    return q.toUpperCase().startsWith("MT:");
  }

  function hasLabelContent(code) {
    return hasMtPayload(code) || String(code.manual_code || "").trim() !== "";
  }

  function buildCodeCardHtml(code, opts) {
    const escapeHtml = opts.escapeHtml;
    const iconsHref = opts.iconsHref || "/brand/icons.svg";
    const apiPrefix = opts.qrApiPrefix || "/api";
    const showLabel = hasLabelContent(code);
    const icons =
      global.RemattersVaultShareUi?.cardIconButtonsHtml({
        iconsHref,
        showShare: true,
        shareLabel: LABELS.share,
        editLabel: LABELS.edit,
        deleteLabel: LABELS.delete,
      }) || "";

    const labelImg = showLabel
      ? `<img class="matter-label" src="${apiPrefix}/codes/${code.id}/label.png" alt="" width="342" height="469" loading="lazy" decoding="async" />`
      : `<div class="matter-label-empty"><span>matter</span><p>No setup code yet</p></div>`;

    return `
      <div class="matter-label-wrap">
        <div class="card-actions-overlay" aria-hidden="false">${icons}</div>
        ${labelImg}
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
    hasLabelContent,
    buildCodeCardHtml,
    wireCodeCard,
    categoryNameDefault,
    fillCategorySelect,
  };
})(typeof window !== "undefined" ? window : globalThis);
