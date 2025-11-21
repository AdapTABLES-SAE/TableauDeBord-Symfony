// public/js/student_tabs.js
import { showToast } from './toast/toast.js';

document.addEventListener('DOMContentLoaded', () => {

    /* ============================
       Formulaire élève
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

                // 🔄 Rafraîchissement après modification
                setTimeout(() => location.reload(), 800);

            } catch (error) {
                showToast(false);
            }
        });
    }

    /* ============================
       Attribution d’un entraînement
       ============================ */

    const assignButtons = document.querySelectorAll('.select-entrainement');
    const entrainementInput = document.getElementById('entrainementActuel');
    const mainModal = document.getElementById('entrainementModal');

    const confirmModalEl = document.getElementById('confirmAssignTrainingModal');
    const confirmTrainingName = document.getElementById('confirm-training-name');
    const confirmBtn = document.getElementById('confirm-assign-btn');

    let selectedTrainingId = null;
    let selectedTrainingName = '';

    if (
        assignButtons.length &&
        entrainementInput &&
        mainModal &&
        confirmModalEl &&
        confirmTrainingName &&
        confirmBtn
    ) {

        assignButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.training-card');

                selectedTrainingId = button.dataset.id || (card ? card.dataset.id : null);
                selectedTrainingName =
                    button.dataset.name || (card?.querySelector('.card-title')?.textContent.trim() || '');

                confirmTrainingName.textContent = selectedTrainingName;

                // Ferme modal principale
                let chooseModalInstance = bootstrap.Modal.getInstance(mainModal);
                if (!chooseModalInstance) chooseModalInstance = new bootstrap.Modal(mainModal);
                chooseModalInstance.hide();

                // Ouvre modal confirmation
                setTimeout(() => {
                    const confirmInstance = new bootstrap.Modal(confirmModalEl);
                    confirmInstance.show();
                }, 300);
            });
        });

        confirmBtn.addEventListener('click', async () => {
            if (!selectedTrainingId) return;

            confirmBtn.disabled = true;
            const originalLabel = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Attribution...';

            try {
                const response = await fetch(`${window.location.pathname}/entrainement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ entrainementId: selectedTrainingId })
                });

                if (response.ok) {
                    showToast(true);

                    // Fermer modal
                    let confirmInstance = bootstrap.Modal.getInstance(confirmModalEl);
                    if (!confirmInstance) confirmInstance = new bootstrap.Modal(confirmModalEl);
                    confirmInstance.hide();

                    // 🔄 Recharge la page pour rafraîchir toute la progression
                    setTimeout(() => location.reload(), 800);

                } else {
                    showToast(false);
                }

            } catch (error) {
                showToast(false);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalLabel;
            }
        });
    }
});
