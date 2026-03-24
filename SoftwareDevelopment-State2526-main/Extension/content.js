const SETTINGS_KEY = "accessbridgeSettings";
const LAUNCHER_POSITION_KEY = "accessbridgeLauncherPosition";
const PANEL_POSITION_KEY = "accessbridgePanelPosition";

/** Default runtime settings used when extension storage is empty. */
const defaults = {
  fontSize: 18,
  highContrast: false,
  dyslexicFont: false,
  activeColorStyle: "default",
  showIndividualDescriptors: true,
  showIndividualTts: true,
  lineReaderEnabled: false,
};

const colorProfiles = {
  "white-on-black": { bg: "#000000", text: "#ffffff" },
  "black-on-white": { bg: "#ffffff", text: "#000000" },
  "white-on-red": { bg: "#ff0000", text: "#ffffff" },
  "white-on-green": { bg: "#008000", text: "#ffffff" },
  "white-on-blue": { bg: "#0000ff", text: "#ffffff" },
  "black-on-yellow": { bg: "#ffff00", text: "#000000" },
  "yellow-on-black": { bg: "#000000", text: "#ffff00" },
};

function hexToRgb(value) {
  if (!value || !value.startsWith("#")) return null;
  const hex = value.slice(1);
  const normalized = hex.length === 3
    ? hex.split("").map((char) => char + char).join("")
    : hex;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function mix(colorA, colorB, weight) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;
  const t = Math.max(0, Math.min(1, weight));
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const bValue = Math.round(a.b * (1 - t) + b.b * t);
  return `rgb(${r}, ${g}, ${bValue})`;
}

function readableText(color) {
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (!rgb) return "#12323a";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.6 ? "#12323a" : "#f8fffd";
  }
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return "#12323a";
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#12323a" : "#f8fffd";
}

function getControlTheme(settings) {
  const profile = colorProfiles[settings.activeColorStyle];
  if (!profile) {
    return {
      panelTop: "rgba(255, 252, 245, 0.98)",
      panelBottom: "rgba(243, 236, 225, 0.98)",
      panelBorder: "#1f2937",
      panelText: "#1f2937",
      buttonBorder: "#134e4a",
      buttonTop: "#f4fffd",
      buttonBottom: "#dff4ef",
      buttonText: "#12323a",
      statusText: "#52606d",
      brand: "#0f766e",
      brandStrong: "#115e59",
      badgeBg: "#dff4ef",
      badgeText: "#134e4a",
      toastBg: "#134e4a",
      toastText: "#f8fffd",
      toastBorder: "#ccfbf1",
      lineTint: "rgba(15, 118, 110, 0.08)",
      lineBorder: "rgba(15, 118, 110, 0.92)",
      launcherBorder: "#ccfbf1",
    };
  }

  const panelTop = settings.highContrast
    ? mix(profile.bg, profile.text, 0.16)
    : mix(profile.bg, "#ffffff", 0.9);
  const panelBottom = settings.highContrast
    ? mix(profile.bg, profile.text, 0.08)
    : mix(profile.bg, "#f3ece1", 0.82);
  const panelText = readableText(panelTop);
  const buttonTop = settings.highContrast
    ? mix(profile.bg, profile.text, 0.26)
    : mix(profile.bg, "#ffffff", 0.94);
  const buttonBottom = settings.highContrast
    ? mix(profile.bg, profile.text, 0.14)
    : mix(profile.bg, "#ecfdf5", 0.9);
  const buttonText = readableText(buttonTop);
  const brand = settings.highContrast ? profile.text : mix(profile.bg, profile.text, 0.28);
  const brandStrong = settings.highContrast ? profile.text : mix(profile.bg, profile.text, 0.12);
  const border = settings.highContrast ? profile.text : mix(profile.bg, "#1f2937", 0.45);
  const buttonBorder = settings.highContrast ? profile.text : mix(profile.bg, "#134e4a", 0.56);

  return {
    panelTop,
    panelBottom,
    panelBorder: border,
    panelText,
    buttonBorder,
    buttonTop,
    buttonBottom,
    buttonText,
    statusText: mix(buttonText, panelTop, 0.35),
    brand,
    brandStrong,
    badgeBg: settings.highContrast ? mix(profile.text, profile.bg, 0.15) : mix(profile.bg, "#ffffff", 0.82),
    badgeText: settings.highContrast ? profile.text : readableText(mix(profile.bg, "#ffffff", 0.82)),
    toastBg: settings.highContrast ? profile.text : mix(profile.bg, "#134e4a", 0.5),
    toastText: settings.highContrast ? profile.bg : readableText(mix(profile.bg, "#134e4a", 0.5)),
    toastBorder: settings.highContrast ? profile.text : mix(profile.bg, "#ffffff", 0.6),
    lineTint: settings.highContrast ? mix(profile.text, profile.bg, 0.12) : mix(profile.bg, "#ffffff", 0.78),
    lineBorder: settings.highContrast ? profile.text : mix(profile.bg, profile.text, 0.24),
    launcherBorder: settings.highContrast ? profile.text : mix(profile.bg, "#ffffff", 0.6),
  };
}

let currentSettings = { ...defaults };
let imageDescribeMode = false;
let controlsRoot = null;
let ttsButton = null;
let imageModeButton = null;
let statusBadge = null;
let lineReaderButton = null;
let lineReaderOverlay = null;
let lineReaderBand = null;
let lineReaderLabel = null;
let controlsHeader = null;
let controlsMinimizeButton = null;
let controlsLauncher = null;
let controlsMinimized = false;
let dragState = null;
let launcherDragState = null;
let launcherMoved = false;
let lineReaderListening = false;

function saveLauncherPosition() {
  if (!controlsLauncher) return;
  const left = parseFloat(controlsLauncher.style.left);
  const top = parseFloat(controlsLauncher.style.top);
  if (Number.isNaN(left) || Number.isNaN(top)) return;
  chrome.storage.local.set({
    [LAUNCHER_POSITION_KEY]: { left, top },
  });
}

function loadLauncherPosition(callback) {
  chrome.storage.local.get(LAUNCHER_POSITION_KEY, (result) => {
    const saved = result?.[LAUNCHER_POSITION_KEY];
    if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
      callback(saved);
      return;
    }
    callback(null);
  });
}

function savePanelPosition() {
  if (!controlsRoot) return;
  const left = parseFloat(controlsRoot.style.left);
  const top = parseFloat(controlsRoot.style.top);
  if (Number.isNaN(left) || Number.isNaN(top)) return;
  chrome.storage.local.set({
    [PANEL_POSITION_KEY]: { left, top },
  });
}

function loadPanelPosition(callback) {
  chrome.storage.local.get(PANEL_POSITION_KEY, (result) => {
    const saved = result?.[PANEL_POSITION_KEY];
    if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
      callback(saved);
      return;
    }
    callback(null);
  });
}

/** Speak helper used by selection and image description actions. */
function speakText(text) {
  const clean = (text || "").trim();
  if (!clean || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

/** Build an image narration from page semantics + local on-device signals. */
async function describeImageElement(image) {
  const alt = (image.getAttribute("alt") || "").trim();
  const title = (image.getAttribute("title") || "").trim();
  const aria = (image.getAttribute("aria-label") || "").trim();
  const src = image.currentSrc || image.src || "";
  const context = collectImageContext(image);
  const signals = await getVisionSignals(image);

  let filename = "";
  try {
    const parsed = new URL(src, window.location.href);
    filename = decodeURIComponent(parsed.pathname.split("/").pop() || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    filename = "";
  }

  const width = image.naturalWidth || image.width || 0;
  const height = image.naturalHeight || image.height || 0;
  const orientation = width && height
    ? (width > height ? "landscape" : width < height ? "portrait" : "square")
    : "";

  const parts = [];
  const primary = firstNonEmpty([alt, aria, title, context.caption, context.linkText]);
  if (primary) {
    parts.push(`Image description: ${cleanSentence(primary)}.`);
  }

  if (context.heading) {
    parts.push(`Section context: ${cleanSentence(context.heading)}.`);
  }

  if (context.nearbyText) {
    parts.push(`Nearby page text: ${cleanSentence(context.nearbyText)}.`);
  }

  if (signals.faceCount > 0) {
    parts.push(`Detected ${signals.faceCount} face${signals.faceCount === 1 ? "" : "s"} in the image.`);
  }

  if (signals.detectedText) {
    parts.push(`Visible text in image: ${cleanSentence(signals.detectedText)}.`);
  }

  if (signals.sceneHint) {
    parts.push(`Visual scene hint: ${signals.sceneHint}.`);
  }

  if (!primary && filename) {
    parts.push(`Filename hint: ${filename}.`);
  }

  if (width && height) {
    parts.push(`Layout: ${orientation}, ${width} by ${height}.`);
  }

  if (!parts.length) {
    parts.push("No meaningful page context was found. Offline mode cannot infer visual subjects from pixels alone.");
  }

  return parts.join(" ");
}

/** Combine detector/pixel analysis signals in parallel for speed. */
async function getVisionSignals(image) {
  const [faceCount, detectedText, sceneHint] = await Promise.all([
    detectFacesInImage(image),
    detectTextInImage(image),
    analyzeImagePixels(image),
  ]);
  return {
    faceCount,
    detectedText,
    sceneHint,
  };
}

/** Browser on-device face detector (when supported). */
async function detectFacesInImage(image) {
  try {
    if (typeof FaceDetector === "undefined") return 0;
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 6 });
    const faces = await detector.detect(image);
    return Array.isArray(faces) ? faces.length : 0;
  } catch {
    return 0;
  }
}

/** Browser on-device text detector (when supported). */
async function detectTextInImage(image) {
  try {
    if (typeof TextDetector === "undefined") return "";
    const detector = new TextDetector();
    const blocks = await detector.detect(image);
    const text = (blocks || [])
      .map((block) => (block.rawValue || "").trim())
      .filter(Boolean)
      .join(" ");
    return trimWords(text, 14);
  } catch {
    return "";
  }
}

/** Pixel heuristics for coarse scene hints (lighting/colorfulness/dominant tone). */
async function analyzeImagePixels(image) {
  try {
    const width = Math.max(1, Math.min(160, image.naturalWidth || image.width || 160));
    const height = Math.max(1, Math.min(160, image.naturalHeight || image.height || 160));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let bright = 0;
    let dark = 0;
    let colorful = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      rSum += r;
      gSum += g;
      bSum += b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma >= 180) bright += 1;
      if (luma <= 70) dark += 1;
      if (max - min > 48) colorful += 1;
    }

    const px = data.length / 4;
    const avgR = rSum / px;
    const avgG = gSum / px;
    const avgB = bSum / px;
    const brightRatio = bright / px;
    const darkRatio = dark / px;
    const colorfulRatio = colorful / px;

    const dominant = dominantColorLabel(avgR, avgG, avgB);
    const lighting = brightRatio > 0.45 ? "brightly lit" : darkRatio > 0.45 ? "dark-toned" : "moderately lit";
    const colorStyle = colorfulRatio > 0.4 ? "colorful" : "muted";
    return `${lighting}, ${colorStyle}, with dominant ${dominant} tones`;
  } catch {
    return "";
  }
}

function dominantColorLabel(r, g, b) {
  const max = Math.max(r, g, b);
  if (max === r && max - Math.max(g, b) > 24) return "red";
  if (max === g && max - Math.max(r, b) > 24) return "green";
  if (max === b && max - Math.max(r, g) > 24) return "blue";
  if (r > 170 && g > 170 && b < 120) return "yellow";
  if (r > 180 && g > 160 && b > 150) return "warm beige";
  if (r < 90 && g < 90 && b < 90) return "dark";
  return "neutral";
}

/** Collect nearby semantic text around image element. */
function collectImageContext(image) {
  const figure = image.closest("figure");
  const caption = figure?.querySelector("figcaption")?.textContent?.trim() || "";

  const linkText = image.closest("a")?.textContent?.trim() || "";

  const sectionRoot = image.closest("article, section, main, [role='main'], .content, .post, .entry") || document.body;
  const heading = findNearestHeading(image, sectionRoot);

  const nearbyText = findNearbyReadableText(image);

  return {
    caption: trimWords(caption, 24),
    linkText: trimWords(linkText, 16),
    heading: trimWords(heading, 20),
    nearbyText: trimWords(nearbyText, 28),
  };
}

/** Choose closest heading to image to improve spoken context. */
function findNearestHeading(image, root) {
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) return "";

  const imgRect = image.getBoundingClientRect();
  let best = "";
  let bestDistance = Number.POSITIVE_INFINITY;

  headings.forEach((heading) => {
    const text = (heading.textContent || "").trim();
    if (!text) return;
    const rect = heading.getBoundingClientRect();
    const distance = Math.abs((imgRect.top + imgRect.height / 2) - (rect.top + rect.height / 2));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = text;
    }
  });

  return best;
}

/** Pull one readable nearby text block. */
function findNearbyReadableText(image) {
  const container = image.closest("figure, article, section, div, li") || image.parentElement;
  if (!container) return "";

  const candidates = Array.from(container.querySelectorAll("p, li, span, div"))
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length >= 30 && text.length <= 220);

  return candidates[0] || "";
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function trimWords(text, maxWords) {
  const words = (text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function cleanSentence(text) {
  return (text || "").replace(/\s+/g, " ").trim().replace(/[.]+$/g, "");
}

/** Lightweight status toast for user feedback. */
function showToast(message) {
  let toast = document.getElementById("accessbridge-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "accessbridge-toast";
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 1600);
}
showToast._timer = null;

/** Show/hide panel controls based on active settings and adaptive sizing. */
function updateControlsVisibility() {
  if (!controlsRoot) return;
  controlsRoot.style.display = controlsMinimized ? "none" : "flex";
  if (controlsLauncher) controlsLauncher.style.display = controlsMinimized ? "grid" : "none";

  const visibleButtons = [];
  if (ttsButton) {
    ttsButton.style.display = currentSettings.showIndividualTts ? "inline-flex" : "none";
    if (currentSettings.showIndividualTts) visibleButtons.push(ttsButton);
  }
  if (imageModeButton) {
    imageModeButton.style.display = currentSettings.showIndividualDescriptors ? "inline-flex" : "none";
    if (currentSettings.showIndividualDescriptors) visibleButtons.push(imageModeButton);
  }
  if (statusBadge) statusBadge.style.display = currentSettings.showIndividualDescriptors ? "block" : "none";
  if (lineReaderButton) {
    lineReaderButton.style.display = "inline-flex";
    lineReaderButton.textContent = currentSettings.lineReaderEnabled ? "Line Reader: ON" : "Line Reader: OFF";
    visibleButtons.push(lineReaderButton);
  }
  controlsRoot.classList.toggle("compact", visibleButtons.length <= 2);
  controlsRoot.classList.toggle("single", visibleButtons.length <= 1);
}

function applyControlThemeToUi() {
  const theme = getControlTheme(currentSettings);

  if (controlsRoot) {
    controlsRoot.style.background = `linear-gradient(180deg, ${theme.panelTop} 0%, ${theme.panelBottom} 100%)`;
    controlsRoot.style.color = theme.panelText;
    controlsRoot.style.borderColor = theme.panelBorder;
  }

  if (controlsHeader) {
    controlsHeader.style.color = theme.panelText;
  }

  if (statusBadge) {
    statusBadge.style.color = theme.statusText;
  }

  if (controlsMinimizeButton) {
    controlsMinimizeButton.style.color = theme.panelText;
    controlsMinimizeButton.style.borderColor = theme.panelBorder;
  }

  if (controlsLauncher) {
    controlsLauncher.style.background = `linear-gradient(180deg, ${theme.brandStrong} 0%, ${theme.brand} 100%)`;
    controlsLauncher.style.borderColor = theme.launcherBorder;
  }

  const controlButtons = [ttsButton, imageModeButton, lineReaderButton].filter(Boolean);
  controlButtons.forEach((button) => {
    button.style.background = `linear-gradient(180deg, ${theme.buttonTop} 0%, ${theme.buttonBottom} 100%)`;
    button.style.color = theme.buttonText;
    button.style.borderColor = theme.buttonBorder;
  });

  if (lineReaderLabel) {
    lineReaderLabel.style.background = theme.badgeBg;
    lineReaderLabel.style.color = theme.badgeText;
    lineReaderLabel.style.borderColor = theme.buttonBorder;
  }
}

/** Keep panel inside viewport boundaries. */
function clampPanelPosition(left, top) {
  const margin = 8;
  const width = controlsRoot?.offsetWidth || 220;
  const height = controlsRoot?.offsetHeight || 180;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function setPanelPosition(left, top) {
  if (!controlsRoot) return;
  const clamped = clampPanelPosition(left, top);
  controlsRoot.style.left = `${clamped.left}px`;
  controlsRoot.style.top = `${clamped.top}px`;
  controlsRoot.style.right = "auto";
  controlsRoot.style.bottom = "auto";
}

function minimizeControls() {
  controlsMinimized = true;
  updateControlsVisibility();
}

function restoreControls() {
  controlsMinimized = false;
  updateControlsVisibility();
  loadPanelPosition((saved) => {
    if (saved) {
      setPanelPosition(saved.left, saved.top);
      return;
    }
    const targetTop = Math.max(16, window.innerHeight - (controlsRoot?.offsetHeight || 220) - 16);
    const targetLeft = Math.max(16, window.innerWidth - (controlsRoot?.offsetWidth || 240) - 16);
    setPanelPosition(targetLeft, targetTop);
  });
}

function clampLauncherPosition(left, top) {
  const margin = 8;
  const size = controlsLauncher?.offsetWidth || 52;
  const maxLeft = Math.max(margin, window.innerWidth - size - margin);
  const maxTop = Math.max(margin, window.innerHeight - size - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function snapLauncherToEdge(left, top) {
  const margin = 8;
  const size = controlsLauncher?.offsetWidth || 52;
  const clamped = clampLauncherPosition(left, top);
  const maxLeft = Math.max(margin, window.innerWidth - size - margin);
  const maxTop = Math.max(margin, window.innerHeight - size - margin);
  const distances = [
    { edge: "left", value: clamped.left - margin },
    { edge: "right", value: maxLeft - clamped.left },
    { edge: "top", value: clamped.top - margin },
    { edge: "bottom", value: maxTop - clamped.top },
  ];
  const nearest = distances.sort((a, b) => a.value - b.value)[0]?.edge;

  if (nearest === "left") return { left: margin, top: clamped.top, edge: "left" };
  if (nearest === "right") return { left: maxLeft, top: clamped.top, edge: "right" };
  if (nearest === "top") return { left: clamped.left, top: margin, edge: "top" };
  return { left: clamped.left, top: maxTop, edge: "bottom" };
}

function setLauncherPosition(left, top) {
  if (!controlsLauncher) return;
  const snapped = snapLauncherToEdge(left, top);
  controlsLauncher.style.left = `${snapped.left}px`;
  controlsLauncher.style.top = `${snapped.top}px`;
  controlsLauncher.style.right = "auto";
  controlsLauncher.style.bottom = "auto";
  controlsLauncher.dataset.edge = snapped.edge;
}

/** Panel drag handlers. */
function onDragStart(event) {
  if (!controlsRoot || !controlsHeader) return;
  if (event.button !== 0) return;
  const rect = controlsRoot.getBoundingClientRect();
  dragState = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  document.addEventListener("mousemove", onDragMove, true);
  document.addEventListener("mouseup", onDragEnd, true);
}

function onDragMove(event) {
  if (!dragState || !controlsRoot) return;
  setPanelPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
}

function onDragEnd() {
  if (controlsRoot) {
    savePanelPosition();
  }
  dragState = null;
  document.removeEventListener("mousemove", onDragMove, true);
  document.removeEventListener("mouseup", onDragEnd, true);
}

function onLauncherDragStart(event) {
  if (!controlsLauncher || event.button !== 0) return;
  const rect = controlsLauncher.getBoundingClientRect();
  launcherDragState = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startLeft: rect.left,
    startTop: rect.top,
  };
  launcherMoved = false;
  document.addEventListener("mousemove", onLauncherDragMove, true);
  document.addEventListener("mouseup", onLauncherDragEnd, true);
}

function onLauncherDragMove(event) {
  if (!launcherDragState || !controlsLauncher) return;
  const nextLeft = event.clientX - launcherDragState.offsetX;
  const nextTop = event.clientY - launcherDragState.offsetY;
  const snapped = snapLauncherToEdge(nextLeft, nextTop);
  controlsLauncher.style.left = `${snapped.left}px`;
  controlsLauncher.style.top = `${snapped.top}px`;
  controlsLauncher.style.right = "auto";
  controlsLauncher.style.bottom = "auto";
  if (!launcherMoved) {
    launcherMoved =
      Math.abs(snapped.left - launcherDragState.startLeft) > 3 ||
      Math.abs(snapped.top - launcherDragState.startTop) > 3;
  }
}

function onLauncherDragEnd() {
  if (controlsLauncher && launcherMoved) {
    saveLauncherPosition();
  }
  launcherDragState = null;
  document.removeEventListener("mousemove", onLauncherDragMove, true);
  document.removeEventListener("mouseup", onLauncherDragEnd, true);
  window.setTimeout(() => {
    launcherMoved = false;
  }, 0);
}

/** Hover-reveal launcher button shown when panel is minimized. */
function ensureLauncherButton() {
  if (controlsLauncher) return;
  controlsLauncher = document.createElement("button");
  controlsLauncher.type = "button";
  controlsLauncher.id = "accessbridge-launcher";
  controlsLauncher.innerHTML = `
    <svg class="accessbridge-launcher-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5L14.3 9.7L20.5 12L14.3 14.3L12 20.5L9.7 14.3L3.5 12L9.7 9.7L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M18.8 3.6V7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M17 5.4H20.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <circle cx="4.7" cy="18.8" r="1.2" fill="currentColor"></circle>
    </svg>
  `;
  controlsLauncher.title = "Open AccessBridge controls";
  controlsLauncher.addEventListener("mousedown", onLauncherDragStart);
  controlsLauncher.addEventListener("click", () => {
    if (launcherMoved) return;
    restoreControls();
  });
  document.body.appendChild(controlsLauncher);
  loadLauncherPosition((saved) => {
    if (saved) {
      setLauncherPosition(saved.left, saved.top);
      return;
    }
    const initialTop = Math.max(16, window.innerHeight - (controlsLauncher.offsetHeight || 52) - 18);
    const initialLeft = Math.max(16, window.innerWidth - (controlsLauncher.offsetWidth || 52) - 18);
    setLauncherPosition(initialLeft, initialTop);
  });
}

/** Visual state for image click-to-describe mode. */
function updateImageModeUi() {
  document.documentElement.classList.toggle("accessbridge-image-mode", imageDescribeMode);
  if (imageModeButton) {
    imageModeButton.textContent = imageDescribeMode ? "Image Mode: ON" : "Image Mode: OFF";
  }
  if (statusBadge) {
    statusBadge.textContent = imageDescribeMode
      ? "Click any image to hear description"
      : "Image mode idle";
  }
}

/** Build floating control panel UI and bind feature actions. */
function ensureInteractiveControls() {
  if (controlsRoot) return;

  controlsRoot = document.createElement("div");
  controlsRoot.id = "accessbridge-controls";

  controlsHeader = document.createElement("div");
  controlsHeader.className = "accessbridge-controls-header";

  const title = document.createElement("div");
  title.className = "accessbridge-controls-title";
  title.innerHTML = `
    <span class="accessbridge-controls-brand" aria-hidden="true">
      <svg class="accessbridge-controls-brand-glyph" viewBox="0 0 24 24" fill="none">
        <path d="M12 3.5L14.3 9.7L20.5 12L14.3 14.3L12 20.5L9.7 14.3L3.5 12L9.7 9.7L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M18.8 3.6V7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <path d="M17 5.4H20.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <circle cx="4.7" cy="18.8" r="1.2" fill="currentColor"></circle>
      </svg>
    </span>
    <span>AccessBridge</span>
  `;

  controlsMinimizeButton = document.createElement("button");
  controlsMinimizeButton.type = "button";
  controlsMinimizeButton.className = "accessbridge-controls-minimize";
  controlsMinimizeButton.setAttribute("aria-label", "Minimize AccessBridge controls");
  controlsMinimizeButton.textContent = "−";
  controlsMinimizeButton.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  controlsMinimizeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    minimizeControls();
  });
  controlsHeader.appendChild(title);
  controlsHeader.appendChild(controlsMinimizeButton);
  controlsHeader.addEventListener("mousedown", onDragStart);

  ttsButton = document.createElement("button");
  ttsButton.type = "button";
  ttsButton.className = "accessbridge-controls-btn";
  ttsButton.textContent = "Speak Selection";
  ttsButton.addEventListener("click", () => {
    const selected = window.getSelection ? (window.getSelection().toString() || "").trim() : "";
    if (!selected) {
      showToast("Select text first, then press Speak Selection.");
      return;
    }
    speakText(selected);
  });

  imageModeButton = document.createElement("button");
  imageModeButton.type = "button";
  imageModeButton.className = "accessbridge-controls-btn";
  imageModeButton.addEventListener("click", () => {
    imageDescribeMode = !imageDescribeMode;
    updateImageModeUi();
  });

  statusBadge = document.createElement("div");
  statusBadge.className = "accessbridge-controls-status";

  lineReaderButton = document.createElement("button");
  lineReaderButton.type = "button";
  lineReaderButton.className = "accessbridge-controls-btn";
  lineReaderButton.addEventListener("click", () => {
    currentSettings = { ...currentSettings, lineReaderEnabled: !currentSettings.lineReaderEnabled };
    chrome.storage.local.set({ [SETTINGS_KEY]: currentSettings });
    applyLineReader();
    updateControlsVisibility();
  });

  controlsRoot.appendChild(controlsHeader);
  controlsRoot.appendChild(ttsButton);
  controlsRoot.appendChild(imageModeButton);
  controlsRoot.appendChild(lineReaderButton);
  controlsRoot.appendChild(statusBadge);
  document.body.appendChild(controlsRoot);
  ensureLauncherButton();
  loadPanelPosition((saved) => {
    if (saved) {
      setPanelPosition(saved.left, saved.top);
      return;
    }
    const targetTop = Math.max(16, window.innerHeight - (controlsRoot.offsetHeight || 220) - 16);
    const targetLeft = Math.max(16, window.innerWidth - (controlsRoot.offsetWidth || 240) - 16);
    setPanelPosition(targetLeft, targetTop);
  });
  updateImageModeUi();
  updateControlsVisibility();
  applyControlThemeToUi();
}

/** Global click handler for image-description mode. */
async function onDocumentClick(event) {
  if (!imageDescribeMode || !currentSettings.showIndividualDescriptors) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const image = target.closest("img");
  if (!image) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const description = await describeImageElement(image);
  speakText(description);
  showToast("Describing selected image.");
}

/** Line-reader overlay setup and movement tracking. */
function ensureLineReader() {
  if (lineReaderOverlay) return;
  lineReaderOverlay = document.createElement("div");
  lineReaderOverlay.id = "accessbridge-line-reader";
  lineReaderOverlay.innerHTML = `
    <div class="accessbridge-line-top"></div>
    <div class="accessbridge-line-band"></div>
    <div class="accessbridge-line-bottom"></div>
    <div class="accessbridge-line-label">Line Reader</div>
  `;
  const mountTarget = document.body || document.documentElement;
  mountTarget.appendChild(lineReaderOverlay);
  lineReaderBand = lineReaderOverlay.querySelector(".accessbridge-line-band");
  lineReaderLabel = lineReaderOverlay.querySelector(".accessbridge-line-label");
}

function onMouseMoveLineReader(event) {
  if (!currentSettings.lineReaderEnabled || !lineReaderOverlay || !lineReaderBand || !lineReaderLabel) return;
  const y = Math.max(28, event.clientY);
  lineReaderOverlay.style.setProperty("--ab-line-y", `${y}px`);
  lineReaderLabel.style.top = `${Math.max(8, y - 40)}px`;
}

function applyLineReader() {
  ensureLineReader();
  if (!lineReaderOverlay) return;

  if (currentSettings.lineReaderEnabled) {
    lineReaderOverlay.style.display = "block";
    if (!lineReaderListening) {
      document.addEventListener("mousemove", onMouseMoveLineReader, true);
      window.addEventListener("mousemove", onMouseMoveLineReader, true);
      lineReaderListening = true;
    }
    lineReaderOverlay.style.setProperty("--ab-line-y", `${Math.max(40, Math.round(window.innerHeight * 0.45))}px`);
  } else {
    lineReaderOverlay.style.display = "none";
    if (lineReaderListening) {
      document.removeEventListener("mousemove", onMouseMoveLineReader, true);
      window.removeEventListener("mousemove", onMouseMoveLineReader, true);
      lineReaderListening = false;
    }
  }
}

/** Inject scoped dyslexia-font rules without breaking icon/code fonts. */
function ensureDyslexicStyle() {
  const id = "accessbridge-dyslexic-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .accessbridge-dyslexic p,
    .accessbridge-dyslexic span,
    .accessbridge-dyslexic li,
    .accessbridge-dyslexic a,
    .accessbridge-dyslexic button,
    .accessbridge-dyslexic label,
    .accessbridge-dyslexic input,
    .accessbridge-dyslexic textarea,
    .accessbridge-dyslexic h1,
    .accessbridge-dyslexic h2,
    .accessbridge-dyslexic h3,
    .accessbridge-dyslexic h4,
    .accessbridge-dyslexic h5,
    .accessbridge-dyslexic h6 {
      font-family: "Comic Sans MS", "Comic Sans", cursive !important;
    }
    .accessbridge-dyslexic code,
    .accessbridge-dyslexic pre,
    .accessbridge-dyslexic kbd,
    .accessbridge-dyslexic samp,
    .accessbridge-dyslexic .material-icons,
    .accessbridge-dyslexic [class*="icon"] {
      font-family: inherit !important;
    }
  `;
  document.documentElement.appendChild(style);
}

/** Apply all settings to page styles and extension overlays. */
function applySettings(settings) {
  const next = { ...defaults, ...settings };
  currentSettings = next;
  document.documentElement.style.fontSize = `${next.fontSize}px`;
  const controlTheme = getControlTheme(next);
  document.documentElement.style.setProperty("--accessbridge-panel-top", controlTheme.panelTop);
  document.documentElement.style.setProperty("--accessbridge-panel-bottom", controlTheme.panelBottom);
  document.documentElement.style.setProperty("--accessbridge-panel-border", controlTheme.panelBorder);
  document.documentElement.style.setProperty("--accessbridge-panel-text", controlTheme.panelText);
  document.documentElement.style.setProperty("--accessbridge-button-top", controlTheme.buttonTop);
  document.documentElement.style.setProperty("--accessbridge-button-bottom", controlTheme.buttonBottom);
  document.documentElement.style.setProperty("--accessbridge-button-border", controlTheme.buttonBorder);
  document.documentElement.style.setProperty("--accessbridge-button-text", controlTheme.buttonText);
  document.documentElement.style.setProperty("--accessbridge-status-text", controlTheme.statusText);
  document.documentElement.style.setProperty("--accessbridge-brand", controlTheme.brand);
  document.documentElement.style.setProperty("--accessbridge-brand-strong", controlTheme.brandStrong);
  document.documentElement.style.setProperty("--accessbridge-badge-bg", controlTheme.badgeBg);
  document.documentElement.style.setProperty("--accessbridge-badge-text", controlTheme.badgeText);
  document.documentElement.style.setProperty("--accessbridge-toast-bg", controlTheme.toastBg);
  document.documentElement.style.setProperty("--accessbridge-toast-text", controlTheme.toastText);
  document.documentElement.style.setProperty("--accessbridge-toast-border", controlTheme.toastBorder);
  document.documentElement.style.setProperty("--accessbridge-line-tint", controlTheme.lineTint);
  document.documentElement.style.setProperty("--accessbridge-line-border", controlTheme.lineBorder);
  document.documentElement.style.setProperty("--accessbridge-launcher-border", controlTheme.launcherBorder);

  if (next.dyslexicFont) {
    ensureDyslexicStyle();
    document.body.classList.add("accessbridge-dyslexic");
  } else {
    document.body.classList.remove("accessbridge-dyslexic");
  }

  const palette = colorProfiles[next.activeColorStyle];
  if (palette) {
    document.documentElement.classList.add("accessbridge-color-theme");
    document.documentElement.style.setProperty("--accessbridge-bg", palette.bg);
    document.documentElement.style.setProperty("--accessbridge-text", palette.text);
    document.documentElement.style.setProperty("--accessbridge-contrast", next.highContrast ? "1.1" : "1");
    document.documentElement.style.setProperty("--accessbridge-brightness", next.highContrast ? "1.02" : "1");
  } else {
    document.documentElement.classList.remove("accessbridge-color-theme");
    document.documentElement.style.setProperty("--accessbridge-bg", "");
    document.documentElement.style.setProperty("--accessbridge-text", "");
    document.documentElement.style.setProperty("--accessbridge-contrast", next.highContrast ? "1.15" : "1");
    document.documentElement.style.setProperty("--accessbridge-brightness", "1");
  }

  const overlayId = "accessbridge-global-style";
  let style = document.getElementById(overlayId);
  if (!style) {
    style = document.createElement("style");
    style.id = overlayId;
    document.documentElement.appendChild(style);
  }

  style.textContent = `
    html {
      filter: contrast(var(--accessbridge-contrast)) brightness(var(--accessbridge-brightness));
    }
    html.accessbridge-color-theme,
    html.accessbridge-color-theme body {
      background-color: var(--accessbridge-bg) !important;
      color: var(--accessbridge-text) !important;
    }
    html.accessbridge-color-theme body *:not(img):not(video):not(canvas):not(svg):not(path):not(#accessbridge-controls):not(#accessbridge-controls *):not(#accessbridge-toast):not(#accessbridge-line-reader):not(#accessbridge-line-reader *):not(#accessbridge-launcher):not(#accessbridge-launcher *) {
      color: var(--accessbridge-text) !important;
      border-color: var(--accessbridge-text) !important;
    }
    html.accessbridge-color-theme body *:not(img):not(video):not(canvas):not(svg):not(path):not([style*="background-image"]):not(#accessbridge-controls):not(#accessbridge-controls *):not(#accessbridge-toast):not(#accessbridge-line-reader):not(#accessbridge-line-reader *):not(#accessbridge-launcher):not(#accessbridge-launcher *) {
      background-color: transparent !important;
    }
    html.accessbridge-color-theme a:not(#accessbridge-controls a),
    html.accessbridge-color-theme button:not(#accessbridge-controls button) {
      color: var(--accessbridge-text) !important;
    }
    #accessbridge-controls {
      all: initial;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: linear-gradient(180deg, var(--accessbridge-panel-top) 0%, var(--accessbridge-panel-bottom) 100%) !important;
      color: var(--accessbridge-panel-text);
      border: 2px solid var(--accessbridge-panel-border);
      border-radius: 20px;
      padding: 12px;
      width: min(258px, calc(100vw - 24px));
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.2);
      box-sizing: border-box;
      text-rendering: auto;
      user-select: none;
    }
    #accessbridge-controls.compact { width: min(232px, calc(100vw - 24px)); }
    #accessbridge-controls.single { width: min(204px, calc(100vw - 24px)); }
    .accessbridge-controls-header {
      all: initial;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: move;
    }
    .accessbridge-controls-title {
      all: initial;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 1;
      color: var(--accessbridge-brand);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      line-height: 1.2;
    }
    .accessbridge-controls-brand {
      all: initial;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      background: linear-gradient(180deg, var(--accessbridge-brand-strong) 0%, var(--accessbridge-brand) 100%);
      color: #f8fffd;
      box-shadow: 0 6px 14px rgba(15, 118, 110, 0.18);
      flex: 0 0 auto;
    }
    .accessbridge-controls-brand-glyph {
      width: 14px;
      height: 14px;
      display: block;
    }
    .accessbridge-controls-minimize {
      all: unset;
      display: inline-flex;
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--accessbridge-panel-border);
      border-radius: 9999px;
      color: var(--accessbridge-panel-text);
      background: color-mix(in srgb, var(--accessbridge-panel-top) 82%, white 18%);
      font: 700 14px/1 "Trebuchet MS", "Segoe UI", sans-serif;
      cursor: pointer;
    }
    .accessbridge-controls-minimize:hover {
      background: rgba(15, 118, 110, 0.12);
    }
    .accessbridge-controls-btn {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border: 2px solid var(--accessbridge-button-border);
      background: linear-gradient(180deg, var(--accessbridge-button-top) 0%, var(--accessbridge-button-bottom) 100%) !important;
      color: var(--accessbridge-button-text) !important;
      border-radius: 14px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.25;
      text-align: center;
      min-height: 40px;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      outline: none !important;
      box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    }
    .accessbridge-controls-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.02);
    }
    .accessbridge-controls-btn:focus {
      box-shadow: 0 0 0 2px var(--accessbridge-panel-top), 0 0 0 4px var(--accessbridge-brand);
    }
    .accessbridge-controls-status {
      all: initial;
      display: block;
      font-size: 11px;
      opacity: 0.95;
      color: var(--accessbridge-status-text);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      line-height: 1.2;
    }
    #accessbridge-toast {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: 16px;
      z-index: 2147483647;
      background: var(--accessbridge-toast-bg);
      color: var(--accessbridge-toast-text);
      border: 1px solid var(--accessbridge-toast-border);
      border-radius: 9999px;
      padding: 10px 14px;
      font-size: 12px;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    html.accessbridge-image-mode img {
      outline: 2px dashed #facc15 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    #accessbridge-line-reader {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483645;
      display: none;
      --ab-line-y: 40vh;
    }
    #accessbridge-line-reader .accessbridge-line-top {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: calc(var(--ab-line-y) - 26px);
      background: rgba(0, 0, 0, 0.45);
    }
    #accessbridge-line-reader .accessbridge-line-band {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(var(--ab-line-y) - 26px);
      height: 52px;
      background: var(--accessbridge-line-tint);
      border-top: 2px solid var(--accessbridge-line-border);
      border-bottom: 2px solid var(--accessbridge-line-border);
      box-shadow: 0 0 30px var(--accessbridge-line-tint);
    }
    #accessbridge-line-reader .accessbridge-line-bottom {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(var(--ab-line-y) + 26px);
      bottom: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    #accessbridge-line-reader .accessbridge-line-label {
      position: absolute;
      right: 10px;
      top: 10px;
      background: var(--accessbridge-badge-bg);
      color: var(--accessbridge-badge-text);
      border: 1px solid var(--accessbridge-button-border);
      border-radius: 999px;
      padding: 4px 8px;
      font: 800 10px/1 "Trebuchet MS", "Segoe UI", sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    #accessbridge-launcher {
      all: unset;
      position: fixed;
      right: -18px;
      bottom: 18px;
      width: 52px;
      height: 52px;
      z-index: 2147483646;
      border-radius: 18px;
      display: none;
      place-items: center;
      background: linear-gradient(180deg, var(--accessbridge-brand-strong) 0%, var(--accessbridge-brand) 100%) !important;
      color: #f8fffd !important;
      border: 2px solid var(--accessbridge-launcher-border);
      box-shadow: 0 12px 26px rgba(15, 23, 42, 0.28);
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      box-sizing: border-box;
    }
    #accessbridge-launcher:hover {
      box-shadow: 0 18px 32px rgba(15, 23, 42, 0.34);
    }
    #accessbridge-launcher[data-edge="right"]:hover {
      transform: translate(-12px, 0) scale(1.1);
    }
    #accessbridge-launcher[data-edge="left"]:hover {
      transform: translate(12px, 0) scale(1.1);
    }
    #accessbridge-launcher[data-edge="top"]:hover {
      transform: translate(0, 12px) scale(1.1);
    }
    #accessbridge-launcher[data-edge="bottom"]:hover {
      transform: translate(0, -12px) scale(1.1);
    }
    .accessbridge-launcher-glyph {
      width: 24px;
      height: 24px;
      display: block;
      transition: transform 0.5s ease;
      color: #fff !important;
    }
    #accessbridge-launcher:hover .accessbridge-launcher-glyph {
      transform: rotate(180deg) scale(1.08);
    }
  `;

  ensureInteractiveControls();
  applyControlThemeToUi();
  updateControlsVisibility();
  applyLineReader();
  if (!next.showIndividualDescriptors && imageDescribeMode) {
    imageDescribeMode = false;
    updateImageModeUi();
  }
}

chrome.storage.local.get(SETTINGS_KEY, (result) => {
  applySettings(result[SETTINGS_KEY] || defaults);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[SETTINGS_KEY]) return;
  applySettings(changes[SETTINGS_KEY].newValue || defaults);
});

document.addEventListener("click", onDocumentClick, true);
window.addEventListener("resize", () => {
  if (controlsLauncher && controlsMinimized) {
    const launcherRect = controlsLauncher.getBoundingClientRect();
    setLauncherPosition(launcherRect.left, launcherRect.top);
    saveLauncherPosition();
  }
  if (!controlsRoot || controlsMinimized) return;
  const rect = controlsRoot.getBoundingClientRect();
  setPanelPosition(rect.left, rect.top);
  savePanelPosition();
});
