/**
 * Rematters admin UI — relative API paths for HA ingress.
 */
const API = "./api";
const { t, initI18n, setLocale } = window.RemattersI18n;

let vault = { categories: [], codes: [] };
let activeCategoryId = null;
let cloudShareAvailable = false;
let shareUi = null;
let categoryIconPicker = null;

const BRAND_PREFIX = "./static/brand";

function ensureCategoryIconPicker() {
  if (categoryIconPicker) return categoryIconPicker;
  const Icons = window.RemattersCategoryIcons;
  const host = document.getElementById("category-icon-picker");
  const input = document.getElementById("category-icon");
  if (!Icons || !host || !input) return null;
  categoryIconPicker = Icons.mountPicker(host, {
    brandPrefix: BRAND_PREFIX,
    hiddenInput: input,
  });
  return categoryIconPicker;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.detail || res.statusText);
    e.status = res.status;
    e.existing = err.existing;
    throw e;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res;
}

async function loadVault() {
  vault = await api("/vault");
  render();
}

function categoryName(id) {
  if (window.RemattersVaultCards) {
    return window.RemattersVaultCards.categoryNameDefault(vault, id);
  }
  const c = vault.categories.find((x) => x.id === id);
  return c ? c.name : "Uncategorized";
}

function filteredCodes() {
  let codes = vault.codes;
  if (activeCategoryId) {
    codes = codes.filter((c) => c.category_id === activeCategoryId);
  }
  const q = document.getElementById("search").value.trim().toLowerCase();
  if (!q) return codes;
  return codes.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.device_type.toLowerCase().includes(q) ||
      c.manual_code.toLowerCase().includes(q) ||
      c.qr_payload.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q)
  );
}

function renderCategories() {
  const ul = document.getElementById("category-list");
  ul.innerHTML = "";
  const sorted = [...vault.categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );
  for (const cat of sorted) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "category-btn" + (activeCategoryId === cat.id ? " active" : "");
    const mark = window.RemattersCategoryIcons
      ? window.RemattersCategoryIcons.markMarkup(cat, BRAND_PREFIX)
      : `<span class="category-dot" style="background:${cat.color}"></span>`;
    btn.innerHTML = `${mark}${escapeHtml(cat.name)}`;
    btn.onclick = () => {
      activeCategoryId = cat.id;
      document.getElementById("filter-all").classList.remove("active");
      render();
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      openCategoryDialog(cat);
    };
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

function renderCodes() {
  const grid = document.getElementById("codes-grid");
  const empty = document.getElementById("empty-state");
  const codes = filteredCodes();
  grid.innerHTML = "";
  empty.classList.toggle("hidden", codes.length > 0);

  const Cards = window.RemattersVaultCards;
  for (const code of codes) {
    const card = document.createElement("article");
    const proto = Cards?.codeProtocol?.(code) || "matter";
    card.className =
      "code-card " +
      (proto === "homekit"
        ? "homekit-sticker-card"
        : proto === "zwave"
          ? "zwave-sticker-card"
          : "matter-sticker-card");
    if (Cards) {
      card.innerHTML = Cards.buildCodeCardHtml(code, {
        escapeHtml,
        categoryName,
        iconsHref: "./static/brand/icons.svg",
        assetsPrefix: "./static/assets",
        qrApiPrefix: "./api",
      });
      Cards.wireCodeCard(card, code, {
        onShare: shareUi ? (c) => shareUi.openShareDialog(c) : null,
        onEdit: openCodeDialog,
        onDelete: deleteCode,
      });
    }
    grid.appendChild(card);
  }
}

function render() {
  renderCategories();
  renderCodes();
  fillCategorySelect();
}

function fillCategorySelect() {
  const sel = document.getElementById("code-category");
  if (window.RemattersVaultCards) {
    window.RemattersVaultCards.fillCategorySelect(sel, vault);
    return;
  }
  sel.innerHTML = `<option value="">No category</option>`;
  for (const cat of vault.categories) {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    sel.appendChild(opt);
  }
}

function escapeHtml(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function syncHomeKitDerived() {
  const HK = window.RemattersHomeKitPayload;
  const hint = document.getElementById("code-homekit-derived");
  const uriEl = document.getElementById("code-homekit-uri");
  if (!HK || !hint || !uriEl) return;
  const parsed = HK.parseSetupUri(uriEl.value.trim());
  if (!parsed) {
    hint.classList.add("hidden");
    hint.textContent = "";
    return;
  }
  const decoded = HK.decodeFieldsFromUri(parsed.uri);
  let pin = HK.pairingDigits(
    document.getElementById("code-homekit-pairing")?.value || ""
  );
  if (!pin && HK.decodePairingFromUri) {
    pin = HK.decodePairingFromUri(parsed.uri);
  }
  const pairingEl = document.getElementById("code-homekit-pairing");
  if (pin && pairingEl && !pairingEl.value.trim()) {
    pairingEl.value = HK.formatPairingDisplay(pin);
  }
  document.getElementById("code-homekit-setup-id").value =
    decoded.setup_id || parsed.setupId || "";
  if (decoded.homekit_category) {
    document.getElementById("code-homekit-category").value =
      decoded.homekit_category;
  }
  const parts = [];
  if (pin) {
    parts.push(
      `${t("code.homekit_pairing")}: ${HK.formatPairingDisplay(pin)}`
    );
  }
  const sid = decoded.setup_id || parsed.setupId;
  if (sid) parts.push(`Setup ID: ${sid}`);
  if (decoded.homekit_category) {
    parts.push(`${t("code.homekit_category")}: ${decoded.homekit_category}`);
  }
  hint.textContent = parts.join(" · ");
  hint.classList.toggle("hidden", parts.length === 0);
}

function syncCodeTypeFields() {
  const type = document.getElementById("code-type")?.value || "matter";
  document.getElementById("code-fields-matter")?.classList.toggle("hidden", type !== "matter");
  document.getElementById("code-fields-homekit")?.classList.toggle("hidden", type !== "homekit");
  document.getElementById("code-fields-zwave")?.classList.toggle("hidden", type !== "zwave");
}

function openCodeDialog(code = null) {
  const dlg = document.getElementById("code-dialog");
  const proto =
    code && window.RemattersVaultCards
      ? window.RemattersVaultCards.codeProtocol(code)
      : "matter";
  document.getElementById("code-type").value = code?.code_type || proto;
  syncCodeTypeFields();
  document.getElementById("code-dialog-title").textContent = code
    ? t("code.dialog_edit")
    : t("code.dialog_new");
  document.getElementById("code-id").value = code?.id || "";
  document.getElementById("code-name").value = code?.name || "";
  document.getElementById("code-device-type").value = code?.device_type || "";
  document.getElementById("code-category").value = code?.category_id || "";
  document.getElementById("code-manual").value = code?.manual_code || "";
  document.getElementById("code-qr").value = code?.qr_payload || "";
  document.getElementById("code-homekit-pairing").value = code?.manual_code || "";
  document.getElementById("code-homekit-setup-id").value = code?.setup_id || "";
  const catEl = document.getElementById("code-homekit-category");
  if (catEl) catEl.value = code?.homekit_category || "other";
  document.getElementById("code-homekit-uri").value =
    proto === "homekit" ? code?.qr_payload || "" : "";
  if (proto === "homekit") syncHomeKitDerived();
  document.getElementById("code-zwave-dsk").value =
    proto === "zwave" ? code?.manual_code || "" : "";
  document.getElementById("code-zwave-qr").value =
    proto === "zwave" ? code?.qr_payload || "" : "";
  document.getElementById("code-notes").value = code?.notes || "";
  document.getElementById("code-ha-entity").value = code?.ha_link?.entity_id || "";
  document.getElementById("code-ha-attr").value = code?.ha_link?.attribute || "";
  dlg.showModal();
}

function openCategoryDialog(cat = null) {
  const dlg = document.getElementById("category-dialog");
  document.getElementById("category-dialog-title").textContent = cat
    ? t("categories.dialog_edit")
    : t("categories.dialog_new");
  document.getElementById("category-id").value = cat?.id || "";
  document.getElementById("category-name").value = cat?.name || "";
  document.getElementById("category-color").value = cat?.color || "#6366f1";
  window.RemattersCategoryColor?.sync();
  document.getElementById("category-icon").value =
    cat?.icon || window.RemattersCategoryIcons?.DEFAULT_ICON || "folder";
  ensureCategoryIconPicker()?.setValue(cat?.icon || "folder");
  dlg.showModal();
}

const SCAN_LIB_URL =
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js";

async function saveCode(e) {
  e.preventDefault();
  const id = document.getElementById("code-id").value;
  const codeType = document.getElementById("code-type").value || "matter";
  let body;
  if (codeType === "homekit" && window.RemattersHomeKitPayload) {
    const n = window.RemattersHomeKitPayload.normalizeFields(
      document.getElementById("code-homekit-pairing").value.trim(),
      document.getElementById("code-homekit-uri").value.trim(),
      {
        setup_id: document.getElementById("code-homekit-setup-id").value.trim(),
        homekit_category:
          document.getElementById("code-homekit-category").value || "other",
      }
    );
    body = {
      name: document.getElementById("code-name").value.trim(),
      code_type: "homekit",
      device_type: document.getElementById("code-device-type").value.trim(),
      category_id: document.getElementById("code-category").value || null,
      manual_code: n.manual_code,
      qr_payload: n.qr_payload,
      setup_id: n.setup_id,
      homekit_category: n.homekit_category,
      homekit_flag: n.homekit_flag,
      notes: document.getElementById("code-notes").value.trim(),
      ha_link: {
        entity_id: document.getElementById("code-ha-entity").value.trim() || null,
        attribute: document.getElementById("code-ha-attr").value.trim() || null,
      },
    };
  } else if (codeType === "zwave" && window.RemattersZWavePayload) {
    const n = window.RemattersZWavePayload.normalizeFields(
      document.getElementById("code-zwave-dsk").value.trim(),
      document.getElementById("code-zwave-qr").value.trim()
    );
    body = {
      name: document.getElementById("code-name").value.trim(),
      code_type: "zwave",
      device_type: document.getElementById("code-device-type").value.trim(),
      category_id: document.getElementById("code-category").value || null,
      manual_code: n.manual_code,
      qr_payload: n.qr_payload,
      zwave_pin: n.zwave_pin,
      notes: document.getElementById("code-notes").value.trim(),
      ha_link: {
        entity_id: document.getElementById("code-ha-entity").value.trim() || null,
        attribute: document.getElementById("code-ha-attr").value.trim() || null,
      },
    };
  } else {
    body = {
      name: document.getElementById("code-name").value.trim(),
      code_type: "matter",
      device_type: document.getElementById("code-device-type").value.trim(),
      category_id: document.getElementById("code-category").value || null,
      manual_code: document.getElementById("code-manual").value.trim(),
      qr_payload: document.getElementById("code-qr").value.trim(),
      notes: document.getElementById("code-notes").value.trim(),
      ha_link: {
        entity_id: document.getElementById("code-ha-entity").value.trim() || null,
        attribute: document.getElementById("code-ha-attr").value.trim() || null,
      },
    };
  }
  const dup = window.RemattersScan?.findDuplicate(vault.codes, body, id || null);
  if (dup) {
    const msg = t("scan.duplicate", { name: dup.name || t("scan.unnamed") });
    if (confirm(msg + "\n\n" + t("scan.duplicate_open"))) {
      document.getElementById("code-dialog").close();
      openCodeDialog(dup);
    }
    return;
  }
  try {
    if (id) {
      await api(`/codes/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/codes", { method: "POST", body: JSON.stringify(body) });
    }
  } catch (err) {
    if (err.status === 409 && err.existing?.id) {
      if (confirm((err.message || t("scan.duplicate", { name: "" })) + "\n\n" + t("scan.duplicate_open"))) {
        openCodeDialog(vault.codes.find((c) => c.id === err.existing.id) || null);
      }
      return;
    }
    throw err;
  }
  document.getElementById("code-dialog").close();
  await loadVault();
}

async function deleteCode(id) {
  if (!confirm(t("confirm.delete_code"))) return;
  await api(`/codes/${id}`, { method: "DELETE" });
  await loadVault();
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById("category-id").value;
  const body = {
    name: document.getElementById("category-name").value.trim(),
    color: document.getElementById("category-color").value,
    icon: document.getElementById("category-icon").value,
  };
  if (id) {
    await api(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) });
  } else {
    await api("/categories", { method: "POST", body: JSON.stringify(body) });
  }
  document.getElementById("category-dialog").close();
  await loadVault();
}

async function loadCloudStatus() {
  try {
    const s = await api("/cloud/status");
    cloudShareAvailable = Boolean(s.share_available ?? s.configured);
    const btnCloud = document.getElementById("btn-cloud-sync");
    if (btnCloud && !s.configured && s.hint) {
      btnCloud.title = s.hint;
    }
  } catch {
    cloudShareAvailable = false;
  }
}

async function loadBackupStatus() {
  try {
    const s = await api("/backup/status");
    const el = document.getElementById("backup-status");
    el.textContent = s.gdrive_configured
      ? t("backup.gdrive_active", { hours: s.interval_hours })
      : t("backup.gdrive_inactive");
  } catch {
    /* ignore */
  }
}

function bindUi() {
  window.RemattersCategoryColor?.bind();
  ensureCategoryIconPicker();
  document.getElementById("code-type").onchange = syncCodeTypeFields;
  document
    .getElementById("code-homekit-uri")
    ?.addEventListener("input", syncHomeKitDerived);
  document
    .getElementById("code-homekit-pairing")
    ?.addEventListener("input", syncHomeKitDerived);
  document.getElementById("btn-add-code").onclick = () => openCodeDialog();
  document.getElementById("btn-add-category").onclick = () => openCategoryDialog();
  document.getElementById("code-form").onsubmit = saveCode;
  document.getElementById("category-form").onsubmit = saveCategory;
  document.getElementById("search").oninput = renderCodes;

  document.getElementById("filter-all").onclick = () => {
    activeCategoryId = null;
    document.getElementById("filter-all").classList.add("active");
    renderCodes();
  };

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.onclick = () => btn.closest("dialog").close();
  });

  document.getElementById("btn-export").onclick = () => {
    window.location.href = "./api/export";
  };

  document.getElementById("import-file").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const merge = confirm(t("confirm.import_merge"));
    await api("/import", {
      method: "POST",
      body: JSON.stringify({ data: text, merge }),
    });
    e.target.value = "";
    await loadVault();
  };

  const btnCloud = document.getElementById("btn-cloud-sync");
  if (btnCloud) {
    btnCloud.onclick = async () => {
      try {
        const r = await api("/cloud/sync", { method: "POST" });
        alert(r.ok ? t("alert.cloud_sync_ok") : t("alert.cloud_sync_fail"));
        await loadVault();
        await loadCloudStatus();
        shareUi = null;
        bindShareUiOnce();
        renderCodes();
      } catch (err) {
        alert(err.message || t("alert.cloud_sync_fail"));
      }
    };
  }

  document.getElementById("btn-backup").onclick = async () => {
    const r = await api("/backup", { method: "POST" });
    alert(
      r.gdrive_file_id ? t("alert.backup_gdrive_ok") : t("alert.backup_local_ok")
    );
  };

  document.getElementById("btn-sync-ha").onclick = async () => {
    const id = document.getElementById("code-id").value;
    if (!id) {
      alert(t("alert.save_before_sync"));
      return;
    }
    try {
      await api(`/codes/${id}/sync-from-ha`, { method: "POST" });
      await loadVault();
      openCodeDialog(vault.codes.find((c) => c.id === id));
    } catch (err) {
      alert(err.message);
    }
  };

  window.addEventListener("rematters:locale", () => {
    render();
    loadBackupStatus();
  });
}

window.RemattersUI = {
  refreshBackupStatus: loadBackupStatus,
  syncCodeTypeFields,
  syncHomeKitDerived,
  openCodeDialog,
};

function bindShareUiOnce() {
  if (!window.RemattersVaultShareUi || shareUi) return;
  shareUi = window.RemattersVaultShareUi.bindShareUi({
    api,
    apiBase: API,
    cloudShareEnabled: cloudShareAvailable,
    messages: {
      activeLinks: "Active secret links (copy URL when created):",
      revoke: "Revoke",
      revokeConfirm: "Revoke this share link?",
      linkCopied: "Secret link created and copied to clipboard.",
      linkCreated: "Secret link created. Copy the URL from the dialog.",
      copied: "Link copied.",
      downloadFail: "Could not generate image",
      linkFail: "Could not create link",
      cloudRequired:
        "Configure Rematters Cloud (cloud_url + cloud_token) and run Cloud sync to create secret links.",
    },
  });
}

async function boot() {
  await initI18n();
  bindUi();
  if (window.RemattersVaultScanUi) {
    window.RemattersVaultScanUi.bindVaultScanUi({
      getVault: () => vault,
      openCodeDialog,
      t,
      libUrl: SCAN_LIB_URL,
    });
  }
  await loadCloudStatus();
  bindShareUiOnce();
  await loadVault();
  await loadBackupStatus();
}

boot();
