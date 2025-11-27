import { showToast } from '../../toast/toast.js';
document.addEventListener('partial:list:loaded', async (e) => {
    const {pair, container} = e.detail || {};
    if (pair !== "classes") return;
    if (!container) return;

    await Promise.resolve();

    const modal = new bootstrap.Modal("#addClassModal");
    const btn = container.querySelector('#addClassConfirm');
    const form = container.querySelector('#addClassForm');

    if (!modal || !btn || !form) return;

    // const modalInstance = bootstrap.Modal.getOrCreateInstance(modal);

    btn.addEventListener('click', async () => {
        e.preventDefault();      // ⬅ STOP native form submission
        e.stopPropagation();     // ⬅ STOP bubbling (safety)
        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success) {
                modal.hide();
                showToast(
                    true,
                    "Succès",
                    "Classe ajoutée."
                );
                await window.reloadListOnly("classes");
            } else {
                showToast(
                    false,
                    "Erreur de mise à jour",
                    "Erreur lors de l'ajout de la classe."
                );
            }
        } catch (err) {
            console.error("Erreur ajout classe:", err);
            showToast(
                false,
                "Erreur réseau lors de l'ajout de la classe.",
                "Erreur de communication avec l'API."
            );
        }
    });
});
