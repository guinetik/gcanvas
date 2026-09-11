/**
 * Auto-injects a toggle button for #info overlay.
 * Info panel is hidden by default to spark curiosity - users can click 'i' to reveal it.
 * Include this script in demo pages that have an #info element.
 */
(function() {
  document.addEventListener("DOMContentLoaded", function() {
    const info = document.getElementById("info");
    if (!info) return;

    // Create toggle button
    const toggle = document.createElement("button");
    toggle.id = "info-toggle";
    toggle.textContent = "i";
    toggle.setAttribute("aria-label", "Toggle info panel");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "info");

    // Insert button before info element
    info.parentNode.insertBefore(toggle, info);

    // Toggle functionality
    toggle.addEventListener("click", function() {
      const open = info.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.textContent = open ? "×" : "i";
      toggle.setAttribute("aria-expanded", String(open));
    });
  });
})();
