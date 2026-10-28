"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") {
    console.warn("GSAP не найден");
    return;
  }

  const button = document.querySelector(".menu_button");
  const menu = document.querySelector(".menu_hidden-wraper");
  const wrapper = document.querySelector(".menu_drop_down_wraper");

  if (!button || !menu || !wrapper) return;

  let isOpen = false;

  // начальное состояние
  gsap.set(menu, {
    display: "none",
    height: 0,
    opacity: 0,
    overflow: "hidden",
    pointerEvents: "none"
  });

  function openMenu() {
    gsap.killTweensOf(menu);

    gsap.set(menu, {
      display: "block",
      height: "auto",
      pointerEvents: "auto"
    });

    const fullHeight = menu.offsetHeight;

    gsap.fromTo(
      menu,
      {
        height: 0,
        opacity: 0
      },
      {
        height: fullHeight,
        opacity: 1,
        duration: 0.45,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(menu, { height: "auto" });
        }
      }
    );

    isOpen = true;
  }

  function closeMenu() {
    gsap.killTweensOf(menu);

    gsap.to(menu, {
      height: 0,
      opacity: 0,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(menu, {
          display: "none",
          pointerEvents: "none"
        });
      }
    });

    isOpen = false;
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    isOpen ? closeMenu() : openMenu();
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (isOpen && !wrapper.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeMenu();
    }
  });
});

// меню селектор

document.addEventListener("DOMContentLoaded", function () {
  if (typeof gsap === "undefined" || typeof Flip === "undefined") {
    console.warn("GSAP или Flip не подключены");
    return;
  }

  gsap.registerPlugin(Flip);

  const buttons = document.querySelectorAll(".menu_nav-item");
  const items = document.querySelectorAll(".menu_items-wraper");

  if (!buttons.length || !items.length) return;

  const parent = items[0]?.parentElement;
  if (!parent) return;

  parent.style.position = "relative";
  parent.style.overflow = "hidden";

  function updateSpacingClasses() {
    const currentItems = parent.querySelectorAll(".menu_items-wraper");

    currentItems.forEach((item, index) => {
      if (index < 2) {
        item.classList.add("margin-xl");
      } else {
        item.classList.remove("margin-xl");
      }
    });
  }

  updateSpacingClasses();

  buttons.forEach((button, index) => {
    button.style.cursor = "pointer";

    button.addEventListener("click", function () {
      const currentItems = parent.querySelectorAll(".menu_items-wraper");
      const targetItem = items[index];

      if (!targetItem) return;
      if (currentItems[0] === targetItem) return;

      const parentHeight = parent.offsetHeight;
      parent.style.height = parentHeight + "px";

      const state = Flip.getState(currentItems);

      parent.prepend(targetItem);
      updateSpacingClasses();

      Flip.from(state, {
        duration: 0.6,
        ease: "power2.inOut",
        stagger: 0.03,
        onComplete: () => {
          parent.style.height = "";
        }
      });
    });
  });
});
