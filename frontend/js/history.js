/**
 * Swachh Lens - Reports History Page Controller
 * Handles Ticket Fetching, Filtering, Live Search, Sorting, Pagination & Modal Viewer
 */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("historyGridContainer")) {
    HistoryController.init();
  }
});

const HistoryController = {
  rawReports: [],
  filteredReports: [],
  currentPage: 1,
  pageSize: 6,

  async init() {
    this.bindFilters();
    this.bindModal();
    await this.fetchReports();
  },

  async fetchReports() {
    const gridContainer = document.getElementById("historyGridContainer");
    if (!gridContainer) return;

    // Render Skeleton Loading state
    this.renderSkeletons(gridContainer);

    try {
      this.rawReports = await ApiClient.getReports();
      this.applyFiltersAndSort();
    } catch (err) {
      gridContainer.innerHTML = `
        <div class="glass-card text-center" style="grid-column: 1/-1; padding:3rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">⚡</div>
          <h3>Failed to Connect to Backend Engine</h3>
          <p style="color:var(--text-secondary); margin:1rem 0;">${Utils.escapeHtml(err.message)}</p>
          <button class="btn btn-primary" onclick="HistoryController.fetchReports()">Retry Loading</button>
        </div>
      `;
    }
  },

  renderSkeletons(container) {
    let skeletons = "";
    for (let i = 0; i < 6; i++) {
      skeletons += `<div class="glass-card skeleton-card skeleton"></div>`;
    }
    container.innerHTML = skeletons;
  },

  bindFilters() {
    const searchInput = document.getElementById("searchHistoryInput");
    const categorySelect = document.getElementById("categoryFilterSelect");
    const sortSelect = document.getElementById("sortOrderSelect");

    const onFilterChange = () => {
      this.currentPage = 1;
      this.applyFiltersAndSort();
    };

    if (searchInput) searchInput.addEventListener("input", onFilterChange);
    if (categorySelect) categorySelect.addEventListener("change", onFilterChange);
    if (sortSelect) sortSelect.addEventListener("change", onFilterChange);
  },

  applyFiltersAndSort() {
    const searchQuery = (document.getElementById("searchHistoryInput")?.value || "").toLowerCase().trim();
    const categoryFilter = document.getElementById("categoryFilterSelect")?.value || "all";
    const sortOrder = document.getElementById("sortOrderSelect")?.value || "urgency_desc";

    let result = [...this.rawReports];

    // Category Filter
    if (categoryFilter !== "all") {
      result = result.filter(r => (r.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    // Search Query Filter
    if (searchQuery) {
      result = result.filter(r => 
        (r.id || "").toLowerCase().includes(searchQuery) ||
        (r.category || "").toLowerCase().includes(searchQuery) ||
        (r.description || "").toLowerCase().includes(searchQuery) ||
        (r.note || "").toLowerCase().includes(searchQuery)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === "urgency_desc") return (b.urgency_score || 0) - (a.urgency_score || 0);
      if (sortOrder === "urgency_asc") return (a.urgency_score || 0) - (b.urgency_score || 0);
      if (sortOrder === "date_desc") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortOrder === "date_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return 0;
    });

    this.filteredReports = result;
    this.renderPage();
  },

  renderPage() {
    const gridContainer = document.getElementById("historyGridContainer");
    const paginationContainer = document.getElementById("paginationControls");
    const totalCountEl = document.getElementById("totalReportsCountDisplay");

    if (totalCountEl) totalCountEl.textContent = this.filteredReports.length;

    if (!this.filteredReports.length) {
      gridContainer.innerHTML = `
        <div class="glass-card text-center" style="grid-column: 1/-1; padding:3rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">📭</div>
          <h3>No Civic Reports Found</h3>
          <p style="color:var(--text-secondary); margin:0.5rem 0;">Try modifying your search filter or upload a new report.</p>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    // Pagination Slice
    const totalPages = Math.ceil(this.filteredReports.length / this.pageSize);
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageItems = this.filteredReports.slice(startIdx, startIdx + this.pageSize);

    // Render Cards
    gridContainer.innerHTML = pageItems.map(item => this.createReportCardHtml(item)).join("");

    // Render Pagination Buttons
    this.renderPagination(totalPages, paginationContainer);
  },

  createReportCardHtml(item) {
    const score = Number(item.urgency_score || 1.0).toFixed(1);
    const color = Utils.getScoreColor(score);
    const dateFormatted = Utils.formatDate(item.created_at);

    return `
      <div class="glass-card glass-card-hover fade-in" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
            <span class="badge badge-blue">${Utils.escapeHtml(item.id)}</span>
            <div style="display:flex; align-items:center; gap:0.4rem; font-weight:800; font-size:1.2rem; color:${color};">
              <span>⚡</span> ${score}
            </div>
          </div>
          
          <h3 style="font-size:1.15rem; margin-bottom:0.4rem;">${Utils.escapeHtml(item.category || 'Organic Waste')}</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">📅 ${dateFormatted}</p>
          <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5; margin-bottom:1rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
            ${Utils.escapeHtml(item.description || 'No detailed dispatch recommendation.')}
          </p>
        </div>

        <div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.2rem;">
            <span class="badge badge-green">🔒 ${item.faces_blurred || 0} Faces Obscured</span>
            ${item.duplicate_count > 0 ? `<span class="badge badge-amber">🔄 ${item.duplicate_count} Duplicates</span>` : ''}
          </div>
          <button class="btn btn-glass btn-sm" style="width:100%;" onclick="HistoryController.openDetailModal('${item.id}')">
            🔍 View Report Details
          </button>
        </div>
      </div>
    `;
  },

  renderPagination(totalPages, container) {
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = "";
      return;
    }

    let buttonsHtml = `
      <button class="btn btn-glass btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} onclick="HistoryController.goToPage(${this.currentPage - 1})">
        ◀ Prev
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      buttonsHtml += `
        <button class="btn ${i === this.currentPage ? 'btn-primary' : 'btn-glass'} btn-sm" onclick="HistoryController.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    buttonsHtml += `
      <button class="btn btn-glass btn-sm" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="HistoryController.goToPage(${this.currentPage + 1})">
        Next ▶
      </button>
    `;

    container.innerHTML = buttonsHtml;
  },

  goToPage(page) {
    this.currentPage = page;
    this.renderPage();
    window.scrollTo({ top: 300, behavior: "smooth" });
  },

  bindModal() {
    const closeBtn = document.getElementById("modalCloseBtn");
    const overlay = document.getElementById("historyModalOverlay");

    if (closeBtn && overlay) {
      closeBtn.onclick = () => overlay.classList.remove("active");
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove("active");
      };
    }
  },

  async openDetailModal(ticketId) {
    const item = this.rawReports.find(r => r.id === ticketId);
    if (!item) return;

    const overlay = document.getElementById("historyModalOverlay");
    const modalTitle = document.getElementById("modalTicketId");
    const modalCategory = document.getElementById("modalCategory");
    const modalScore = document.getElementById("modalUrgencyScore");
    const modalDescription = document.getElementById("modalDescription");
    const modalImage = document.getElementById("modalTicketImage");

    if (modalTitle) modalTitle.textContent = item.id;
    if (modalCategory) modalCategory.textContent = item.category || "Organic Waste";
    if (modalScore) modalScore.textContent = `${item.urgency_score} / 10.0`;
    if (modalDescription) modalDescription.textContent = item.description || "N/A";

    if (modalImage) {
      modalImage.src = "";
      modalImage.style.display = "none";
    }

    if (overlay) overlay.classList.add("active");

    // Fetch Base64 image payload asynchronously
    try {
      const b64 = await ApiClient.getReportImage(ticketId);
      if (modalImage) {
        modalImage.src = `data:image/jpeg;base64,${b64}`;
        modalImage.style.display = "block";
      }
    } catch (e) {
      console.warn("Image retrieval failed for modal:", e);
    }
  }
};

window.HistoryController = HistoryController;
