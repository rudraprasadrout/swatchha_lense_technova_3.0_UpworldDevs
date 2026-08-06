/**
 * Swachh Lens - Upload Page Controller
 * Controls Drag & Drop, File Preview, Geolocation, Voice Note, & API Submission
 */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("uploadForm")) {
    UploadController.init();
  }
});

const UploadController = {
  selectedFile: null,
  currentLat: CONFIG.DEFAULT_LAT,
  currentLng: CONFIG.DEFAULT_LNG,

  init() {
    this.bindDropzone();
    this.bindInputs();
    this.bindLocation();
    this.bindFormSubmit();
  },

  /**
   * Bind Drag and Drop events
   */
  bindDropzone() {
    const dropzone = document.getElementById("uploadDropzone");
    const fileInput = document.getElementById("imageFileInput");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", (e) => {
      // Avoid opening file browser if clicked inside preview remove button
      if (e.target.closest("#removeImageBtn")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files[0]) {
        this.handleFileSelect(dt.files[0]);
      }
    });
  },

  /**
   * Handle selected image file validation and preview rendering
   */
  async handleFileSelect(file) {
    if (!CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
      Toast.error("Please upload a valid image file (JPG, PNG, WEBP)");
      return;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
      Toast.error("File size exceeds maximum limit of 10MB");
      return;
    }

    this.selectedFile = file;

    // Render Preview
    const previewContainer = document.getElementById("imagePreviewContainer");
    const dropzoneContent = document.getElementById("dropzonePromptContent");
    const previewImg = document.getElementById("previewImageElement");
    const fileMeta = document.getElementById("fileMetaDetails");

    try {
      const dataUrl = await Utils.fileToDataUrl(file);
      previewImg.src = dataUrl;
      fileMeta.textContent = `${file.name} • ${Utils.formatBytes(file.size)}`;

      dropzoneContent.style.display = "none";
      previewContainer.style.display = "block";

      const analyzeBtn = document.getElementById("analyzeSubmitBtn");
      if (analyzeBtn) analyzeBtn.disabled = false;

      Toast.success("Image loaded successfully!");
    } catch (e) {
      Toast.error("Failed to read image file");
    }
  },

  /**
   * Remove selected image
   */
  clearSelectedFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById("imageFileInput");
    if (fileInput) fileInput.value = "";

    const previewContainer = document.getElementById("imagePreviewContainer");
    const dropzoneContent = document.getElementById("dropzonePromptContent");
    const analyzeBtn = document.getElementById("analyzeSubmitBtn");

    if (previewContainer) previewContainer.style.display = "none";
    if (dropzoneContent) dropzoneContent.style.display = "block";
    if (analyzeBtn) analyzeBtn.disabled = true;
  },

  bindInputs() {
    const removeBtn = document.getElementById("removeImageBtn");
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearSelectedFile();
      });
    }
  },

  /**
   * Browser HTML5 Geolocation API
   */
  bindLocation() {
    const detectBtn = document.getElementById("detectLocationBtn");
    const latInput = document.getElementById("latInput");
    const lngInput = document.getElementById("lngInput");
    const locationStatus = document.getElementById("locationStatusText");

    if (detectBtn) {
      detectBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
          Toast.error("Geolocation is not supported by your browser");
          return;
        }

        locationStatus.textContent = "Detecting current coordinates...";

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.currentLat = pos.coords.latitude;
            this.currentLng = pos.coords.longitude;

            if (latInput) latInput.value = this.currentLat.toFixed(4);
            if (lngInput) lngInput.value = this.currentLng.toFixed(4);

            locationStatus.textContent = `📍 GPS Acquired: ${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)}`;
            Toast.success("Coordinates updated from device GPS");
          },
          (err) => {
            console.warn("Geolocation error:", err.message);
            locationStatus.textContent = "⚠️ Could not acquire GPS. Using default city coordinates.";
            Toast.warning("Using default coordinates (Bhubaneswar)");
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      });
    }
  },

  /**
   * Form submission to backend POST /api/v1/report
   */
  bindFormSubmit() {
    const form = document.getElementById("uploadForm");
    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBarFill = document.getElementById("uploadProgressBarFill");
    const progressText = document.getElementById("uploadProgressText");
    const analyzeBtn = document.getElementById("analyzeSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!this.selectedFile) {
        Toast.error("Please select or drop an image first!");
        return;
      }

      const latVal = parseFloat(document.getElementById("latInput")?.value || this.currentLat);
      const lngVal = parseFloat(document.getElementById("lngInput")?.value || this.currentLng);
      const noteVal = document.getElementById("noteInput")?.value || "";
      const langVal = document.getElementById("langSelect")?.value || "or-IN";
      const apiKeyVal = document.getElementById("apiKeyInput")?.value || "";

      const formData = new FormData();
      formData.append("image", this.selectedFile);
      formData.append("lat", latVal);
      formData.append("lng", lngVal);
      formData.append("note", noteVal);
      formData.append("lang", langVal);
      if (apiKeyVal.trim()) {
        formData.append("api_key", apiKeyVal.trim());
      }

      // UI Loading state
      if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<span class="spinner"></span> Processing with AI...`;
      }
      if (progressContainer) progressContainer.style.display = "block";

      try {
        const response = await ApiClient.submitReport(formData, (percent) => {
          if (progressBarFill) progressBarFill.style.width = `${percent}%`;
          if (progressText) {
            progressText.textContent = percent < 100 
              ? `Uploading image... ${percent}%` 
              : `Running Privacy Blur, Spatial Dedup & Mistral AI analysis...`;
          }
        });

        Toast.success("Analysis complete! Redirecting to results...");

        // Save result payload in localStorage for smooth state transition
        localStorage.setItem("swachhlens_last_result", JSON.stringify(response));

        let redirectUrl = "result.html";
        if (response.action === "merged_duplicate") {
          redirectUrl += `?ticket_id=${encodeURIComponent(response.ticket_id)}&action=merged_duplicate`;
        } else if (response.ticket && response.ticket.id) {
          redirectUrl += `?ticket_id=${encodeURIComponent(response.ticket.id)}&action=created_new`;
        }

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1200);

      } catch (err) {
        Toast.error(err.message || "Failed to analyze image with Swachh Lens AI engine");
        if (analyzeBtn) {
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML = `🔍 Analyze Cleanliness & Urgency`;
        }
        if (progressContainer) progressContainer.style.display = "none";
      }
    });
  }
};

window.UploadController = UploadController;
