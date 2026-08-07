let currentLat = CONFIG.DEFAULT_LAT;
let currentLng = CONFIG.DEFAULT_LNG;

document.addEventListener("DOMContentLoaded", () => {
    updateTime();
    
    // Auto-fetch GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => {
            currentLat = p.coords.latitude;
            currentLng = p.coords.longitude;
            const locInput = document.getElementById('locationInput');
            if (locInput) locInput.value = `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
        }, err => console.log("GPS fallback used"));
    }

    // Camera Preview Handler
    const imgInput = document.getElementById('imageInput');
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.getElementById('previewImg');
                    if (img) {
                        img.src = ev.target.result;
                        img.style.display = 'block';
                    }
                    const placeholder = document.getElementById('capturePlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
                updateTime();
            }
        });
    }
});

function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById('dateTimeInput');
    if (timeEl) {
        timeEl.value = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + ", " + now.toLocaleDateString();
    }
}

async function submitReport(e) {
    // 1. Strictly halt default browser form behavior
    if (e) { 
        e.preventDefault(); 
        e.stopPropagation(); 
    }

    const fileInput = document.getElementById('imageInput');
    const speechText = document.getElementById('speechText') ? document.getElementById('speechText').value : "";
    const langSelect = document.getElementById('langSelect') ? document.getElementById('langSelect').value : "or-IN";
    const sensitiveSelect = document.getElementById('sensitiveSelect') ? document.getElementById('sensitiveSelect').value : "None";
    const submitBtn = document.getElementById('submitBtn');

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("Please select or capture a photo first!");
        return false;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Anonymizing & Running AI...</span>`;
    }

    // Parse coordinates from location input if manually edited
    const locInput = document.getElementById('locationInput');
    if (locInput && locInput.value) {
        const parts = locInput.value.split(',');
        if (parts.length === 2) {
            const pLat = parseFloat(parts[0]);
            const pLng = parseFloat(parts[1]);
            if (!isNaN(pLat) && !isNaN(pLng)) {
                currentLat = pLat;
                currentLng = pLng;
            }
        }
    }

    const isSensitive = sensitiveSelect !== "None";

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('lat', currentLat);
    formData.append('lng', currentLng);
    formData.append('note', speechText);
    formData.append('lang', langSelect);
    formData.append('is_sensitive_area', isSensitive ? "1" : "0");
    formData.append('sensitive_area_type', sensitiveSelect);

    try {
        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "http://127.0.0.1:5000";
        const res = await fetch(`${baseUrl}/api/v1/report`, { method: 'POST', body: formData });
        const result = await res.json();

        if (result.status === 'success') {
            const card = document.getElementById('detailsCard');
            if (card) {
                card.style.display = 'flex'; // Permanently reveal details card
            }

            if (result.action === 'merged_duplicate') {
                setSafeText('resTicketId', result.ticket_id);
                setSafeText('resCategory', "Merged Duplicate (<20m Radius)");
                setSafeText('resVolume', "Priority Incremented (+1)");
                setSafeText('resUrgency', "Score Escalated");
                setSafeText('resDispatchUnit', "Escalated Team Dispatch");
                setSafeText('resDispatch', result.message);
            } else if (result.ticket) {
                const t = result.ticket;
                setSafeText('resTicketId', t.id);
                setSafeText('resCategory', t.category);
                setSafeText('resVolume', t.volume_band);
                setSafeText('resDispatchUnit', t.dispatch_unit || "Manual Sanitation Crew");
                setSafeText('resUrgency', `${t.urgency_score} / 10` + (t.is_sensitive_area ? ` (${t.sensitive_area_type})` : ''));
                setSafeText('resDispatch', `${t.description} (Summary: ${t.note_summary_en || 'Processed'})`);
                setSafeHTML('resFaces', `<i class="fa-solid fa-user-shield"></i> ${t.faces_blurred} Faces Blurred`);
                setSafeHTML('resPlates', `<i class="fa-solid fa-car"></i> ${t.plates_blurred} Plates Blurred`);

                // Municipal Jurisdiction Geofence Check (Bhubaneswar BMC Limits)
                const jRow = document.getElementById('jurisdictionRow');
                if (t.in_jurisdiction === false || t.in_jurisdiction === 0) {
                    if (jRow) jRow.style.display = 'flex';
                    const noteMsg = t.jurisdiction_note || `Out of BMC Region. This location falls under ${t.governing_authority || 'District Panchayati Raj / Highway Development Authority'}. Please contact your local Panchayati Raj office or Highway Development Authority.`;
                    setSafeHTML('jurisdictionBadge', `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Out of BMC Municipal Region</strong><br><span style="font-size:0.75rem; font-weight:500; color:var(--text-main); margin-top:4px; display:block; line-height:1.5;">${noteMsg}</span>`);
                } else {
                    if (jRow) jRow.style.display = 'none';
                }
            }





            // Smooth scroll to receipt so the user sees the output immediately
            if (card) card.scrollIntoView({ behavior: 'smooth' });

        } else {
            alert("API Error: " + result.message);
        }
    } catch(err) {
        console.error("Submission failed:", err);
        alert("Failed to reach server. Ensure python -m backend.utils.app is running at " + CONFIG.API_BASE_URL);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Submit Complaint</span>`;
        }
    }

    return false;
}

// Failsafe text/html setters preventing JS crashes
function setSafeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setSafeHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}