// ============================================================================
//  TRAINING DETAIL ACTIONS — Activated when partial:loaded fires
// ============================================================================
import {showToast} from "../../toast/toast.js";

document.addEventListener("partial:loaded", (e) => {
    const { pair, container } = e.detail || {};

    if (pair !== "trainings") return;
    if (!container) return;

    // ------------------------------------------------------------------------
    // LOOKUP HELPERS
    // ------------------------------------------------------------------------
    const q = (sel) => container.querySelector(sel);
    const qAll = (sel) => container.querySelectorAll(sel);

    // ------------------------------------------------------------------------
    // UI ELEMENTS
    // ------------------------------------------------------------------------
    const saveBtn   = q("#input_save_button");
    const cancelBtn = q("#input_cancel_button");
    const form      = q("#save_form");

    const saveModalEl    = q("#saveTrainingModal");
    const confirmSaveBtn = q("#confirmSaveTraining");

    const deleteBtn        = q("#deleteTrainingBtn");
    const deleteModalEl    = q("#deleteTrainingModal");
    const confirmDeleteBtn = q("#confirmDeleteTraining");

    const addObjectiveBtn        = q("#addObjectiveBtn");
    const addObjectiveModalEl    = q("#addObjectiveModal");
    const confirmAddObjectiveBtn = q("#confirmAddObjective");
    const objectiveNameInput     = q("#objectiveNameInput");

    if (!saveBtn || !cancelBtn || !form) return;

    // ========================================================================
    // 1. FIELD CHANGE DETECTION
    // ========================================================================
    qAll(".save-able-field").forEach(element => {
        const eventType =
            element.tagName.toLowerCase() === "select"
                ? "change"
                : "input";

        element.addEventListener(eventType, () => {
            if (element.value !== element.defaultValue) {
                element.classList.add("is-edited");
                enableButtons(saveBtn, cancelBtn);
            }
        });
    });

    // ========================================================================
    // 2. CANCEL — reload training partial
    // ========================================================================
    cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.reloadDashboardPair("trainings");
    });

    // ========================================================================
    // 3. SAVE — confirmation modal + AJAX POST
    // ========================================================================
    if (saveModalEl && confirmSaveBtn) {
        const saveModal = new bootstrap.Modal(saveModalEl);

        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (saveBtn.classList.contains("disabled")) return;
            saveModal.show();
        });

        confirmSaveBtn.addEventListener("click", async () => {
            const trainingId = form.action.match(/\/training\/(\d+)\//)?.[1];
            if (!trainingId) return;

            const data = new FormData();
            qAll(".save-able-field").forEach(el => {
                if (el.value !== el.defaultValue && el.name) {
                    data.append(el.name, el.value);
                }
            });

            try {
                const response = await fetch(
                    `/dashboard/training/${trainingId}/update`,
                    { method: "POST", body: data }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    qAll(".save-able-field").forEach(el => {
                        el.defaultValue = el.value;
                        el.classList.remove("is-edited");
                    });

                    saveModal.hide();
                    resetButtons(saveBtn, cancelBtn);

                    showToast(true, "Succès", "Entraînement mis à jour.");
                    setTimeout(() => window.reloadDashboardPair("trainings"), 200);
                } else {
                    showToast(false, "Erreur", "Impossible d’enregistrer les modifications.");
                }

            } catch (err) {
                console.error("Training save error:", err);
                showToast(false, "Erreur", "Erreur réseau lors de la sauvegarde.");
            }
        });
    }

    // ========================================================================
// 4. DELETE TRAINING
// ========================================================================
    if (deleteBtn && deleteModalEl && confirmDeleteBtn) {
        const deleteModal = new bootstrap.Modal(deleteModalEl);
        const deleteUrl = deleteBtn.dataset.action; // full URL

        deleteBtn.addEventListener("click", () => deleteModal.show());

        confirmDeleteBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(deleteUrl, {
                    method: "DELETE"
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    deleteModal.hide();
                    showToast(true, "Succès", "Entraînement supprimé.");

                    await window.reloadListOnly("trainings");
                    container.innerHTML = `
                    <h2 class="fw-bold mb-3">Mes entraînements</h2>
                    <p class="text-primary fs-5">
                        Sélectionner un entraînement pour voir le détail.
                    </p>
                `;
                } else {
                    showToast(false, "Erreur", "Impossible de supprimer l’entraînement.");
                }

            } catch (err) {
                console.error("Delete error:", err);
                showToast(false, "Erreur", "Erreur réseau lors de la suppression.");
            }
        });
    }


    // ========================================================================
    // 5. ADD OBJECTIVE
    // ========================================================================
    if (addObjectiveBtn && addObjectiveModalEl && confirmAddObjectiveBtn && objectiveNameInput) {
        const addObjectiveModal = new bootstrap.Modal(addObjectiveModalEl);

        addObjectiveBtn.addEventListener("click", () => {
            objectiveNameInput.value = "";
            addObjectiveModal.show();
        });

        confirmAddObjectiveBtn.addEventListener("click", async () => {
            const name = objectiveNameInput.value.trim();
            if (!name) {
                showToast(false, "Erreur", "Le nom de l’objectif est requis.");
                return;
            }

            try {
                const response = await fetch(addObjectiveBtn.dataset.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    addObjectiveModal.hide();
                    showToast(true, "Succès", "Objectif ajouté.");
                    setTimeout(() => window.reloadDashboardPair("trainings"), 200);
                } else {
                    showToast(false, "Erreur", "Impossible d’ajouter l’objectif.");
                }

            } catch (err) {
                console.error("Add objective error:", err);
                showToast(false, "Erreur", "Erreur réseau lors de l’ajout de l’objectif.");
            }
        });
    }

    // ========================================================================
    // 6. INITIAL STATE
    // ========================================================================
    resetButtons(saveBtn, cancelBtn);
});
