import { showToast } from './toast/toast.js';

document.addEventListener('DOMContentLoaded', () => {

    /* ============================
       FORMULAIRE ÉLÈVE
       ============================ */

    const form = document.getElementById('studentForm');
    const saveButton = document.getElementById('saveButton');
    const prenom = document.getElementById('prenomEleve');
    const nom = document.getElementById('nomEleve');

    if (form && saveButton && prenom && nom) {
        const initialPrenom = prenom.value.trim();
        const initialNom = nom.value.trim();

        function checkChanges() {
            const changed =
                prenom.value.trim() !== initialPrenom ||
                nom.value.trim() !== initialNom;

            saveButton.disabled = !changed;
            saveButton.classList.toggle('btn-activated', changed);
        }

        prenom.addEventListener('input', checkChanges);
        nom.addEventListener('input', checkChanges);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            saveButton.disabled = true;

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        prenomEleve: prenom.value.trim(),
                        nomEleve: nom.value.trim()
                    })
                });

                showToast(response.ok);

                if (response.ok) {
                    setTimeout(() => location.reload(), 800);
                }

            } catch (error) {
                showToast(false);
            }
        });
    }

    /* ============================
       ATTRIBUTION ENTRAÎNEMENT
       ============================ */

    const assignButtons = document.querySelectorAll('.select-entrainement');
    const mainModal = document.getElementById('entrainementModal');

    const confirmModalEl = document.getElementById('confirmAssignTrainingModal');
    const confirmTrainingName = document.getElementById('confirm-training-name');
    const confirmBtn = document.getElementById('confirm-assign-btn');

    let selectedTrainingId = null;

    if (assignButtons.length) {

        assignButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.training-card');

                selectedTrainingId = button.dataset.id || card?.dataset.id;

                confirmTrainingName.textContent =
                    button.dataset.name ||
                    card?.querySelector('.card-title')?.textContent.trim();

                let chooseModal = bootstrap.Modal.getInstance(mainModal);
                if (!chooseModal) chooseModal = new bootstrap.Modal(mainModal);
                chooseModal.hide();

                setTimeout(() => {
                    new bootstrap.Modal(confirmModalEl).show();
                }, 300);
            });
        });

        confirmBtn.addEventListener('click', async () => {
            if (!selectedTrainingId) return;

            confirmBtn.disabled = true;
            const oldLabel = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Mise à jour...';

            try {
                const response = await fetch(`${window.location.pathname}/entrainement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        entrainementId: selectedTrainingId
                    })
                });

                if (response.ok) {
                    showToast(true);

                    let confirmInstance = bootstrap.Modal.getInstance(confirmModalEl);
                    confirmInstance?.hide();

                    setTimeout(() => location.reload(), 700);
                } else {
                    showToast(false);
                }

            } catch (e) {
                showToast(false);
            }

            confirmBtn.disabled = false;
            confirmBtn.innerHTML = oldLabel;
        });
    }


    /* ======================================================
       CLICK SUR UN ÉQUIPEMENT
       ====================================================== */

    const equipmentCards = document.querySelectorAll('.equipment-toggle');

    equipmentCards.forEach(card => {
        card.addEventListener('click', async () => {

            const itemId = card.dataset.id;
            let bought = parseInt(card.dataset.bought);
            let activated = parseInt(card.dataset.activated);

            // Étape 1 : On ne change rien visuellement pour le moment
            card.classList.add("equipment-loading");

            // Étape 2 : Calcul du prochain état (cycle)
            let newBought = bought;
            let newActivated = activated;

            if (bought === 0 && activated === 0) {
                newBought = 1;
                newActivated = 0;
            } else if (bought === 1 && activated === 0) {
                newBought = 1;
                newActivated = 1;
            } else {
                newBought = 0;
                newActivated = 0;
            }

            // Reconstruction des 16 items
            const fullItems = [];
            document.querySelectorAll('.equipment-toggle').forEach(cardEl => {
                fullItems.push({
                    id: cardEl.dataset.id,
                    isBought: cardEl === card ? newBought === 1 : cardEl.dataset.bought === "1",
                    isActivated: cardEl === card ? newActivated === 1 : cardEl.dataset.activated === "1"
                });
            });

            try {
                const response = await fetch(`${window.location.pathname}/store`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({
                        items: fullItems,
                        usedCoins: 0
                    })
                });

                if (response.ok) {
                    // Étape 3 : Appliquer visuellement
                    card.dataset.bought = newBought;
                    card.dataset.activated = newActivated;

                    updateEquipmentCardVisual(card);

                } else {
                    showToast(false);
                }

            } catch (error) {
                showToast(false);

            } finally {
                // Retirer l'effet “loading”
                card.classList.remove("equipment-loading");
            }
        });
    });


    /**
     * Met à jour le visuel d'une carte équipement
     */
    function updateEquipmentCardVisual(card) {

        const bought = card.dataset.bought === "1";
        const activated = card.dataset.activated === "1";

        // Reset classes
        card.classList.remove(
            "equipment-not-owned",
            "equipment-owned",
            "equipment-active"
        );

        if (!bought) {
            card.classList.add("equipment-not-owned");
        } else {
            card.classList.add("equipment-owned");
            if (activated) {
                card.classList.add("equipment-active");
            }
        }

        // Texte
        const pill = card.querySelector(".equipment-status-pill");

        if (activated) {
            pill.textContent = "Acheté";
        } else if (bought) {
            pill.textContent = "Désactivé";
        } else {
            pill.textContent = "Pas acheté";
        }
    }

});

/* ============================
   TOOLTIP VIDÉO — HOVER ITEM
   ============================ */

let tooltip = null;
let tooltipVideo = null;

function createTooltip() {
    tooltip = document.createElement("div");
    tooltip.id = "video-tooltip";

    tooltipVideo = document.createElement("video");
    tooltipVideo.autoplay = true;
    tooltipVideo.muted = true;
    tooltipVideo.loop = true;
    tooltipVideo.playsInline = true;

    tooltip.appendChild(tooltipVideo);
    document.body.appendChild(tooltip);
}

createTooltip();

document.querySelectorAll(".equipment-toggle").forEach(card => {

    card.addEventListener("mouseenter", () => {
        const itemId = card.dataset.id;
        const videoPath = `/videos/equipment/${itemId.toLowerCase()}.mp4`;

        // Définition de la vidéo
        tooltipVideo.src = videoPath;

        // Affiche le tooltip
        tooltip.style.display = "block";
    });

    card.addEventListener("mousemove", (e) => {
        // Suit la souris tout en rajoutant un décalage esthétique
        tooltip.style.left = (e.clientX + 20) + "px";
        tooltip.style.top = (e.clientY + 20) + "px";
    });

    card.addEventListener("mouseleave", () => {
        // Cache le tooltip
        tooltip.style.display = "none";

        // Stop la vidéo immédiatement
        tooltipVideo.pause();
        tooltipVideo.src = "";
    });

});
