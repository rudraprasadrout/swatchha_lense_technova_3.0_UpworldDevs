import { createReport, ensureAuthenticated } from "../services/reportService.js";

let currentLat = (window.CONFIG && window.CONFIG.DEFAULT_LAT) ? window.CONFIG.DEFAULT_LAT : 20.2961;
let currentLng = (window.CONFIG && window.CONFIG.DEFAULT_LNG) ? window.CONFIG.DEFAULT_LNG : 85.8245;

function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById("dateTimeInput");

    if (timeEl) {
        timeEl.value = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, ${now.toLocaleDateString()}`;
    }
}

function setSafeText(id, text) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = text;
    }
}

function setSafeHTML(id, html) {
    const element = document.getElementById(id);

    if (element) {
        element.innerHTML = html;
    }
}

function showReceipt(report) {
    const card = document.getElementById("detailsCard");

    if (card) {
        card.style.display = "flex";
        card.scrollIntoView({ behavior: "smooth" });
    }

    setSafeText("resTicketId", report.id);
    setSafeText("resCategory", report.photoUrl ? "Stored in Firestore" : "Saved");
    setSafeText("resVolume", `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`);
    setSafeText("resDispatchUnit", report.createdBy);
    setSafeText("resUrgency", report.regionalVoiceLanguage || "en-IN");
    setSafeText("resDispatch", report.locationSensitivityZone || "None");
    setSafeText("resFaces", `Submitted ${report.createdAt ? new Date(report.createdAt).toLocaleString() : report.timestamp}`);
    setSafeText("resPlates", report.photoUrl ? "Photo uploaded" : "Photo pending");
    setSafeHTML("jurisdictionBadge", `<i class="fa-solid fa-circle-check"></i> Report saved to Firebase${report.createdAt ? `<br><span style="font-size:0.75rem; font-weight:500; color:var(--text-main); margin-top:4px; display:block; line-height:1.5;">Created at ${new Date(report.createdAt).toLocaleString()}</span>` : ""}`);

    const jurisdictionRow = document.getElementById("jurisdictionRow");

    if (jurisdictionRow) {
        jurisdictionRow.style.display = "flex";
    }
}

async function submitReport(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const fileInput = document.getElementById("imageInput");
    const speechText = document.getElementById("speechText") ? document.getElementById("speechText").value : "";
    const langSelect = document.getElementById("langSelect") ? document.getElementById("langSelect").value : "or-IN";
    const sensitiveSelect = document.getElementById("sensitiveSelect") ? document.getElementById("sensitiveSelect").value : "None";
    const dateTimeInput = document.getElementById("dateTimeInput");
    const submitBtn = document.getElementById("submitBtn");

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("Please select or capture a photo first.");
        return false;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Uploading to Firebase...</span>`;
    }

    const locInput = document.getElementById("locationInput");

    if (locInput && locInput.value) {
        const parts = locInput.value.split(",");

        if (parts.length === 2) {
            const parsedLat = Number.parseFloat(parts[0]);
            const parsedLng = Number.parseFloat(parts[1]);

            if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
                currentLat = parsedLat;
                currentLng = parsedLng;
            }
        }
    }

    try {
        const report = await createReport({
            photoFile: fileInput.files[0],
            latitude: currentLat,
            longitude: currentLng,
            timestamp: dateTimeInput ? dateTimeInput.value : new Date().toISOString(),
            regionalVoiceLanguage: langSelect,
            voiceTranscript: speechText,
            locationSensitivityZone: sensitiveSelect
        });

        showReceipt(report);
        return report;
    } catch (error) {
        console.error("Firebase report submission failed:", error);
        alert(error?.message || "Unable to save the report to Firebase.");
        return false;
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Submit Complaint</span>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateTime();

    ensureAuthenticated().catch((error) => {
        console.warn("Firebase anonymous authentication could not be established immediately.", error);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;

            const locationInput = document.getElementById("locationInput");

            if (locationInput) {
                locationInput.value = `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
            }
        }, () => {
            console.log("GPS fallback used");
        });
    }

    const imgInput = document.getElementById("imageInput");

    if (imgInput) {
        imgInput.addEventListener("change", (event) => {
            const file = event.target.files && event.target.files[0];

            if (!file) {
                return;
            }

            const reader = new FileReader();

            reader.onload = (readerEvent) => {
                const img = document.getElementById("previewImg");

                if (img) {
                    img.src = readerEvent.target.result;
                    img.style.display = "block";
                }

                const placeholder = document.getElementById("capturePlaceholder");

                if (placeholder) {
                    placeholder.style.display = "none";
                }
            };

            reader.readAsDataURL(file);
            updateTime();
        });
    }

    const captureBox = document.getElementById("captureBox");

    if (captureBox && imgInput) {
        captureBox.addEventListener("click", (event) => {
            if (event.target === imgInput) {
                return;
            }

            imgInput.click();
        });
    }
});

window.updateTime = updateTime;
window.submitReport = submitReport;