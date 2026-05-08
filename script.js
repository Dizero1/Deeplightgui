/**
 * DeepLight — script.js
 * SPA logic: tab switching, file upload, API calls (stubbed), download
 */

"use strict";

/* ================================================
   UTILITY HELPERS
   ================================================ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = "info", duration = 2800) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = "toast";
  }, duration);
}

/**
 * Set button loading state.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string} originalHTML
 */
function setLoading(btn, loading, originalHTML) {
  if (loading) {
    btn.classList.add("loading");
    btn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
      </svg>
      Processing…`;
  } else {
    btn.classList.remove("loading");
    btn.innerHTML = originalHTML;
  }
}

/**
 * Display an image in a box, hiding its placeholder.
 * @param {HTMLImageElement} imgEl
 * @param {HTMLElement} placeholderEl
 * @param {string} src  data URL or remote URL
 */
function displayImage(imgEl, placeholderEl, src) {
  imgEl.src = src;
  imgEl.classList.remove("hidden");
  if (placeholderEl) placeholderEl.style.display = "none";
}

/**
 * Reset an image box back to placeholder.
 * @param {HTMLImageElement} imgEl
 * @param {HTMLElement} placeholderEl
 */
function resetImage(imgEl, placeholderEl) {
  imgEl.src = "";
  imgEl.classList.add("hidden");
  if (placeholderEl) placeholderEl.style.display = "";
}

/**
 * Read a File object as a data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Trigger a download of an image from a src URL.
 * @param {string} src
 * @param {string} filename
 */
function downloadImage(src, filename = "deeplight-output.png") {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Determine whether a file is an image.
 * @param {File} file
 * @returns {boolean}
 */
function isImageFile(file) {
  return file && file.type && file.type.startsWith("image/");
}

/**
 * Lookup the file input element for a named dropzone.
 * @param {string} zoneName
 * @returns {HTMLInputElement|null}
 */
function getFileInputForZone(zoneName) {
  switch (zoneName) {
    case "restore":
      return document.getElementById("restore-file-input");
    case "comp":
      return document.getElementById("comp-file-input");
    case "det":
      return document.getElementById("det-file-input");
    default:
      return null;
  }
}

/**
 * Lookup the file handler for a named dropzone.
 * @param {string} zoneName
 * @returns {(file: File) => Promise<void>|null}
 */
function getDropzoneHandler(zoneName) {
  switch (zoneName) {
    case "restore":
      return handleRestoreFile;
    case "comp":
      return handleComparisonFile;
    case "det":
      return handleDetectionFile;
    default:
      return null;
  }
}

/**
 * Attach drag/drop interactions to a dropzone element.
 * @param {HTMLElement} zoneEl
 */
function attachDropzone(zoneEl) {
  const zoneName = zoneEl.dataset.dropzone;
  const fileInput = getFileInputForZone(zoneName);
  const handler = getDropzoneHandler(zoneName);
  if (!fileInput || !handler) return;

  zoneEl.addEventListener("click", () => {
    fileInput.value = "";
    fileInput.click();
  });

  zoneEl.addEventListener("dragenter", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zoneEl.classList.add("drag-over");
  });

  zoneEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    zoneEl.classList.add("drag-over");
  });

  zoneEl.addEventListener("dragleave", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target === zoneEl || !zoneEl.contains(event.relatedTarget)) {
      zoneEl.classList.remove("drag-over");
    }
  });

  zoneEl.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    zoneEl.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (!isImageFile(file)) {
      showToast("Please upload a valid image file.", "error");
      return;
    }

    await handler(file);
  });
}

/**
 * Initialize dropzone support for all image upload zones.
 */
function initDropzones() {
  document.querySelectorAll(".image-box.dropzone").forEach(attachDropzone);
}

/* ================================================
   TAB / PAGE SWITCHING
   ================================================ */

const tabButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".page");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    // Update active tab button
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Show target page, hide others
    pages.forEach((page) => {
      if (page.id === `page-${target}`) {
        page.classList.add("active");
      } else {
        page.classList.remove("active");
      }
    });
  });
});

/* ================================================
   PAGE 1 — UPLOAD & RESTORE
   ================================================ */

const restoreFileInput = document.getElementById("restore-file-input");
const restoreUploadBtn = document.getElementById("restore-upload-btn");
const restoreActionBtn = document.getElementById("restore-action-btn");
const restoreDownloadBtn = document.getElementById("restore-download-btn");
const restoreInputImg = document.getElementById("restore-input-img");
const restoreOutputImg = document.getElementById("restore-output-img");
const restoreInputPH = document.getElementById("restore-input-placeholder");
const restoreOutputPH = document.getElementById("restore-output-placeholder");
const restoreModelSel = document.getElementById("restore-model");

// Stores the current input data URL for this page
let restoreInputDataURL = null;
let restoreOutputDataURL = null;

// Open file picker
restoreUploadBtn.addEventListener("click", () => {
  restoreFileInput.value = "";
  restoreFileInput.click();
});

/**
 * Handle a restore file upload from input or drop.
 * @param {File} file
 */
async function handleRestoreFile(file) {
  if (!file) return;
  if (!isImageFile(file)) {
    showToast("Please upload a valid image file.", "error");
    return;
  }

  try {
    restoreInputDataURL = await readFileAsDataURL(file);
    displayImage(restoreInputImg, restoreInputPH, restoreInputDataURL);

    // Reset output when new input uploaded
    restoreOutputDataURL = null;
    resetImage(restoreOutputImg, restoreOutputPH);
    restoreDownloadBtn.disabled = true;
    restoreActionBtn.disabled = false;

    showToast("Image uploaded successfully", "success");
  } catch (err) {
    showToast("Failed to read image file", "error");
  }
}

// Handle file selection
restoreFileInput.addEventListener("change", async () => {
  const file = restoreFileInput.files[0];
  if (!file) return;
  await handleRestoreFile(file);
});

// Restore action
const restoreActionOrigHTML = restoreActionBtn.innerHTML;

restoreActionBtn.addEventListener("click", async () => {
  if (!restoreInputDataURL) return;

  setLoading(restoreActionBtn, true, restoreActionOrigHTML);
  restoreDownloadBtn.disabled = true;

  try {
    // ── API CALL (stubbed) ────────────────────────────────────────────
    // Replace the block below with your actual POST /restore call.
    //
    // const formData = new FormData();
    // formData.append('image', restoreFileInput.files[0]);
    // formData.append('model', restoreModelSel.value);
    //
    // const response = await fetch('/restore', {
    //   method: 'POST',
    //   body: formData,
    // });
    // if (!response.ok) throw new Error('Server error');
    // const blob = await response.blob();
    // restoreOutputDataURL = URL.createObjectURL(blob);
    // ─────────────────────────────────────────────────────────────────

    // MOCK: Simulate network delay and use input as output
    await new Promise((r) => setTimeout(r, 1200));
    restoreOutputDataURL = restoreInputDataURL;

    displayImage(restoreOutputImg, restoreOutputPH, restoreOutputDataURL);
    restoreDownloadBtn.disabled = false;
    showToast("Restoration complete", "success");
  } catch (err) {
    showToast("Restore failed: " + err.message, "error");
  } finally {
    setLoading(restoreActionBtn, false, restoreActionOrigHTML);
  }
});

// Download output
restoreDownloadBtn.addEventListener("click", () => {
  if (!restoreOutputDataURL) return;
  downloadImage(
    restoreOutputDataURL,
    `deeplight-restore-${restoreModelSel.value}.png`,
  );
  showToast("Download started", "info");
});

/* ================================================
   PAGE 2 — COMPARISON SCREEN
   ================================================ */

const compFileInput = document.getElementById("comp-file-input");
const compUploadBtn = document.getElementById("comp-upload-btn");
const compActionBtn = document.getElementById("comp-action-btn");
const compDownloadBtn = document.getElementById("comp-download-btn");

const compInputImg = document.getElementById("comp-input-img");
const compAImg = document.getElementById("comp-a-img");
const compBImg = document.getElementById("comp-b-img");
const compCImg = document.getElementById("comp-c-img");

const compInputPH = document.getElementById("comp-input-placeholder");
const compAPH = document.getElementById("comp-a-placeholder");
const compBPH = document.getElementById("comp-b-placeholder");
const compCPH = document.getElementById("comp-c-placeholder");

let compInputDataURL = null;
let compResultURLs = { a: null, b: null, c: null };

compUploadBtn.addEventListener("click", () => {
  compFileInput.value = "";
  compFileInput.click();
});

/**
 * Handle a comparison file upload from input or drop.
 * @param {File} file
 */
async function handleComparisonFile(file) {
  if (!file) return;
  if (!isImageFile(file)) {
    showToast("Please upload a valid image file.", "error");
    return;
  }

  try {
    compInputDataURL = await readFileAsDataURL(file);
    displayImage(compInputImg, compInputPH, compInputDataURL);

    // Reset outputs
    compResultURLs = { a: null, b: null, c: null };
    [compAImg, compBImg, compCImg].forEach((img, i) => {
      resetImage(img, [compAPH, compBPH, compCPH][i]);
    });
    compDownloadBtn.disabled = true;
    compActionBtn.disabled = false;

    showToast("Image uploaded successfully", "success");
  } catch (err) {
    showToast("Failed to read image file", "error");
  }
}

compFileInput.addEventListener("change", async () => {
  const file = compFileInput.files[0];
  if (!file) return;
  await handleComparisonFile(file);
});

const compActionOrigHTML = compActionBtn.innerHTML;

compActionBtn.addEventListener("click", async () => {
  if (!compInputDataURL) return;

  setLoading(compActionBtn, true, compActionOrigHTML);
  compDownloadBtn.disabled = true;

  try {
    // ── API CALL (stubbed) ────────────────────────────────────────────
    // Replace below with your POST /compare call.
    //
    // const formData = new FormData();
    // formData.append('image', compFileInput.files[0]);
    //
    // const response = await fetch('/compare', {
    //   method: 'POST',
    //   body: formData,
    // });
    // if (!response.ok) throw new Error('Server error');
    // const data = await response.json();
    // // Expected: { modelA: <base64 or URL>, modelB: ..., modelC: ... }
    // compResultURLs.a = data.modelA;
    // compResultURLs.b = data.modelB;
    // compResultURLs.c = data.modelC;
    // ─────────────────────────────────────────────────────────────────

    // MOCK: simulate delay, use input image for all three outputs
    await new Promise((r) => setTimeout(r, 1400));
    compResultURLs.a = compInputDataURL;
    compResultURLs.b = compInputDataURL;
    compResultURLs.c = compInputDataURL;

    displayImage(compAImg, compAPH, compResultURLs.a);
    displayImage(compBImg, compBPH, compResultURLs.b);
    displayImage(compCImg, compCPH, compResultURLs.c);
    compDownloadBtn.disabled = false;
    showToast("Comparison complete", "success");
  } catch (err) {
    showToast("Comparison failed: " + err.message, "error");
  } finally {
    setLoading(compActionBtn, false, compActionOrigHTML);
  }
});

// Download Model A result (first output) as representative
compDownloadBtn.addEventListener("click", () => {
  if (!compResultURLs.a) return;
  downloadImage(compResultURLs.a, "deeplight-compare-modelA.png");
  showToast("Download started (Model A)", "info");
});

/* ================================================
   PAGE 3 — DETECTION SCREEN
   ================================================ */

const detFileInput = document.getElementById("det-file-input");
const detUploadBtn = document.getElementById("det-upload-btn");
const detActionBtn = document.getElementById("det-action-btn");
const detDownloadBtn = document.getElementById("det-download-btn");
const detModelSel = document.getElementById("det-model");

const detInputImg = document.getElementById("det-input-img");
const detCustomImg = document.getElementById("det-custom-img");
const detYoloImg = document.getElementById("det-yolo-img");
const detInputPH = document.getElementById("det-input-placeholder");
const detCustomPH = document.getElementById("det-custom-placeholder");
const detYoloPH = document.getElementById("det-yolo-placeholder");

let detInputDataURL = null;
let detCustomOutputDataURL = null;
let detYoloOutputDataURL = null;

detUploadBtn.addEventListener("click", () => {
  detFileInput.value = "";
  detFileInput.click();
});

/**
 * Handle a detection file upload from input or drop.
 * @param {File} file
 */
async function handleDetectionFile(file) {
  if (!file) return;
  if (!isImageFile(file)) {
    showToast("Please upload a valid image file.", "error");
    return;
  }

  try {
    detInputDataURL = await readFileAsDataURL(file);
    displayImage(detInputImg, detInputPH, detInputDataURL);

    detCustomOutputDataURL = null;
    detYoloOutputDataURL = null;
    resetImage(detCustomImg, detCustomPH);
    resetImage(detYoloImg, detYoloPH);
    detDownloadBtn.disabled = true;
    detActionBtn.disabled = false;

    showToast("Image uploaded successfully", "success");
  } catch (err) {
    showToast("Failed to read image file", "error");
  }
}

detFileInput.addEventListener("change", async () => {
  const file = detFileInput.files[0];
  if (!file) return;
  await handleDetectionFile(file);
});

const detActionOrigHTML = detActionBtn.innerHTML;

detActionBtn.addEventListener("click", async () => {
  if (!detInputDataURL) return;

  setLoading(detActionBtn, true, detActionOrigHTML);
  detDownloadBtn.disabled = true;

  try {
    // ── API CALL (stubbed) ────────────────────────────────────────────
    // Replace below with your POST /detect call.
    //
    // const formData = new FormData();
    // formData.append('image', detFileInput.files[0]);
    // formData.append('model', detModelSel.value);
    //
    // const response = await fetch('/detect', {
    //   method: 'POST',
    //   body: formData,
    // });
    // if (!response.ok) throw new Error('Server error');
    // const payload = await response.json();
    // detCustomOutputDataURL = payload.custom;
    // detYoloOutputDataURL = payload.yolov8;
    // ─────────────────────────────────────────────────────────────────

    // MOCK: simulate delay and render both panels from input preview
    await new Promise((r) => setTimeout(r, 1000));
    detCustomOutputDataURL = detInputDataURL;
    detYoloOutputDataURL = detInputDataURL;

    displayImage(detCustomImg, detCustomPH, detCustomOutputDataURL);
    displayImage(detYoloImg, detYoloPH, detYoloOutputDataURL);
    detDownloadBtn.disabled = false;
    showToast("Detection complete", "success");
  } catch (err) {
    showToast("Detection failed: " + err.message, "error");
  } finally {
    setLoading(detActionBtn, false, detActionOrigHTML);
  }
});

detDownloadBtn.addEventListener("click", () => {
  const urlToDownload = detYoloOutputDataURL || detCustomOutputDataURL;
  if (!urlToDownload) return;
  downloadImage(urlToDownload, `deeplight-detection-${detModelSel.value}.png`);
  showToast("Download started", "info");
});

// Initialize dropzone drag & drop support after page script loads.
initDropzones();
