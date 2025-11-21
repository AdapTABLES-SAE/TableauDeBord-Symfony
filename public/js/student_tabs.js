// public/js/student_tabs.js
import { showToast } from './toast/toast.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('studentForm');
    const saveButton = document.getElementById('saveButton');
    const prenom = document.getElementById('prenomEleve');
    const nom = document.getElementById('nomEleve');

    if (!form || !saveButton || !prenom || !nom) {
        return;
    }

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
        } catch (error) {
            showToast(false);
        } finally {
            // On recalcule l’état du bouton après réponse
            const changed =
                prenom.value.trim() !== initialPrenom ||
                nom.value.trim() !== initialNom;
            saveButton.disabled = !changed;
        }
    });
});

// === Gestion attribution d'entraînement ===
document.addEventListener('DOMContentLoaded', () => {
    const assignButtons = document.querySelectorAll('.select-entrainement');
    const entrainementInput = document.getElementById('entrainementActuel');
    const modal = document.getElementById('entrainementModal');

    if (!assignButtons.length || !entrainementInput || !modal) {
        return;
    }

    assignButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const card = e.target.closest('.training-card');
            if (!card) return;

            const entrainementId = card.dataset.id;
            const entrainementName = card.querySelector('.card-title')?.textContent.trim() || '';

            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Attribution...';

            try {
                const response = await fetch(`${window.location.pathname}/entrainement`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ entrainementId })
                });

                if (response.ok) {
                    entrainementInput.value = entrainementName;
                    showToast(true);

                    // Fermeture de la modale
                    let bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (!bootstrapModal) {
                        bootstrapModal = new bootstrap.Modal(modal);
                    }
                    bootstrapModal.hide();

                    // Nettoyage du backdrop si nécessaire
                    setTimeout(() => {
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) backdrop.remove();

                        document.body.classList.remove('modal-open');
                        document.body.style.removeProperty('overflow');
                        document.body.style.removeProperty('padding-right');
                    }, 400);

                } else {
                    showToast(false);
                }
            } catch (error) {
                showToast(false);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Attribuer';
            }
        });
    });
});
