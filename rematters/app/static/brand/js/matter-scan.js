/**
 * Matter / HomeKit / Z-Wave QR parsing and duplicate detection (Rematters vault).
 */
(function (global) {
  const Payload = global.RemattersMatterPayload;

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
    const idx = s.toUpperCase().indexOf("MT:");
    return idx >= 0 ? s.substring(idx) : "";
  }

  function extractHomeKitUri(text) {
    const upper = String(text || "").toUpperCase();
    const idx = upper.indexOf("X-HM://");
    if (idx < 0) return "";
    const slice = String(text).slice(idx).trim();
    const end = slice.search(/\s/);
    return end > 0 ? slice.slice(0, end) : slice;
  }

  /**
   * @param {string} raw
   * @returns {object|null}
   */
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

    const HK = global.RemattersHomeKitPayload;
    const ZW = global.RemattersZWavePayload;

    const homekitUri = extractHomeKitUri(text);
    if (homekitUri && HK) {
      const n = HK.normalizeFields("", homekitUri);
      return {
        code_type: "homekit",
        manual_code: n.manual_code,
        qr_payload: n.qr_payload,
        setup_id: n.setup_id,
        homekit_category: n.homekit_category,
        homekit_flag: n.homekit_flag,
      };
    }

    const allDigits = text.replace(/\D/g, "");
    if (ZW && allDigits.length >= 90 && allDigits.startsWith("90")) {
      const n = ZW.normalizeFields("", allDigits);
      return {
        code_type: "zwave",
        manual_code: n.manual_code,
        qr_payload: n.qr_payload,
        zwave_pin: n.zwave_pin,
      };
    }

    if (Payload && typeof Payload.normalizeScannedOrEntered === "function") {
      const normalized = Payload.normalizeScannedOrEntered("", text);
      if (normalized && (normalized.qr_payload || normalized.manual_code)) {
        return { code_type: "matter", ...normalized };
      }
      if (allDigits.length === 11 || allDigits.length === 21) {
        const fromManual = Payload.normalizeScannedOrEntered(allDigits, "");
        if (fromManual) return { code_type: "matter", ...fromManual };
      }
    }

    const upper = text.toUpperCase();
    if (upper.startsWith("MT:")) {
      return { code_type: "matter", qr_payload: text.trim(), manual_code: "" };
    }

    if (allDigits.length === 11) {
      return {
        code_type: "matter",
        manual_code: formatManual11(allDigits),
        qr_payload: "",
      };
    }

    if (HK && allDigits.length === 8) {
      const n = HK.normalizeFields(allDigits, "");
      return {
        code_type: "homekit",
        manual_code: n.manual_code,
        qr_payload: n.qr_payload,
        setup_id: n.setup_id,
        homekit_category: n.homekit_category,
        homekit_flag: n.homekit_flag,
      };
    }

    if (/^MT/i.test(text) || text.length > 20) {
      return { code_type: "matter", qr_payload: text.trim(), manual_code: "" };
    }

    return null;
  }

  /**
   * @param {Array<{id?: string, name?: string, manual_code?: string, qr_payload?: string}>} codes
   * @param {object} candidate
   * @param {string|null} [excludeId]
   */
  function findDuplicate(codes, candidate, excludeId = null) {
    const HK = global.RemattersHomeKitPayload;
    const ZW = global.RemattersZWavePayload;
    let proto = String(candidate.code_type || "").toLowerCase();
    if (proto !== "zwave" && proto !== "homekit") {
      if (ZW?.hasScannableQr?.(candidate.qr_payload)) proto = "zwave";
      else if (HK?.hasScannableQr?.(candidate.qr_payload)) proto = "homekit";
      else proto = "matter";
    }

    if (proto === "zwave" && ZW) {
      const dskKey = ZW.formatDsk(candidate.manual_code).replace(/\D/g, "");
      const qrKey = ZW.extractQrString
        ? ZW.extractQrString(candidate.qr_payload)
        : "";
      if (dskKey.length !== 40 && !qrKey) return null;
      for (const code of codes) {
        if (excludeId && code.id === excludeId) continue;
        if (
          String(code.code_type || "").toLowerCase() !== "zwave" &&
          !ZW.hasScannableQr?.(code.qr_payload)
        )
          continue;
        const exDsk = ZW.formatDsk(code.manual_code).replace(/\D/g, "");
        if (dskKey && exDsk === dskKey) return code;
        const exQr = ZW.extractQrString
          ? ZW.extractQrString(code.qr_payload)
          : "";
        if (qrKey && exQr === qrKey) return code;
      }
      return null;
    }

    if (proto === "homekit" && HK) {
      const pinKey = HK.pairingDigits(candidate.manual_code);
      const parsed = HK.parseSetupUri
        ? HK.parseSetupUri(candidate.qr_payload)
        : null;
      const qrKey = parsed ? parsed.uri.toUpperCase() : "";
      if (!pinKey && !qrKey) return null;

      for (const code of codes) {
        if (excludeId && code.id === excludeId) continue;
        if (HK.codeProtocol(code) !== "homekit") continue;
        if (pinKey && HK.pairingDigits(code.manual_code) === pinKey) {
          return code;
        }
        const exParsed = HK.parseSetupUri
          ? HK.parseSetupUri(code.qr_payload)
          : null;
        if (qrKey && exParsed && exParsed.uri.toUpperCase() === qrKey) {
          return code;
        }
      }
      return null;
    }

    const manKey = normalizeManualDigits(candidate.manual_code);
    const qrKey = normalizeQr(candidate.qr_payload);
    if (!manKey && !qrKey) return null;

    for (const code of codes) {
      if (excludeId && code.id === excludeId) continue;
      if (HK && HK.codeProtocol && HK.codeProtocol(code) === "homekit") continue;
      if (ZW && ZW.hasScannableQr?.(code.qr_payload)) continue;
      if (manKey && normalizeManualDigits(code.manual_code) === manKey) {
        return code;
      }
      if (qrKey && normalizeQr(code.qr_payload) === qrKey) {
        return code;
      }
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
