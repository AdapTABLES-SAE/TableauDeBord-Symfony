document.addEventListener("partial:loaded", () => {
    waitForCarouselToBeReady();
});

function waitForCarouselToBeReady() {
    const track = document.getElementById("carouselTrack");
    if (!track) {
        requestAnimationFrame(waitForCarouselToBeReady);
        return;
    }

    const cards = track.querySelectorAll(".objective-card");
    if (cards.length === 0) {
        requestAnimationFrame(waitForCarouselToBeReady);
        return;
    }

    initializeCarousel(track);
}

function initializeCarousel(track) {

    // Empêche double initialisation
    if (track.dataset.carouselInit === "1") return;
    track.dataset.carouselInit = "1";

    console.log("INIT CAROUSEL !!!");

    const leftBtn = document.querySelector(".arrow-left");
    const rightBtn = document.querySelector(".arrow-right");
    const indicator = document.getElementById("carouselIndicator");

    if (!leftBtn || !rightBtn || !indicator) {
        console.warn("Carousel: composants manquants.");
        return;
    }

    const getCards = () => Array.from(track.querySelectorAll(".objective-card"));
    const total = getCards().length;

    let currentIndex = 1; // On commence toujours à 1 / total

    function getCenterCard() {
        const cards = getCards();
        const viewport = track.closest(".carousel-viewport");
        const viewportRect = viewport.getBoundingClientRect();
        const centerX = viewportRect.left + viewportRect.width / 2;

        let closest = null;
        let diffMin = Infinity;

        for (let card of cards) {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;
            const diff = Math.abs(cardCenter - centerX);

            if (diff < diffMin) {
                diffMin = diff;
                closest = card;
            }
        }
        return closest;
    }

    function updateActiveCard() {
        const cards = getCards();
        cards.forEach(c => c.classList.remove("active"));

        const center = getCenterCard();
        if (center) center.classList.add("active");
    }

    function updateIndicator() {
        indicator.textContent = `Objectif ${currentIndex} / ${total}`;
    }

    let isAnimating = false;

    function computeCardWidth() {
        const first = getCards()[0];
        const style = window.getComputedStyle(first);
        return first.offsetWidth +
            parseFloat(style.marginLeft) +
            parseFloat(style.marginRight);
    }

    const cardWidth = computeCardWidth();

    function slide(direction) {
        if (isAnimating) return;
        isAnimating = true;

        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        track.offsetHeight; // force reflow

        track.style.transition = "transform 0.3s ease";

        const offset = direction === "right" ? -cardWidth : cardWidth;
        track.style.transform = `translateX(${offset}px)`;

        function onEnd(e) {
            if (e.target !== track) return;

            track.removeEventListener("transitionend", onEnd);
            track.style.transition = "none";

            // Réorganisation DOM
            if (direction === "right") {
                const first = track.firstElementChild;
                track.appendChild(first);
            } else {
                const last = track.lastElementChild;
                track.insertBefore(last, track.firstElementChild);
            }

            // Reset visuel
            track.style.transform = "translateX(0)";

            // Ajustement de l'index logique
            if (direction === "right") {
                currentIndex++;
                if (currentIndex > total) currentIndex = 1;
            } else {
                currentIndex--;
                if (currentIndex < 1) currentIndex = total;
            }

            updateActiveCard();
            updateIndicator();

            isAnimating = false;
        }

        track.addEventListener("transitionend", onEnd);
    }

    function slideRight() {
        slide("right");
    }

    function slideLeft() {
        slide("left");
    }

    rightBtn.addEventListener("click", slideRight);
    leftBtn.addEventListener("click", slideLeft);

    if (!window.carouselKeyboardBound) {
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") slideRight();
            if (e.key === "ArrowLeft") slideLeft();
        });
        window.carouselKeyboardBound = true;
    }

    updateActiveCard();
    updateIndicator();
}
