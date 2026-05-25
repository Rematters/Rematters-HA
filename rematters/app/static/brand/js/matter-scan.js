/**
 * Matter QR / manual code parsing and duplicate detection (Rematters vault).
 */
(function (global) {
  function formatManual11(digits) {
    if (digits.length !== 11) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  function normalizeManualDigits(value) {
    const d = String(value || "").replace(/\D/g, "");
    return d.length === 11 ? d : "";
  }

  function normalizeQr(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    const upper = s.toUpperCase();
    return upper.startsWith("MT:") ? upper : "";
  }

  function parseScannedText(raw) {
    let text = String(raw || "").trim();
    if (!text) return null;
    try {
      if (text.includes("%3A") || text.includes("%3a")) {
        text = decodeURIComponent(text);
      }
    } catch {
      /* keep original */
    }
    const upper = text.toUpperCase();
    if (upper.startsWith("MT:")) {
      const qrNorm = text.trim();
      const digits = normalizeManualDigits(text);
      return {
        qr_payload: qrNorm,
        manual_code: digits ? formatManual11(digits) : "",
      };
    }
    const digits = text.replace(/\D/g, "");
    if (digits.length === 11) {
      return { manual_code: formatManual11(digits), qr_payload: "" };
    }
    if (/^MT/i.test(text) || text.length > 20) {
      return { qr_payload: text.trim(), manual_code: "" };
    }
    return null;
  }

  function findDuplicate(codes, candidate, excludeId = null) {
    const manKey = normalizeManualDigits(candidate.manual_code);
    const qrKey = normalizeQr(candidate.qr_payload);
    if (!manKey && !qrKey) return null;
    for (const code of codes) {
      if (excludeId && code.id === excludeId) continue;
      if (manKey && normalizeManualDigits(code.manual_code) === manKey) return code;
      if (qrKey && normalizeQr(code.qr_payload) === qrKey) return code;
    }
    return null;
  }

  global.RemattersScan = {
    parseScannedText,
    findDuplicate,
    normalizeManualDigits,
    normalizeQr,
    formatManual11,
  };
})(typeof window !== "undefined" ? window : globalThis);
