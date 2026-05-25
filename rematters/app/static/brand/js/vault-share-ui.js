/**
 * Share dialog + card icon actions for Rematters vault UIs (cloud + HA).
 */
(function (global) {
  function iconUse(href, symbolId) {
    return `<svg class="rm-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${href}#${symbolId}"/></svg>`;
  }

  function cardIconButtonsHtml(opts) {
    const href = opts.iconsHref || "/brand/icons.svg";
    const share = opts.showShare !== false;
    const shareLabel = opts.shareLabel || "Share";
    const editLabel = opts.editLabel || "Edit";
    const deleteLabel = opts.deleteLabel || "Delete";
    let html = '<div class="card-icon-actions">';
    if (share) {
      html += `<button type="button" class="card-icon-btn card-icon-btn-share" data-share title="${shareLabel}" aria-label="${shareLabel}">${iconUse(href, "rm-icon-share")}</button>`;
    }
    html += `<button type="button" class="card-icon-btn" data-edit title="${editLabel}" aria-label="${editLabel}">${iconUse(href, "rm-icon-edit")}</button>`;
    html += `<button type="button" class="card-icon-btn card-icon-btn-danger" data-delete title="${deleteLabel}" aria-label="${deleteLabel}">${iconUse(href, "rm-icon-trash")}</button>`;
    html += "</div>";
    return html;
  }

  function bindShareUi(config) {
    const api = config.api;
    const msg = config.messages || {};
    const dlg = document.getElementById("share-dialog");
    if (!dlg) return;

    let shareDialogCode = null;

    function openShareDialog(code) {
      shareDialogCode = code;
      document.getElementById("share-dialog-name").textContent = code.name || "";
      document.getElementById("share-link-panel")?.classList.add("hidden");
      const urlInput = document.getElementById("share-url");
      if (urlInput) urlInput.value = "";
      const ul = document.getElementById("share-active-list");
      if (ul) ul.innerHTML = "";
      dlg.showModal();
      loadActiveShares(code.id);
    }

    async function loadActiveShares(codeId) {
      const ul = document.getElementById("share-active-list");
      if (!ul) return;
      try {
        const shares = await api(`/codes/${codeId}/shares`);
        ul.innerHTML = "";
        if (!shares.length) return;
        const label = document.createElement("p");
        label.className = "share-list-label";
        label.textContent = msg.activeLinks || "Active secret links:";
        ul.appendChild(label);
        for (const s of shares) {
          const li = document.createElement("li");
          const span = document.createElement("span");
          span.textContent = `${s.url_hint || ""}${s.expires_at ? " · " + s.expires_at : ""}`;
          li.appendChild(span);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "rm-btn rm-btn-danger";
          btn.textContent = msg.revoke || "Revoke";
          btn.style.fontSize = "0.75rem";
          btn.onclick = async () => {
            if (!confirm(msg.revokeConfirm || "Revoke this share link?")) return;
            await api(`/shares/${s.id}`, { method: "DELETE" });
            await loadActiveShares(codeId);
          };
          li.appendChild(btn);
          ul.appendChild(li);
        }
      } catch {
        /* ignore */
      }
    }

    async function downloadShareImage(codeId) {
      const base = config.apiBase || "/api";
      const res = await fetch(`${base}/codes/${codeId}/card.png`, {
        credentials: config.credentials || "same-origin",
      });
      if (!res.ok) throw new Error(msg.downloadFail || "Could not generate image");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "rematters-code.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }

    async function createShareLink(codeId) {
      const share = await api(`/codes/${codeId}/shares`, {
        method: "POST",
        body: JSON.stringify({ expires_days: 30 }),
      });
      document.getElementById("share-link-panel")?.classList.remove("hidden");
      const urlInput = document.getElementById("share-url");
      if (urlInput) urlInput.value = share.url;
      await loadActiveShares(codeId);
      return share;
    }

    document.getElementById("share-btn-image")?.addEventListener("click", async () => {
      if (!shareDialogCode) return;
      try {
        await downloadShareImage(shareDialogCode.id);
      } catch (err) {
        alert(err.message || msg.downloadFail || "Download failed");
      }
    });

    document.getElementById("share-btn-link")?.addEventListener("click", async () => {
      if (!shareDialogCode) return;
      try {
        const share = await createShareLink(shareDialogCode.id);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(share.url);
          alert(msg.linkCopied || "Secret link created and copied to clipboard.");
        } else {
          alert(msg.linkCreated || "Secret link created. Copy the URL from the dialog.");
        }
      } catch (err) {
        alert(err.message || msg.linkFail || "Could not create link");
      }
    });

    document.getElementById("share-copy-url")?.addEventListener("click", async () => {
      const url = document.getElementById("share-url")?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        alert(msg.copied || "Link copied.");
      } catch {
        document.getElementById("share-url")?.select();
      }
    });

    document.getElementById("share-open-url")?.addEventListener("click", () => {
      const url = document.getElementById("share-url")?.value;
      if (url) window.open(url, "_blank", "noopener");
    });

    return { openShareDialog };
  }

  global.RemattersVaultShareUi = {
    cardIconButtonsHtml,
    bindShareUi,
  };
})(typeof window !== "undefined" ? window : globalThis);
