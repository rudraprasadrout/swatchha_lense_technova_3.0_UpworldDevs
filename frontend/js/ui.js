/**
 * Swachh Lens - Global UI Controller
 * Handles Theme Toggle (Dark/Light), Navbar sticky behaviors, Mobile Menu, Active links.
 */

document.addEventListener("DOMContentLoaded", () => {
  UI.init();
});

const UI = {
  init() {
    this.initTheme();
    this.initNavbar();
    this.initMobileMenu();
    this.highlightActiveNavLink();
  },

  /**
   * Theme Toggle (Dark Mode & Light Mode)
   */
  initTheme() {
    const savedTheme = localStorage.getItem("swachhlens_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const themeToggleBtns = document.querySelectorAll(".theme-toggle-btn");
    themeToggleBtns.forEach(btn => {
      this.updateThemeButtonIcon(btn, savedTheme);
      btn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("swachhlens_theme", newTheme);
        this.updateThemeButtonIcon(btn, newTheme);
        Toast.info(`Switched to ${newTheme} mode`, 1500);
      });
    });
  },

  updateThemeButtonIcon(btn, theme) {
    if (!btn) return;
    btn.innerHTML = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("title", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  },

  /**
   * Navbar scroll effect
   */
  initNavbar() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    });
  },

  /**
   * Mobile menu toggle
   */
  initMobileMenu() {
    const toggleBtn = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".nav-menu");
    if (!toggleBtn || !navMenu) return;

    toggleBtn.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      toggleBtn.innerHTML = navMenu.classList.contains("active") ? "✕" : "☰";
    });
  },

  /**
   * Highlight active nav link based on current URL path
   */
  highlightActiveNavLink() {
    const links = document.querySelectorAll(".nav-link");
    const currentPath = window.location.pathname.split("/").pop() || "index.html";

    links.forEach(link => {
      const href = link.getAttribute("href");
      if (href === currentPath || (currentPath === "" && href === "index.html")) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
};

window.UI = UI;
