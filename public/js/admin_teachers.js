document.addEventListener("DOMContentLoaded", () => {

    // --- Gestion ouverture modal suppression ---
    const deleteButtons = document.querySelectorAll('.delete-teacher-btn');

    deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => {

            const teacherId = btn.dataset.id;
            const deleteUrl = btn.dataset.url;

            // Injecte l'ID dans la popup
            document.getElementById('delete-teacher-id').textContent = teacherId;

            // Met l'action du formulaire
            const form = document.getElementById('delete-teacher-form');
            form.setAttribute('action', deleteUrl);

            // Ouvre la modal
            const modalEl = document.getElementById('confirmDeleteTeacherModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        });
    });


    // --- Gestion des TOASTS ---
    const toastEl = document.getElementById('toast');

    const successMessages = window.adminTeacherSuccessMessages || [];
    const errorMessages = window.adminTeacherErrorMessages || [];

    import('/js/toast/toast.js').then(({ showToast }) => {

        successMessages.forEach((msg) => {
            if (!toastEl) return;
            toastEl.dataset.successTitle = "Succès";
            toastEl.dataset.successMessage = msg || "Opération réalisée avec succès.";
            showToast(true);
        });

        errorMessages.forEach((msg) => {
            if (!toastEl) return;
            toastEl.dataset.errorTitle = "Erreur";
            toastEl.dataset.errorMessage = msg || "Une erreur est survenue.";
            showToast(false);
        });
    });
});
