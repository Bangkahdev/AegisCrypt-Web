const menuToggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");

function closeMenu() {
  document.body.classList.remove("sidebar-open");
  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "MENU";
  }
}

if (menuToggle && sidebar) {
  menuToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("sidebar-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "TUTUP" : "MENU";
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(target.innerText.trim());
      button.textContent = "DISALIN!";
    } catch {
      button.textContent = "TEKAN CTRL+C";
    }
    window.setTimeout(() => {
      button.textContent = original;
    }, 1600);
  });
});

const tocLinks = new Map();
document.querySelectorAll(".sidebar a[href^='#']").forEach((link) => {
  const id = link.getAttribute("href")?.slice(1);
  if (id) tocLinks.set(id, link);
});

const sections = document.querySelectorAll("main section[id]");
if ("IntersectionObserver" in window && sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((link) => link.classList.remove("active"));
        tocLinks.get(entry.target.id)?.classList.add("active");
      });
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
