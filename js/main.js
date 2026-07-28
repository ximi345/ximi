(function () {
  "use strict";

  /* ===== Full-Page Scroll with Resistance & Bounce ===== */
  var track = document.getElementById("scrollTrack");
  var sections = track ? track.querySelectorAll(".snap-section") : [];
  var total = sections.length;
  var current = 0;
  var vh = window.innerHeight;
  var isAnimating = false;
  var dragOffset = 0;
  var isDragging = false;
  var dragStartY = 0;
  var wheelAccum = 0;
  var wheelTimer = null;
  var lastWheelTime = 0;
  var animationTimer = null;
  var pageDots = document.querySelectorAll(".page-dot");
  var backHome = document.querySelector(".back-home");
  var scrollCue = document.querySelector(".scroll-cue");

  // Resistance factor: 0.3 means dragged distance * 0.3 (stronger resistance)
  var RESISTANCE = 0.3;
  // Threshold to trigger page change (fraction of vh)
  var THRESHOLD = 0.22;
  // Wheel accumulation threshold (px)
  var WHEEL_THRESHOLD = 40;
  // Debounce: min ms between wheel triggers
  var WHEEL_COOLDOWN = 800;

  function getPageHeight() {
    return vh;
  }

  function getOffsetForPage(page) {
    var offset = 0;
    for (var i = 0; i < page; i++) {
      offset += getPageHeight(i);
    }
    return offset;
  }

  function applyTransform(offset) {
    if (track) track.style.transform = "translate3d(0, " + (-offset) + "px, 0)";
  }

  function updatePageUI() {
    pageDots.forEach(function (dot, index) {
      dot.classList.toggle("active", index === current);
    });
    sections.forEach(function (section, index) {
      section.classList.toggle("section-active", index === current);
    });
    if (backHome) backHome.classList.toggle("visible", current > 0);
    document.body.setAttribute("data-page", String(current + 1));
  }

  function goTo(page, animated) {
    if (page < 0) page = 0;
    if (page > total - 1) page = total - 1;
    current = page;
    updatePageUI();

    clearTimeout(animationTimer);
    if (animated && track) {
      track.classList.add("animating");
      applyTransform(getOffsetForPage(page));
      isAnimating = true;
      animationTimer = setTimeout(function () {
        track.classList.remove("animating");
        isAnimating = false;
      }, 880);
    } else {
      applyTransform(getOffsetForPage(page));
    }
  }

  function boundaryBounce(direction) {
    if (!track || isAnimating) return;
    var base = -getOffsetForPage(current);
    var distance = direction > 0 ? -22 : 22;
    isAnimating = true;
    track.animate([
      { transform: "translate3d(0," + base + "px,0)" },
      { transform: "translate3d(0," + (base + distance) + "px,0)", offset: 0.42 },
      { transform: "translate3d(0," + base + "px,0)" }
    ], { duration: 460, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }).onfinish = function () {
      isAnimating = false;
    };
  }

  function tryGo(delta) {
    if (isAnimating) return;
    var next = current + delta;
    if (next < 0 || next > total - 1) {
      boundaryBounce(delta);
      return;
    }
    goTo(next, true);
  }

  // ===== Wheel =====
  function onWheel(e) {
    e.preventDefault();
    if (isAnimating) return;

    var now = Date.now();
    if (now - lastWheelTime < WHEEL_COOLDOWN) return;

    var delta = e.deltaY;
    wheelAccum += delta;

    if (Math.abs(wheelAccum) > WHEEL_THRESHOLD) {
      tryGo(wheelAccum > 0 ? 1 : -1);
      wheelAccum = 0;
      lastWheelTime = now;
    }

    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () {
      wheelAccum = 0;
    }, 200);
  }

  // ===== Touch =====
  function onTouchStart(e) {
    if (isAnimating) return;
    isDragging = true;
    dragStartY = e.touches[0].clientY;
    dragOffset = 0;
    if (track) track.classList.remove("animating");
  }

  function onTouchMove(e) {
    if (!isDragging || isAnimating) return;
    e.preventDefault();

    var rawDelta = e.touches[0].clientY - dragStartY;

    // Apply resistance at boundaries
    if ((current === 0 && rawDelta > 0) ||
        (current === total - 1 && rawDelta < 0)) {
      rawDelta = rawDelta * RESISTANCE * 0.5;
    } else {
      rawDelta = rawDelta * RESISTANCE;
    }

    dragOffset = rawDelta;
    var baseOffset = getOffsetForPage(current);
    applyTransform(baseOffset - dragOffset);
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    var thresholdPx = vh * THRESHOLD;
    if (Math.abs(dragOffset) > thresholdPx) {
      tryGo(dragOffset < 0 ? 1 : -1);
    } else {
      // Bounce back
      goTo(current, true);
    }
    dragOffset = 0;
  }

  // ===== Mouse drag (desktop) =====
  var mouseDragging = false;
  var mouseStartY = 0;

  function onMouseDown(e) {
    if (isAnimating) return;
    // Don't interfere with clicks on cards/buttons
    if (e.target.closest(".blog-card") ||
        e.target.closest(".modal-overlay") || e.target.closest("a")) return;
    mouseDragging = true;
    mouseStartY = e.clientY;
    if (track) track.classList.remove("animating");
  }

  function onMouseMove(e) {
    if (!mouseDragging || isAnimating) return;
    e.preventDefault();

    var rawDelta = e.clientY - mouseStartY;

    if ((current === 0 && rawDelta > 0) ||
        (current === total - 1 && rawDelta < 0)) {
      rawDelta = rawDelta * RESISTANCE * 0.5;
    } else {
      rawDelta = rawDelta * RESISTANCE;
    }

    dragOffset = rawDelta;
    var baseOffset = getOffsetForPage(current);
    applyTransform(baseOffset - dragOffset);
  }

  function onMouseUp() {
    if (!mouseDragging) return;
    mouseDragging = false;

    var thresholdPx = vh * THRESHOLD;
    if (Math.abs(dragOffset) > thresholdPx) {
      tryGo(dragOffset < 0 ? 1 : -1);
    } else {
      goTo(current, true);
    }
    dragOffset = 0;
  }

  // ===== Keyboard =====
  function onKeydown(e) {
    if (document.querySelector(".modal-overlay.active") || isAnimating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      tryGo(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      tryGo(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(total - 1, true);
    }
  }

  // ===== Attach events =====
  var mainEl = document.querySelector(".main");
  if (mainEl) {
    mainEl.addEventListener("wheel", onWheel, { passive: false });
    mainEl.addEventListener("touchstart", onTouchStart, { passive: true });
    mainEl.addEventListener("touchmove", onTouchMove, { passive: false });
    mainEl.addEventListener("touchend", onTouchEnd);
    mainEl.addEventListener("mousedown", onMouseDown);
  }
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keydown", onKeydown);

  // ===== Resize handler =====
  window.addEventListener("resize", function () {
    vh = window.innerHeight;
    goTo(current, false);
  });

  // ===== Init =====
  pageDots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      goTo(Number(dot.getAttribute("data-page")), true);
    });
  });
  if (backHome) backHome.addEventListener("click", function () { goTo(0, true); });
  if (scrollCue) scrollCue.addEventListener("click", function () { goTo(1, true); });
  goTo(0, false);

  /* ===== Modal ===== */
  var overlay = document.querySelector(".modal-overlay");
  var blogCards = document.querySelectorAll(".blog-card");
  var modalClose = document.querySelector(".modal-close");

  function openModal(data) {
    if (!overlay) return;

    var cover = overlay.querySelector(".modal-cover .cover-bg");
    var title = overlay.querySelector(".modal-title");
    var meta = overlay.querySelector(".modal-meta");
    var article = overlay.querySelector(".modal-article");

    if (cover) cover.className = "cover-bg " + data.gradient;
    if (title) title.textContent = data.title;
    if (meta) meta.innerHTML = data.meta || "";
    if (article) article.innerHTML = data.content || "";

    var modal = overlay.querySelector(".modal");
    if (modal) modal.scrollTop = 0;

    overlay.classList.add("active");
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("active");
  }

  blogCards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.stopPropagation();
      var data = card.getAttribute("data-blog");
      if (data && window.__blogData && window.__blogData[data]) {
        openModal(window.__blogData[data]);
      }
    });
  });

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });
})();

/* ===== Subplaza Auto-Scroll Carousel ===== */
(function () {
  var scroll = document.getElementById("subplazaScroll");
  if (!scroll) return;

  var paused = false;
  var visible = false;
  var rafId = null;

  function autoScroll() {
    rafId = requestAnimationFrame(autoScroll);
    if (paused || !visible) return;
    if (scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 1) {
      scroll.scrollLeft = 0;
    } else {
      scroll.scrollLeft += 0.5;
    }
  }

  scroll.addEventListener("mouseenter", function () { paused = true; });
  scroll.addEventListener("mouseleave", function () { paused = false; });
  scroll.addEventListener("touchstart", function () { paused = true; }, { passive: true });
  scroll.addEventListener("touchend", function () {
    setTimeout(function () { paused = false; }, 3000);
  });
  scroll.addEventListener("wheel", function (e) {
    if (e.deltaX !== 0 || (e.shiftKey && e.deltaY !== 0)) {
      paused = true;
      clearTimeout(scroll._resumeTimer);
      scroll._resumeTimer = setTimeout(function () { paused = false; }, 3000);
    }
  }, { passive: true });

  var section = document.getElementById("subplaza");
  if (section && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible = entry.isIntersecting && entry.intersectionRatio > 0.3;
      });
    }, { threshold: [0, 0.3, 0.5] });
    io.observe(section);
  } else {
    visible = true;
  }

  rafId = requestAnimationFrame(autoScroll);
})();
