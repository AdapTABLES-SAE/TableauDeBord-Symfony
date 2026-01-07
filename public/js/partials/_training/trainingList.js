import {showToast} from "../../toast/toast.js";

document.addEventListener("partial:list:loaded", (e) => {
    const { pair, container } = e.detail || {};
    if (pair !== "trainings" || !container) return;

    const addBtn     = container.querySelector("#addTrainingBtn");
    const modalEl    = container.querySelector("#addTrainingModal");
    const confirmBtn = container.querySelector("#confirmAddTraining");
    const nameInput  = container.querySelector("#newTrainingName");

    if (!addBtn || !modalEl || !confirmBtn || !nameInput) return;

    const modal = new bootstrap.Modal(modalEl);

    // Open modal
    addBtn.addEventListener("click", () => {
        nameInput.value = "";
        modal.show();
    });

    // Confirm creation
    confirmBtn.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        if (!name) {
            window.showToast?.(false, "Erreur", "Le nom est requis.");
            return;
        }

        try {
            const response = await fetch(addBtn.dataset.action, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            if (result.success) {
                modal.hide();
                window.showToast?.(true, "Succès", "Entraînement créé.");
                await window.reloadListOnly("trainings");
            } else {
                window.showToast?.(false, "Erreur", "Impossible de créer l’entraînement.");
            }

        } catch (err) {
            console.error("Add training error:", err);
            window.showToast?.(false, "Erreur", "Erreur réseau lors de la création.");
        }
    });
});
