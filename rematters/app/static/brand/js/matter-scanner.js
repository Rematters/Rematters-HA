/**
 * Camera / photo QR scanner for Matter codes.
 */
(function (global) {
  let stream = null;
  let rafId = null;
  let html5Instance = null;

  function stopCamera() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (html5Instance) {
      html5Instance
        .stop()
        .then(() => html5Instance.clear())
        .catch(() => {});
      html5Instance = null;
    }
  }

  async function scanWithBarcodeDetector(video, onScan) {
    const detector = new global.BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!stream) return;
      try {
        if (video.videoWidth > 0) {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            stopCamera();
            onScan(codes[0].rawValue);
            return;
          }
        }
      } catch {
        /* skip frame */
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  async function startNativeCamera(containerId, onScan, onError) {
    const container = document.getElementById(containerId);
    if (!container) {
      onError(new Error("Scanner container not found"));
      return;
    }
    container.innerHTML = "";
    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.className = "scan-video";
    container.appendChild(video);

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (e) {
      onError(e);
      return;
    }
    video.srcObject = stream;
    await video.play();
    await scanWithBarcodeDetector(video, onScan);
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (global.Html5Qrcode) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[data-rematters-scanner="${url}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Scanner library failed to load")));
        return;
      }
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.dataset.remattersScanner = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Scanner library failed to load"));
      document.head.appendChild(s);
    });
  }

  async function startHtml5Camera(containerId, libUrl, onScan, onError) {
    try {
      await loadScript(libUrl);
    } catch (e) {
      onError(e);
      return;
    }
    const container = document.getElementById(containerId);
    if (!container) {
      onError(new Error("Scanner container not found"));
      return;
    }
    container.innerHTML = "";
    const readerId = "rematters-qr-reader";
    const div = document.createElement("div");
    div.id = readerId;
    div.className = "scan-reader-mount";
    container.appendChild(div);

    html5Instance = new global.Html5Qrcode(readerId);
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const cameras = await global.Html5Qrcode.getCameras();
    const cam =
      cameras.find((c) => /back|rear|environment/i.test(c.label)) || cameras[0];
    if (!cam) {
      onError(new Error("No camera found"));
      return;
    }
    await html5Instance.start(
      cam.id,
      config,
      (text) => {
        stopCamera();
        onScan(text);
      },
      () => {}
    );
  }

  async function scanImageFile(file, onScan, onError) {
    if ("BarcodeDetector" in global) {
      try {
        const detector = new global.BarcodeDetector({ formats: ["qr_code"] });
        const bitmap = await createImageBitmap(file);
        const codes = await detector.detect(bitmap);
        bitmap.close();
        if (codes.length > 0 && codes[0].rawValue) {
          onScan(codes[0].rawValue);
          return;
        }
      } catch (e) {
        onError(e);
        return;
      }
      onError(new Error("No QR code found in image"));
      return;
    }
    onError(new Error("Photo scan not supported in this browser"));
  }

  async function startCamera(opts) {
    stopCamera();
    const { containerId, libUrl, onScan, onError } = opts;
    if ("BarcodeDetector" in global) {
      await startNativeCamera(containerId, onScan, onError);
      return;
    }
    if (libUrl) {
      await startHtml5Camera(containerId, libUrl, onScan, onError);
      return;
    }
    onError(new Error("Camera scanning is not supported in this browser"));
  }

  global.RemattersScanner = {
    startCamera,
    stopCamera,
    scanImageFile,
    supportsCamera: () =>
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    supportsNativeScan: () => "BarcodeDetector" in global,
  };
})(typeof window !== "undefined" ? window : globalThis);
