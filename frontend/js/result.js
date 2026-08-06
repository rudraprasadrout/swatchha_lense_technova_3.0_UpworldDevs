/**
 * Swachh Lens - Result Page Controller
 * Displays Prediction & Analysis Results, Score Gauge, Anonymized Image & Recommendations
 */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("resultContainer")) {
    ResultController.init();
  }
});

const ResultController = {
  currentTicket: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get("ticket_id");
    const action = urlParams.get("action");

    // Try loading from localStorage first if available
    const cachedStr = localStorage.getItem("swachhlens_last_result");
    let cachedData = null;

    if (cachedStr) {
      try {
        cachedData = JSON.parse(cachedStr);
      } catch (e) {}
    }

    if (action === "merged_duplicate") {
      this.renderDuplicateNotice(ticketId);
    }

    if (cachedData && cachedData.ticket && cachedData.ticket.id === ticketId) {
      this.currentTicket = cachedData.ticket;
      this.renderTicketDetails(this.currentTicket);
      this.loadTicketImage(ticketId);
    } else if (ticketId) {
      await this.fetchTicketFromReports(ticketId);
    } else if (cachedData && cachedData.ticket) {
      this.currentTicket = cachedData.ticket;
      this.renderTicketDetails(this.currentTicket);
      this.loadTicketImage(this.currentTicket.id);
    } else {
      this.showNoTicketFound();
    }
  },

  /**
   * Display notice banner if this report was merged as duplicate
   */
  renderDuplicateNotice(ticketId) {
    const banner = document.getElementById("duplicateBannerAlert");
    if (banner) {
      banner.style.display = "flex";
      banner.innerHTML = `
        <div style="font-size:1.5rem;">⚡</div>
        <div>
          <h4 style="margin:0; font-size:1.05rem;">Spatial Duplicate Detected (Within 20m Radius)</h4>
          <p style="margin:0; font-size:0.9rem; opacity:0.9;">
            This report matched an existing active civic ticket (ID: <strong>${Utils.escapeHtml(ticketId)}</strong>). 
            Priority urgency score has been automatically incremented and civic squad alerted.
          </p>
        </div>
      `;
    }
  },

  /**
   * Fetch ticket details from /api/v1/reports if not cached
   */
  async fetchTicketFromReports(ticketId) {
    try {
      const reports = await ApiClient.getReports();
      const match = reports.find(r => r.id === ticketId);
      if (match) {
        this.currentTicket = match;
        this.renderTicketDetails(match);
        this.loadTicketImage(ticketId);
      } else {
        this.showNoTicketFound();
      }
    } catch (err) {
      Toast.error("Failed to retrieve report details from server");
      this.showNoTicketFound();
    }
  },

  /**
   * Fetch Base64 image payload from /api/v1/report/<id>/image
   */
  async loadTicketImage(ticketId) {
    const imgEl = document.getElementById("resultAnonymizedImage");
    const loader = document.getElementById("imageLoaderSkeleton");

    if (!imgEl) return;

    try {
      const b64 = await ApiClient.getReportImage(ticketId);
      imgEl.src = `data:image/jpeg;base64,${b64}`;
      imgEl.onload = () => {
        if (loader) loader.style.display = "none";
        imgEl.style.display = "block";
      };
    } catch (err) {
      console.warn("Could not load Base64 image:", err);
      if (loader) loader.textContent = "⚠️ Image preview unavailable";
    }
  },

  /**
   * Render ticket metadata and urgency score gauge
   */
  renderTicketDetails(t) {
    document.getElementById("ticketIdDisplay").textContent = t.id || "SW-UNKNOWN";
    document.getElementById("categoryDisplay").textContent = t.category || "Organic Waste";
    document.getElementById("volumeDisplay").textContent = t.volume_band || "Medium (0.2-1.0m³)";
    
    // Confidence & Location
    const conf = t.confidence ? Math.round(t.confidence * 100) : 92;
    document.getElementById("confidenceDisplay").textContent = `${conf}%`;
    document.getElementById("coordsDisplay").textContent = `${Number(t.lat).toFixed(4)}, ${Number(t.lng).toFixed(4)}`;

    // Description / AI Recommendation
    document.getElementById("descriptionDisplay").textContent = t.description || "Inspect site for general waste clearance.";
    
    if (t.note_summary_en) {
      const noteBox = document.getElementById("noteSummaryBox");
      if (noteBox) {
        noteBox.style.display = "block";
        document.getElementById("noteSummaryText").textContent = t.note_summary_en;
      }
    }

    // Privacy Statistics
    document.getElementById("facesCountDisplay").textContent = t.faces_blurred || 0;
    document.getElementById("platesCountDisplay").textContent = t.plates_blurred || 0;

    // Hazard Badges
    const hazardContainer = document.getElementById("hazardBadgesContainer");
    if (hazardContainer) {
      hazardContainer.innerHTML = "";
      const isDrain = t.hazard_level === 1 || t.is_drain_blocked;
      const isFire = t.is_fire_hazard;

      if (isDrain) {
        hazardContainer.innerHTML += `<span class="badge badge-red">🌊 Drain Blockage Risk</span>`;
      }
      if (isFire) {
        hazardContainer.innerHTML += `<span class="badge badge-red">🔥 Flammable / Fire Hazard</span>`;
      }
      if (!isDrain && !isFire) {
        hazardContainer.innerHTML += `<span class="badge badge-green">🛡️ Standard Civic Waste</span>`;
      }
    }

    // Urgency Score Gauge Animation
    this.animateScoreGauge(t.urgency_score || 5.0);
  },

  /**
   * SVG Circular Score Meter Animation (0 - 10 Score Scale)
   */
  animateScoreGauge(score) {
    const scoreValEl = document.getElementById("scoreValueText");
    const scoreCategoryEl = document.getElementById("scoreCategoryText");
    const circlePath = document.getElementById("scoreCirclePath");

    const numericScore = parseFloat(score) || 1.0;
    const color = Utils.getScoreColor(numericScore);
    const categoryLabel = Utils.getScoreCategoryLabel(numericScore);

    if (scoreValEl) scoreValEl.textContent = numericScore.toFixed(1);
    if (scoreCategoryEl) {
      scoreCategoryEl.textContent = categoryLabel;
      scoreCategoryEl.style.color = color;
    }

    if (circlePath) {
      // Circumference of r=15.9155 is ~100
      const strokeDash = Math.min(100, Math.max(0, (numericScore / 10.0) * 100));
      circlePath.style.stroke = color;
      circlePath.style.strokeDasharray = `${strokeDash}, 100`;
    }
  },

  showNoTicketFound() {
    const container = document.getElementById("resultContainer");
    if (container) {
      container.innerHTML = `
        <div class="glass-card text-center" style="max-width:500px; margin:3rem auto;">
          <div style="font-size:3rem; margin-bottom:1rem;">🔎</div>
          <h2>No Active Analysis Found</h2>
          <p style="color:var(--text-secondary); margin:1rem 0;">Please upload an image to analyze cleanliness and urgency.</p>
          <a href="upload.html" class="btn btn-primary">Go to Upload Page</a>
        </div>
      `;
    }
  }
};

window.ResultController = ResultController;
