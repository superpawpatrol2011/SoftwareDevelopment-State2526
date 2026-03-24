const SETTINGS_KEY = "accessbridgeSettings";

const defaults = {
  fontSize: 18,
  highContrast: false,
  dyslexicFont: false,
  showIndividualDescriptors: true,
  showIndividualTts: true,
  activeColorStyle: "default",
  lineReaderEnabled: false,
};

const colorLabelToKey = {
  "white on black": "white-on-black",
  "black on white": "black-on-white",
  "white on red": "white-on-red",
  "white on green": "white-on-green",
  "white on blue": "white-on-blue",
  "black on yellow": "black-on-yellow",
  "yellow on black": "yellow-on-black",
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

async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaults, ...(data[SETTINGS_KEY] || {}) };
}

async function saveSettings(next) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
}

function getFeatureInputs(doc) {
  const map = {};
  const labels = Array.from(doc.querySelectorAll(".toggleCheckbox"));
  labels.forEach((label) => {
    const input = label.querySelector('input[type="checkbox"]');
    if (!input) return;
    const key = (label.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    map[key] = input;
  });
  return map;
}

function getPopupTheme(settings) {
  const profile = colorProfiles[settings.activeColorStyle];
  if (!profile) {
    return {
      panelTop: "rgba(255, 252, 245, 0.98)",
      panelBottom: "rgba(243, 236, 225, 0.98)",
      panelBorder: "#1f2937",
      buttonBorder: "#134e4a",
      buttonTop: "#f4fffd",
      buttonBottom: "#dff4ef",
      buttonText: "#12323a",
      statusText: "#52606d",
      brand: "#0f766e",
      brandStrong: "#115e59",
      sliderTrack: "rgba(15, 118, 110, 0.18)",
      sliderFill: "#0f766e",
      sliderThumb: "#ffffff",
      sliderThumbBorder: "#134e4a",
    };
  }

  const panelTop = settings.highContrast
    ? mix(profile.bg, profile.text, 0.08)
    : mix(profile.bg, "#ffffff", 0.9);
  const panelBottom = settings.highContrast
    ? mix(profile.bg, profile.text, 0.02)
    : mix(profile.bg, "#f3ece1", 0.8);
  const buttonTop = settings.highContrast
    ? mix(profile.bg, profile.text, 0.18)
    : mix(profile.bg, "#ffffff", 0.94);
  const buttonBottom = settings.highContrast
    ? mix(profile.bg, profile.text, 0.08)
    : mix(profile.bg, "#ecfdf5", 0.88);
  const panelText = settings.highContrast ? profile.text : readableText(panelTop);
  const buttonText = settings.highContrast ? profile.text : readableText(buttonTop);
  const brand = settings.highContrast ? profile.text : readableText(panelTop) === "#f8fffd" ? "#f8fffd" : mix(profile.bg, profile.text, 0.35);
  const brandStrong = settings.highContrast ? profile.text : mix(profile.bg, profile.text, 0.12);
  const panelBorder = settings.highContrast ? profile.text : mix(profile.bg, "#1f2937", 0.5);
  const buttonBorder = settings.highContrast ? profile.text : mix(profile.bg, "#134e4a", 0.6);
  const statusText = settings.highContrast
    ? profile.text
    : readableText(panelBottom) === "#f8fffd"
      ? "rgba(248, 255, 253, 0.92)"
      : "#334155";

  return {
    panelTop,
    panelBottom,
    panelBorder,
    buttonBorder,
    buttonTop,
    buttonBottom,
    buttonText,
    statusText,
    brand,
    brandStrong,
    sliderTrack: settings.highContrast ? mix(profile.text, profile.bg, 0.28) : mix(profile.bg, "#94a3b8", 0.55),
    sliderFill: brand,
    sliderThumb: settings.highContrast ? profile.bg : buttonTop,
    sliderThumbBorder: settings.highContrast ? profile.text : buttonBorder,
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

function readableText(color) {
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return "#12323a";
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#12323a" : "#f8fffd";
}

function applyPopupTheme(doc, settings) {
  const theme = getPopupTheme(settings);
  const root = doc.documentElement;
  root.style.setProperty("--panel-border", theme.panelBorder);
  root.style.setProperty("--panel-bg-top", theme.panelTop);
  root.style.setProperty("--panel-bg-bottom", theme.panelBottom);
  root.style.setProperty("--button-border", theme.buttonBorder);
  root.style.setProperty("--button-top", theme.buttonTop);
  root.style.setProperty("--button-bottom", theme.buttonBottom);
  root.style.setProperty("--button-text", theme.buttonText);
  root.style.setProperty("--status-text", theme.statusText);
  root.style.setProperty("--brand", theme.brand);
  root.style.setProperty("--brand-strong", theme.brandStrong);
  root.style.setProperty("--slider-track", theme.sliderTrack);
  root.style.setProperty("--slider-fill", theme.sliderFill);
  root.style.setProperty("--slider-thumb", theme.sliderThumb);
  root.style.setProperty("--slider-thumb-border", theme.sliderThumbBorder);
  doc.body?.classList.toggle("popup-dyslexic", !!settings.dyslexicFont);
}

function syncUi(doc, settings) {
  applyPopupTheme(doc, settings);
  const slider = doc.querySelector('input[name="font-size-slider"]');
  if (slider) {
    slider.value = String(settings.fontSize);
    const min = Number(slider.min || 12);
    const max = Number(slider.max || 50);
    const progress = ((settings.fontSize - min) / Math.max(1, max - min)) * 100;
    slider.style.setProperty("--slider-progress", `${Math.max(0, Math.min(100, progress))}%`);
  }

  const toggleButtons = Array.from(doc.querySelectorAll(".toggleButton"));
  const contrastButton = toggleButtons[0];
  const dyslexiaButton = toggleButtons[1];
  if (contrastButton) contrastButton.style.opacity = settings.highContrast ? "1" : "0.65";
  if (dyslexiaButton) dyslexiaButton.style.opacity = settings.dyslexicFont ? "1" : "0.65";

  const features = getFeatureInputs(doc);
  const pictureToSpeech = features["picture to speech"];
  const textToSpeech = features["text to speech"];
  const lineReader = features["line reader"];
  if (pictureToSpeech) pictureToSpeech.checked = !!settings.showIndividualDescriptors;
  if (textToSpeech) textToSpeech.checked = !!settings.showIndividualTts;
  if (lineReader) lineReader.checked = !!settings.lineReaderEnabled;

  const styleButtons = Array.from(doc.querySelectorAll(".colorButton"));
  const selectedLabel = Object.entries(colorLabelToKey).find(([, key]) => key === settings.activeColorStyle)?.[0];
  styleButtons.forEach((button) => {
    const label = (button.textContent || "").trim().toLowerCase();
    button.style.outline = label === selectedLabel ? "2px solid #111" : "none";
  });
}

async function bindPopup() {
  const iframe = document.getElementById("popupFrame");
  const doc = iframe?.contentDocument;
  if (!doc) return;

  let settings = await getSettings();
  syncUi(doc, settings);

  const slider = doc.querySelector('input[name="font-size-slider"]');
  slider?.addEventListener("input", async () => {
    settings = { ...settings, fontSize: Number(slider.value) };
    await saveSettings(settings);
    syncUi(doc, settings);
  });

  const toggleButtons = Array.from(doc.querySelectorAll(".toggleButton"));
  const contrastButton = toggleButtons[0];
  const dyslexiaButton = toggleButtons[1];
  contrastButton?.addEventListener("click", async () => {
    settings = { ...settings, highContrast: !settings.highContrast };
    await saveSettings(settings);
    syncUi(doc, settings);
  });
  dyslexiaButton?.addEventListener("click", async () => {
    settings = { ...settings, dyslexicFont: !settings.dyslexicFont };
    await saveSettings(settings);
    syncUi(doc, settings);
  });

  const features = getFeatureInputs(doc);
  const pictureToSpeech = features["picture to speech"];
  const textToSpeech = features["text to speech"];
  const lineReader = features["line reader"];
  pictureToSpeech?.addEventListener("change", async () => {
    settings = { ...settings, showIndividualDescriptors: !!pictureToSpeech.checked };
    await saveSettings(settings);
    syncUi(doc, settings);
  });
  textToSpeech?.addEventListener("change", async () => {
    settings = { ...settings, showIndividualTts: !!textToSpeech.checked };
    await saveSettings(settings);
    syncUi(doc, settings);
  });
  lineReader?.addEventListener("change", async () => {
    settings = { ...settings, lineReaderEnabled: !!lineReader.checked };
    await saveSettings(settings);
    syncUi(doc, settings);
  });

  const styleButtons = Array.from(doc.querySelectorAll(".colorButton"));
  styleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const key = colorLabelToKey[(button.textContent || "").trim().toLowerCase()];
      if (!key) return;
      settings = { ...settings, activeColorStyle: key };
      await saveSettings(settings);
      syncUi(doc, settings);
    });
  });
}

const iframe = document.getElementById("popupFrame");
iframe?.addEventListener("load", bindPopup);
if (iframe?.contentDocument?.readyState === "complete") {
  bindPopup();
}
