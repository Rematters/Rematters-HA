/**
 * HomeKit setup URI (X-HM://) — parity with SimonGolms/homekit-code.
 */
(function (global) {
  const CATEGORIES = {
    airConditioner: 21,
    airport: 27,
    airPurifier: 19,
    appleTv: 24,
    bridge: 2,
    dehumidifier: 23,
    door: 12,
    doorLock: 6,
    fan: 3,
    faucet: 29,
    garage: 4,
    heater: 20,
    humidifier: 22,
    ipCamera: 17,
    lightbulb: 5,
    other: 1,
    outlet: 7,
    programmableSwitch: 15,
    rangeExtender: 16,
    securitySystem: 11,
    sensor: 10,
    showerHead: 30,
    speaker: 26,
    sprinkler: 28,
    switch: 8,
    targetController: 32,
    television: 31,
    thermostat: 9,
    videoDoorBell: 18,
    window: 13,
    windowCovering: 14,
  };

  const CATEGORY_KEYS = Object.keys(CATEGORIES).sort((a, b) =>
    a.localeCompare(b)
  );

  const DEFAULT_FLAG = 2;

  function pairingDigits(value) {
    const d = String(value || "").replace(/\D/g, "");
    return d.length === 8 ? d : "";
  }

  function normalizeSetupId(value) {
    const s = String(value || "")
      .replace(/[^0-9A-Za-z]/g, "")
      .toUpperCase();
    return s.length === 4 ? s : "";
  }

  function normalizeUriBody(body) {
    return String(body || "")
      .replace(/[^0-9A-Za-z]/g, "")
      .toUpperCase();
  }

  function toBase36Upper(n, width) {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let num = BigInt(n);
    if (num <= 0n) return "0".padStart(width, "0");
    let out = "";
    while (num > 0n) {
      const rem = Number(num % 36n);
      out = alphabet[rem] + out;
      num = num / 36n;
    }
    return out.padStart(width, "0");
  }

  function composeSetupUri({
    categoryId,
    flag = DEFAULT_FLAG,
    password,
    setupId = "",
    version = 0,
    reserved = 0,
  }) {
    let payload = BigInt(version & 0x7);
    payload = (payload << 4n) | BigInt(reserved & 0xf);
    payload = (payload << 8n) | BigInt(categoryId & 0xff);
    payload = (payload << 4n) | BigInt(flag & 0xf);
    payload = (payload << 27n) | BigInt(Number(password) & 0x7fffffff);
    const base36 = toBase36Upper(payload, 9);
    return `X-HM://${base36}${normalizeSetupId(setupId)}`;
  }

  function categoryIdFor(name) {
    return CATEGORIES[name] ?? CATEGORIES.other;
  }

  function categoryNameForId(categoryId) {
    for (const [name, id] of Object.entries(CATEGORIES)) {
      if (id === categoryId) return name;
    }
    return "other";
  }

  function decodePayloadFromBase36(base36) {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let n = 0n;
    for (const ch of String(base36 || "").toUpperCase()) {
      const idx = alphabet.indexOf(ch);
      if (idx < 0) return {};
      n = n * 36n + BigInt(idx);
    }
    const password = Number(n & 0x7fffffffn);
    let rest = Number(n >> 27n);
    const flag = rest & 0xf;
    rest >>= 4;
    const categoryId = rest & 0xff;
    return { password, flag, categoryId };
  }

  function parseSetupUri(uri) {
    const s = String(uri || "").trim();
    if (!s.toUpperCase().startsWith("X-HM://")) return null;
    const body = normalizeUriBody(s.slice(7));
    if (body.length < 9) return null;
    const base36 = body.slice(0, 9);
    let setupId = "";
    if (body.length >= 13) setupId = normalizeSetupId(body.slice(-4));
    else if (body.length > 9) setupId = normalizeSetupId(body.slice(9));
    return { base36, setupId, uri: `X-HM://${body}` };
  }

  function decodePairingFromUri(uri) {
    const parsed = parseSetupUri(uri);
    if (!parsed) return "";
    const fields = decodePayloadFromBase36(parsed.base36);
    if (fields.password !== undefined) {
      return String(fields.password).padStart(8, "0").slice(-8);
    }
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let n = 0n;
    for (const ch of parsed.base36) {
      const idx = alphabet.indexOf(ch);
      if (idx < 0) return "";
      n = n * 36n + BigInt(idx);
    }
    const password = Number(n & 0x7fffffffn);
    return String(password).padStart(8, "0").slice(-8);
  }

  function decodeFieldsFromUri(uri) {
    const parsed = parseSetupUri(uri);
    if (!parsed) return {};
    const fields = decodePayloadFromBase36(parsed.base36);
    const out = { setup_id: parsed.setupId };
    if (fields.categoryId !== undefined) {
      out.homekit_flag = fields.flag;
      out.homekit_category = categoryNameForId(fields.categoryId);
    }
    return out;
  }

  function normalizeFields(manualCode, qrPayload, opts = {}) {
    const category = opts.homekit_category || "other";
    const flag = Number(opts.homekit_flag ?? DEFAULT_FLAG);
    let setupId = normalizeSetupId(opts.setup_id || "");
    let qr = String(qrPayload || "").trim();
    let digits = pairingDigits(manualCode);
    const parsed = qr ? parseSetupUri(qr) : null;
    if (parsed && !digits) digits = decodePairingFromUri(parsed.uri);
    if (parsed) {
      const decoded = decodeFieldsFromUri(parsed.uri);
      return {
        manual_code: digits,
        qr_payload: parsed.uri,
        setup_id: decoded.setup_id || setupId,
        homekit_category: decoded.homekit_category || category,
        homekit_flag: Number(decoded.homekit_flag ?? flag),
      };
    }
    if (digits.length === 8) {
      const uri = composeSetupUri({
        categoryId: categoryIdFor(category),
        flag,
        password: digits,
        setupId,
      });
      return {
        manual_code: digits,
        qr_payload: uri,
        setup_id: setupId,
        homekit_category: category,
        homekit_flag: flag,
      };
    }
    return {
      manual_code: digits,
      qr_payload: qr,
      setup_id: setupId,
      homekit_category: category,
      homekit_flag: flag,
    };
  }

  function hasScannableQr(qrPayload) {
    return parseSetupUri(qrPayload) !== null;
  }

  function codeProtocol(code) {
    const ct = String(code?.code_type || "").toLowerCase();
    if (ct === "homekit") return "homekit";
    if (hasScannableQr(code?.qr_payload)) return "homekit";
    if (String(code?.qr_payload || "").toUpperCase().startsWith("MT:")) return "matter";
    return "matter";
  }

  function formatPairingDisplay(manualCode) {
    const d = pairingDigits(manualCode);
    if (d.length !== 8) return String(manualCode || "").trim();
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 8)}`;
  }

  global.RemattersHomeKitPayload = {
    CATEGORIES,
    CATEGORY_KEYS,
    DEFAULT_FLAG,
    pairingDigits,
    normalizeSetupId,
    normalizeUriBody,
    composeSetupUri,
    categoryIdFor,
    categoryNameForId,
    parseSetupUri,
    decodePairingFromUri,
    decodeFieldsFromUri,
    normalizeFields,
    hasScannableQr,
    codeProtocol,
    formatPairingDisplay,
  };
})(typeof window !== "undefined" ? window : globalThis);
