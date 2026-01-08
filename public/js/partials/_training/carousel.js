// ============================================================================
//  OBJECTIVES CAROUSEL — Activated when partial:loaded fires
// ============================================================================

document.addEventListener("partial:loaded", (e) => {
    const { pair, container } = e.detail || {};

    if (pair !== "trainings") return;
    if (!container) return;

    const q = (sel) => container.querySelector(sel);
    const qAll = (sel) => container.querySelectorAll(sel);

    const carousel = q(".objectives-carousel");
    if (!carousel) return;

    const viewport   = q(".carousel-viewport");
    const track      = q(".carousel-track");
    const slides     = [...qAll(".carousel-slide")];
    const btnPrev    = q(".carousel-arrow-left");
    const btnNext    = q(".carousel-arrow-right");
    const indicators = [...qAll(".carousel-indicator")];

    if (!viewport || !track || slides.length === 0) return;

    // ========================================================================
    // CAROUSEL CORE
    // ========================================================================

    let currentIndex = 0;
    let slideWidth = 0;
    let gap = 0;

    function measure() {
        slideWidth = slides[0].offsetWidth;
        const styles = getComputedStyle(track);
        gap = parseInt(styles.gap || 20, 10);
    }

    function translateTo(index, animate = true) {
        const viewportWidth = viewport.clientWidth;
        const offset =
            index * (slideWidth + gap) -
            (viewportWidth / 2 - slideWidth / 2);

        track.style.transition = animate ? "transform 0.35s ease" : "none";
        track.style.transform = `translateX(${-offset}px)`;
    }

    function updateClasses() {
        slides.forEach((slide, i) => {
            slide.classList.toggle("is-center", i === currentIndex);
            slide.classList.toggle("is-side", Math.abs(i - currentIndex) === 1);
        });

        indicators.forEach((dot, i) => {
            dot.classList.toggle("is-active", i === currentIndex);
        });

        btnPrev && (btnPrev.disabled = currentIndex === 0);
        btnNext && (btnNext.disabled = currentIndex === slides.length - 1);
    }

    function goTo(index) {
        currentIndex = Math.max(0, Math.min(index, slides.length - 1));
        translateTo(currentIndex, true);
        updateClasses();
    }

    // ------------------------------------------------------------------------
    // ARROWS / INDICATORS
    // ------------------------------------------------------------------------
    btnPrev?.addEventListener("click", () => goTo(currentIndex - 1));
    btnNext?.addEventListener("click", () => goTo(currentIndex + 1));
    indicators.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

    // ========================================================================
    // SWIPE / TAP HANDLING (ROBUST)
    // ========================================================================

    let isDragging = false;
    let startX = 0;
    let startTranslate = 0;
    let activeSlide = null;
    let ignoreTap = false;

    function getTranslateX() {
        const match = track.style.transform.match(/-?\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : 0;
    }

    function indexFromTranslate(x) {
        const viewportCenter = viewport.clientWidth / 2;
        const slideSpan = slideWidth + gap;
        const trackOffset = -x + viewportCenter - slideWidth / 2;
        return Math.round(trackOffset / slideSpan);
    }

    viewport.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;

        // If interaction starts on delete button → ignore tap completely
        if (e.target.closest(".objective-delete-btn")) {
            ignoreTap = true;
            isDragging = false;
            activeSlide = null;
            return;
        }

        ignoreTap = false;
        isDragging = false;
        startX = e.clientX;
        startTranslate = getTranslateX();
        activeSlide = e.target.closest(".carousel-slide");

        track.style.transition = "none";
        viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener("pointermove", (e) => {
        if (ignoreTap) return;
        if (e.buttons !== 1) return;

        const delta = e.clientX - startX;
        if (Math.abs(delta) > 6) isDragging = true;

        if (isDragging) {
            track.style.transform = `translateX(${startTranslate + delta}px)`;
        }
    });

    viewport.addEventListener("pointerup", () => {
        if (ignoreTap) {
            ignoreTap = false;
            isDragging = false;
            activeSlide = null;
            return;
        }

        if (isDragging) {
            goTo(indexFromTranslate(getTranslateX()));
        } else if (
            activeSlide &&
            !activeSlide.classList.contains("is-marked-delete")
        ) {
            const url = activeSlide.dataset.editUrl;
            if (url) window.location.href = url;
        }

        isDragging = false;
        activeSlide = null;
    });

    viewport.addEventListener("pointercancel", () => {
        ignoreTap = false;
        isDragging = false;
        activeSlide = null;
        goTo(currentIndex);
    });

    viewport.addEventListener("pointerleave", () => {
        if (isDragging) {
            ignoreTap = false;
            isDragging = false;
            activeSlide = null;
            goTo(currentIndex);
        }
    });

    // ========================================================================
    // OBJECTIVE DELETE — MARK / UNMARK (SELECTION ONLY)
    // ========================================================================

    const markedObjectives = new Map(); // id → { name, element }

    qAll(".objective-delete-btn").forEach(btn => {
        // Stop gesture system early
        btn.addEventListener("pointerdown", e => e.stopPropagation());

        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            const card = btn.closest(".carousel-slide");
            if (!card) return;

            const id = card.dataset.id;
            const name = card.dataset.name;

            if (card.classList.contains("is-marked-delete")) {
                card.classList.remove("is-marked-delete");
                markedObjectives.delete(id);
            } else {
                card.classList.add("is-marked-delete");
                markedObjectives.set(id, { name, element: card });
            }
        });
    });

    // ========================================================================
    // INIT
    // ========================================================================
    measure();
    goTo(0);

    window.addEventListener("resize", () => {
        measure();
        translateTo(currentIndex, false);
    });
});
