document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('studentForm');
    const saveButton = document.getElementById('saveButton');
    const prenom = document.getElementById('prenomEleve');
    const nom = document.getElementById('nomEleve');

    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const closeBtn = toast.querySelector('.close-btn');

    const initialPrenom = prenom.value.trim();
    const initialNom = nom.value.trim();

    function showToast(success = true) {
        toast.classList.toggle('error', !success);
        toastTitle.textContent = success
            ? 'La modification est réussie'
            : 'Échec de la mise à jour';
        toastMessage.textContent = success
            ? "L’élève a bien été mis à jour dans la base de données."
            : "Une erreur est survenue lors de la mise à jour de l’élève.";

        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 4000);
    }

    closeBtn.addEventListener('click', () => toast.style.display = 'none');

    function checkChanges() {
        const changed = prenom.value.trim() !== initialPrenom || nom.value.trim() !== initialNom;
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    prenomEleve: prenom.value.trim(),
                    nomEleve: nom.value.trim()
                })
            });

            showToast(response.ok);
        } catch (error) {
            showToast(false);
        }
    });
});

// === Gestion attribution d'entraînement ===
const assignButtons = document.querySelectorAll('.select-entrainement');
const entrainementInput = document.getElementById('entrainementActuel');
const modal = document.getElementById('entrainementModal');

assignButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
        const card = e.target.closest('.card');
        const entrainementId = card.dataset.id;
        const entrainementName = card.querySelector('.card-title').textContent.trim();

        try {
            const response = await fetch(`${window.location.pathname}/entrainement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entrainementId })
            });

            if (response.ok) {
                entrainementInput.value = entrainementName;
                showToast(true);
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                bootstrapModal.hide();
            } else {
                showToast(false);
            }
        } catch (error) {
            showToast(false);
        }
    });
});

assignButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
        const card = e.target.closest('.training-card');
        const entrainementId = card.dataset.id;
        const entrainementName = card.querySelector('.card-title').textContent.trim();

        // petite animation d'état en cours
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Attributions...';

        try {
            const response = await fetch(`${window.location.pathname}/entrainement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entrainementId })
            });

            if (response.ok) {
                entrainementInput.value = entrainementName;
                showToast(true);
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                bootstrapModal.hide();
            } else {
                showToast(false);
            }
        } catch (error) {
            showToast(false);
        } finally {
            // reset du bouton
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Attribuer';
        }
    });
});

