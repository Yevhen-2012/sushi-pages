"use strict";

(() => {
  const panel = document.querySelector(".split-page .split-page__scroll");
  if (!panel) return;

  const desktop = window.matchMedia("(width > 991px)");

  window.addEventListener("wheel", (event) => {
    // Inside the panel, let the browser handle scrolling directly.
    if (!desktop.matches || event.defaultPrevented || event.composedPath().includes(panel)) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;

    const { deltaMode, deltaX, deltaY } = event;
    if (!deltaY || Math.abs(deltaX) > Math.abs(deltaY)) return;

    let distance = deltaY;
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
      distance *= parseFloat(getComputedStyle(panel).lineHeight) || 16;
    } else if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      distance *= panel.clientHeight;
    }

    panel.scrollTop += distance;
  }, { passive: true });
})();
