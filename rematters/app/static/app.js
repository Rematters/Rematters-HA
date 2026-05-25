/**
 * Rematters admin UI — relative API paths for HA ingress.
 */
const API = "./api";
const { t, initI18n, setLocale } = window.RemattersI18n;

let vault = { categories: [], codes: [] };
let activeCategoryId = null;
let cloudShareAvailable = false;
let shareUi = null;

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
    btn.innerHTML = `<span class="category-dot" style="background:${cat.color}"></span>${escapeHtml(cat.name)}`;
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
    card.className = "code-card matter-sticker-card";
    if (Cards) {
      card.innerHTML = Cards.buildCodeCardHtml(code, {
        escapeHtml,
        categoryName,
        iconsHref: "./static/brand/icons.svg",
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

function openCodeDialog(code = null) {
  const dlg = document.getElementById("code-dialog");
  document.getElementById("code-dialog-title").textContent = code
    ? "Edit Matter code"
    : "New Matter code";
  document.getElementById("code-id").value = code?.id || "";
  document.getElementById("code-name").value = code?.name || "";
  document.getElementById("code-device-type").value = code?.device_type || "";
  document.getElementById("code-category").value = code?.category_id || "";
  document.getElementById("code-manual").value = code?.manual_code || "";
  document.getElementById("code-qr").value = code?.qr_payload || "";
  document.getElementById("code-notes").value = code?.notes || "";
  document.getElementById("code-ha-entity").value = code?.ha_link?.entity_id || "";
  document.getElementById("code-ha-attr").value = code?.ha_link?.attribute || "";
  dlg.showModal();
}

function openCategoryDialog(cat = null) {
  const dlg = document.getElementById("category-dialog");
  document.getElementById("category-dialog-title").textContent = cat
    ? "Edit category"
    : "New category";
  document.getElementById("category-id").value = cat?.id || "";
  document.getElementById("category-name").value = cat?.name || "";
  document.getElementById("category-color").value = cat?.color || "#6366f1";
  dlg.showModal();
}

const SCAN_LIB_URL =
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js";

async function saveCode(e) {
  e.preventDefault();
  const id = document.getElementById("code-id").value;
  const body = {
    name: document.getElementById("code-name").value.trim(),
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

  const localeSwitch = document.getElementById("locale-switch");
  if (localeSwitch) {
    localeSwitch.addEventListener("click", (e) => {
      const btn = e.target.closest(".locale-btn[data-locale]");
      if (!btn) return;
      const code = btn.dataset.locale;
      if (code === window.RemattersI18n.getLocale()) return;
      setLocale(code).then(() => {
        render();
        loadBackupStatus();
      });
    });
  }

  window.addEventListener("rematters:locale", () => {
    render();
    loadBackupStatus();
  });
}

window.RemattersUI = { refreshBackupStatus: loadBackupStatus };

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
