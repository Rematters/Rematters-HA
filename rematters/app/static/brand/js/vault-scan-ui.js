/**
 * Shared scan dialog wiring for Rematters vault UIs.
 */
(function (global) {
  function bindVaultScanUi(opts) {
    const t =
      opts.t ||
      ((key, vars) => {
        let s = key;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            s = s.replace(`{${k}}`, String(v));
          }
        }
        return s;
      });

    const scanDlg = document.getElementById("scan-dialog");
    const readerId = "scan-reader";
    const fileInput = document.getElementById("scan-file-input");

    function handleParsedText(text) {
      const parsed = global.RemattersScan.parseScannedText(text);
      if (!parsed) {
        alert(t("scan.unrecognized"));
        return;
      }
      const excludeId = document.getElementById("code-id")?.value || null;
      const dup = global.RemattersScan.findDuplicate(
        opts.getVault().codes,
        parsed,
        excludeId || null
      );
      if (dup) {
        const msg = t("scan.duplicate", { name: dup.name || t("scan.unnamed") });
        if (confirm(msg + "\n\n" + t("scan.duplicate_open"))) {
          scanDlg?.close();
          opts.openCodeDialog(dup);
        }
        return;
      }
      scanDlg?.close();
      opts.openCodeDialog(null);
      document.getElementById("code-manual").value = parsed.manual_code || "";
      document.getElementById("code-qr").value = parsed.qr_payload || "";
      const nameEl = document.getElementById("code-name");
      if (nameEl && !nameEl.value.trim()) {
        nameEl.value = t("scan.default_name");
      }
    }

    function openScanDialog() {
      if (!scanDlg) return;
      scanDlg.showModal();
      const hint = document.getElementById("scan-hint");
      if (hint) {
        hint.textContent = global.RemattersScanner.supportsNativeScan()
          ? t("scan.hint_native")
          : global.RemattersScanner.supportsCamera()
            ? t("scan.hint_fallback")
            : t("scan.hint_photo");
      }
      if (
        global.RemattersScanner.supportsCamera() &&
        (global.RemattersScanner.supportsNativeScan() || opts.libUrl)
      ) {
        global.RemattersScanner.startCamera({
          containerId: readerId,
          libUrl: opts.libUrl,
          onScan: handleParsedText,
          onError: (err) => {
            console.warn("scan", err);
            if (hint) hint.textContent = t("scan.camera_denied");
          },
        });
      }
    }

    function closeScanDialog() {
      global.RemattersScanner.stopCamera();
      const el = document.getElementById(readerId);
      if (el) el.innerHTML = "";
      scanDlg?.close();
    }

    document.getElementById("btn-scan-code")?.addEventListener("click", openScanDialog);
    document.getElementById("btn-scan-in-form")?.addEventListener("click", openScanDialog);
    document.getElementById("scan-stop")?.addEventListener("click", closeScanDialog);
    scanDlg?.addEventListener("close", () => global.RemattersScanner.stopCamera());

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      global.RemattersScanner.scanImageFile(
        file,
        handleParsedText,
        (err) => alert(err.message || t("scan.photo_fail"))
      );
    });
  }

  global.RemattersVaultScanUi = { bindVaultScanUi };
})(typeof window !== "undefined" ? window : globalThis);
