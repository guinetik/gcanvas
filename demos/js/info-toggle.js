/**
 * Auto-injects a toggle button for #info overlay on mobile devices.
 * Include this script in demo pages that have an #info element.
 */
(function() {
  document.addEventListener("DOMContentLoaded", function() {
    const info = document.getElementById("info");
    if (!info) return;

    // Create toggle button
    const toggle = document.createElement("button");
    toggle.id = "info-toggle";
    toggle.textContent = "?";
    toggle.setAttribute("aria-label", "Toggle info panel");

    // Insert button before info element
    info.parentNode.insertBefore(toggle, info);

    // Toggle functionality
    toggle.addEventListener("click", function() {
      info.classList.toggle("open");
      toggle.textContent = info.classList.contains("open") ? "×" : "?";
    });
  });
})();
