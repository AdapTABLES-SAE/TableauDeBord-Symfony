document.addEventListener("DOMContentLoaded", () => {

    let track = document.getElementById("carouselTrack");
    const leftBtn = document.querySelector(".arrow-left");
    const rightBtn = document.querySelector(".arrow-right");
    let indicator = document.getElementById("carouselIndicator");

    let visibleCount = 3;
    let middleOffset = 1;

    let initialCards = track.querySelectorAll(".objective-card");

    if (initialCards.length < 3) {
        track.classList.add("few-cards");
    } else {
        track.classList.remove("few-cards");
    }

    if (initialCards.length <= 1) {
        leftBtn.style.display = "none";
        rightBtn.style.display = "none";
        track.style.transition = "none";

        let onlyCard = initialCards[0];
        if (onlyCard) onlyCard.classList.add("active");

        indicator.textContent = "Objectif 1 / 1";
        return;
    }

    function getVisibleCards() {
        return Array.from(track.querySelectorAll(".objective-card"));
    }

    function getCenterCard() {
        const cards = Array.from(track.querySelectorAll(".objective-card"));

        // centre du conteneur
        const trackRect = track.getBoundingClientRect();
        const centerX = trackRect.left + trackRect.width / 2;

        let closest = null;
        let smallestDiff = Infinity;

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;

            const diff = Math.abs(cardCenter - centerX);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closest = card;
            }
        });

        return closest;
    }

    function initCarouselPosition() {
        let cards = track.querySelectorAll(".objective-card");

        if (cards.length < 2) return;
        let last = cards[cards.length - 1];

        track.insertBefore(last, cards[0]);
        track.style.transition = "none";
        track.style.transform = "translateX(-240px)";

        requestAnimationFrame(() => {
            track.style.transform = "none";
        });
    }


    function updateIndicator() {
        let cards = getVisibleCards();
        let total = cards.length;
        let centerCard = getCenterCard();
        let realIndex = centerCard.getAttribute("data-id");

        indicator.textContent = `Objectif ${realIndex} / ${total}`;
    }

    function updateActiveCard() {
        let cards = getVisibleCards();

        cards.forEach(c => c.classList.remove("active"));

        let center = getCenterCard();
        if (center) center.classList.add("active");
    }

    function slideRight() {
        track.style.transition = "transform 0.3s ease";
        track.style.transform = "translateX(-240px)";

        track.addEventListener("transitionend", (e) => {

            if (e.target !== track) return;

            track.style.transition = "none";
            track.style.transform = "none";

            let first = track.querySelectorAll(".objective-card")[0];
            track.appendChild(first);

            updateIndicator();
            updateActiveCard();
        }, { once: true });
    }

    function slideLeft() {
        track.style.transition = "none";

        let cards = track.querySelectorAll(".objective-card");
        let last = cards[cards.length - 1];
        track.insertBefore(last, cards[0]);

        track.style.transform = "translateX(-240px)";

        requestAnimationFrame(() => {
            track.style.transition = "transform 0.3s ease";
            track.style.transform = "none";
        });

        updateIndicator();
        updateActiveCard();
    }

    rightBtn.addEventListener("click", slideRight);
    leftBtn.addEventListener("click", slideLeft);

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") slideLeft();
        if (e.key === "ArrowRight") slideRight();
    });

    initCarouselPosition();
    updateIndicator();
    updateActiveCard();
});
