document.addEventListener("partial:loaded", event => {
    const root = event.detail?.container;
    if (!root) return;

    const carousel = root.querySelector(".objectives-carousel");
    if (!carousel) return;

    const viewport   = carousel.querySelector(".carousel-viewport");
    const track      = carousel.querySelector(".carousel-track");
    const slides     = Array.from(carousel.querySelectorAll(".carousel-slide"));
    const btnPrev    = carousel.querySelector(".carousel-arrow-left");
    const btnNext    = carousel.querySelector(".carousel-arrow-right");
    const indicators = Array.from(
        root.querySelectorAll(".carousel-indicator")
    );

    if (!viewport || !track || slides.length === 0) return;

    let currentIndex = 0;
    let slideWidth = 0;
    let gap = 0;

    /* ============================================
       Measure
    ============================================ */
    function measure() {
        slideWidth = slides[0].offsetWidth;
        const styles = getComputedStyle(track);
        gap = parseInt(styles.gap || 20, 10);
    }

    /* ============================================
       Helpers
    ============================================ */
    function getTranslateX() {
        const match = track.style.transform.match(/-?\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : 0;
    }

    function indexFromTranslate(translateX) {
        const viewportCenter = viewport.clientWidth / 2;
        const slideSpan = slideWidth + gap;

        const trackOffset = -translateX + viewportCenter - slideWidth / 2;
        return Math.round(trackOffset / slideSpan);
    }

    /* ============================================
       Visual state
    ============================================ */
    function updateClasses() {
        slides.forEach((slide, i) => {
            slide.classList.toggle("is-center", i === currentIndex);
            slide.classList.toggle("is-side", Math.abs(i - currentIndex) === 1);
            slide.tabIndex = i === currentIndex ? 0 : -1;
        });

        indicators.forEach((dot, i) => {
            dot.classList.toggle("is-active", i === currentIndex);
        });

        btnPrev.disabled = currentIndex === 0;
        btnNext.disabled = currentIndex === slides.length - 1;
    }

    /* ============================================
       Core movement
    ============================================ */
    function translateTo(index, animate = true) {
        const viewportWidth = viewport.clientWidth;
        const offset =
            index * (slideWidth + gap) -
            (viewportWidth / 2 - slideWidth / 2);

        track.style.transition = animate ? "transform 0.35s ease" : "none";
        track.style.transform = `translateX(${-offset}px)`;
    }

    function goTo(index) {
        currentIndex = Math.max(0, Math.min(index, slides.length - 1));
        translateTo(currentIndex, true);
        updateClasses();
    }

    /* ============================================
       Arrow / keyboard / click
    ============================================ */
    btnPrev.addEventListener("click", () => goTo(currentIndex - 1));
    btnNext.addEventListener("click", () => goTo(currentIndex + 1));

    carousel.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") goTo(currentIndex + 1);
        if (e.key === "ArrowLeft")  goTo(currentIndex - 1);
    });

    slides.forEach((slide, i) => {
        slide.addEventListener("click", () => goTo(i));
    });

    indicators.forEach((dot, i) => {
        dot.addEventListener("click", () => goTo(i));
    });

    /* ============================================
       Swipe / drag with SNAP (FIXED)
    ============================================ */
    let isDragging = false;
    let startX = 0;
    let startTranslate = 0;
    let startTime = 0;

    viewport.addEventListener("pointerdown", e => {
        isDragging = true;
        startX = e.clientX;
        startTranslate = getTranslateX();
        startTime = performance.now();

        track.style.transition = "none";
        viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener("pointermove", e => {
        if (!isDragging) return;
        const delta = e.clientX - startX;
        track.style.transform = `translateX(${startTranslate + delta}px)`;
    });

    viewport.addEventListener("pointerup", e => {
        if (!isDragging) return;
        isDragging = false;

        const delta = e.clientX - startX;
        const duration = performance.now() - startTime;
        const velocity = delta / duration;

        let targetIndex = indexFromTranslate(getTranslateX());

        // velocity bias (very fast swipe)
        if (Math.abs(velocity) > 0.6) {
            targetIndex += velocity < 0 ? 1 : -1;
        }

        goTo(targetIndex);
    });

    viewport.addEventListener("pointercancel", () => goTo(currentIndex));
    viewport.addEventListener("pointerleave", () => {
        if (isDragging) goTo(currentIndex);
    });

    /* ============================================
       Init
    ============================================ */
    measure();
    goTo(0);

    window.addEventListener("resize", () => {
        measure();
        translateTo(currentIndex, false);
    });
});
