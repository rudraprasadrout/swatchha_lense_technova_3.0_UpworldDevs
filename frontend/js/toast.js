/**
 * Swachh Lens - Toast Notification Manager
 */

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  },

  show(message, type = "info", duration = 4500) {
    this.init();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";
    if (type === "warning") icon = "⚡";

    toast.innerHTML = `
      <span style="font-size:1.2rem;">${icon}</span>
      <div style="flex:1;">
        <p style="font-weight:600; font-size:0.95rem; margin:0;">${Utils.escapeHtml(message)}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.onclick = () => this.dismiss(toast);

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  },

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = "toastSlideIn 0.3s reverse forwards";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  },

  success(msg, dur) { return this.show(msg, "success", dur); },
  error(msg, dur) { return this.show(msg, "error", dur); },
  warning(msg, dur) { return this.show(msg, "warning", dur); },
  info(msg, dur) { return this.show(msg, "info", dur); }
};

window.Toast = Toast;
