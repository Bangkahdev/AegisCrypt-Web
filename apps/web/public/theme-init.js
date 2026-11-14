(function () {
  try {
    var stored = localStorage.getItem("aegiscrypt-theme");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (error) {
    /* ignore */
  }
})();
