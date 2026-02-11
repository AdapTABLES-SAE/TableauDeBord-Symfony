// ============================================================================
//  TRAINING DETAIL ACTIONS — Activated when partial:loaded fires
// ============================================================================
import { showToast } from "../../toast/toast.js";

document.addEventListener("partial:loaded", (e) => {
    const { pair, container } = e.detail || {};
    if (pair !== "trainings" || !container) return;

    // ------------------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------------------
    const q = (sel) => container.querySelector(sel);
    const qAll = (sel) => container.querySelectorAll(sel);

    // ------------------------------------------------------------------------
    // UI ELEMENTS
    // ------------------------------------------------------------------------
    const saveBtn   = q("#input_save_button");
    const cancelBtn = q("#input_cancel_button");
    const form      = q("#save_form");

    const saveModalEl     = q("#saveTrainingModal");
    const confirmSaveBtn = q("#confirmSaveTraining");

    const deleteSummaryModalEl = q("#deleteObjectivesSummaryModal");
    const deleteListEl         = q("#deleteObjectivesList");
    const confirmDeleteObjsBtn = q("#confirmDeleteObjectivesBtn");

    const deleteBtn        = q("#deleteTrainingBtn");
    const deleteModalEl    = q("#deleteTrainingModal");
    const confirmDeleteBtn = q("#confirmDeleteTraining");

    const addObjectiveBtn        = q("#addObjectiveBtn");
    const addObjectiveModalEl    = q("#addObjectiveModal");
    const confirmAddObjectiveBtn = q("#confirmAddObjective");
    const objectiveNameInput     = q("#objectiveNameInput");

    if (!saveBtn || !cancelBtn || !form) return;

    const saveUrl = form.dataset.action;

    // ------------------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------------------
    const editedFields = new Set();

    function getMarkedObjectives() {
        return [...qAll(".carousel-slide.is-marked-delete")].map(el => ({
            id: el.dataset.id,
            name: el.dataset.name
        }));
    }

    function updateButtonsState() {
        if (editedFields.size > 0 || getMarkedObjectives().length > 0) {
            enableButtons(saveBtn, cancelBtn);
        } else {
            resetButtons(saveBtn, cancelBtn);
        }
    }

    // ========================================================================
    // OBJECTIVE DELETE — DOM STATE OBSERVER (SOURCE OF TRUTH)
    // ========================================================================
    const observer = new MutationObserver(updateButtonsState);

    qAll(".carousel-slide").forEach(slide => {
        observer.observe(slide, {
            attributes: true,
            attributeFilter: ["class"]
        });
    });

    // ========================================================================
    // 1. FIELD CHANGE DETECTION (training name)
    // ========================================================================
    qAll(".save-able-field").forEach(el => {
        const eventType =
            el.tagName.toLowerCase() === "select" ? "change" : "input";

        el.addEventListener(eventType, () => {
            if (el.value !== el.defaultValue) {
                el.classList.add("is-edited");
                editedFields.add(el);
            } else {
                el.classList.remove("is-edited");
                editedFields.delete(el);
            }
            updateButtonsState();
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
    // 3. SAVE — DELETE WARNING OR SAVE CONFIRM
    // ========================================================================
    const saveModal = saveModalEl ? new bootstrap.Modal(saveModalEl) : null;
    const deleteSummaryModal = deleteSummaryModalEl
        ? new bootstrap.Modal(deleteSummaryModalEl)
        : null;

    saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (saveBtn.classList.contains("disabled")) return;

        const marked = getMarkedObjectives();

        if (marked.length > 0) {
            // Populate delete list
            deleteListEl.innerHTML = "";
            marked.forEach(obj => {
                const li = document.createElement("li");
                li.textContent = obj.name;
                deleteListEl.appendChild(li);
            });

            deleteSummaryModal.show();
        } else {
            saveModal.show();
        }
    });

    // ========================================================================
    // 4. CONFIRM DELETE (DIRECT SAVE, NO OTHER MODAL)
    // ========================================================================
    confirmDeleteObjsBtn?.addEventListener("click", async () => {
        deleteSummaryModal.hide();
        await performSave();
    });

    // ========================================================================
    // 5. CONFIRM SAVE (NO DELETE CASE)
    // ========================================================================
    confirmSaveBtn?.addEventListener("click", async () => {
        saveModal.hide();
        await performSave();
    });

    // ========================================================================
    // SAVE IMPLEMENTATION
    // ========================================================================
    async function performSave() {
        const payload = {};

        // Name change
        editedFields.forEach(el => {
            if (el.name) payload[el.name] = el.value;
        });

        // Deleted objectives
        const marked = getMarkedObjectives();
        if (marked.length > 0) {
            payload.deletedObjectiveIds = marked.map(o => o.id);
        }

        try {
            const response = await fetch(saveUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            if (result.success) {
                showToast(true, "Succès", "Entraînement mis à jour.");
                setTimeout(() => window.reloadDashboardPair("trainings"), 200);
            } else {
                showToast(false, "Erreur", "Impossible d’enregistrer les modifications.");
            }

        } catch (err) {
            console.error("Training save error:", err);
            showToast(false, "Erreur", "Erreur réseau lors de la sauvegarde.");
        }
    }

    // ========================================================================
    // 6. DELETE TRAINING
    // ========================================================================
    if (deleteBtn && deleteModalEl && confirmDeleteBtn) {
        const deleteModal = new bootstrap.Modal(deleteModalEl);
        const deleteUrl = deleteBtn.dataset.action;

        deleteBtn.addEventListener("click", () => deleteModal.show());

        confirmDeleteBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(deleteUrl, { method: "DELETE" });
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
    // 7. ADD OBJECTIVE
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
// 8. DUPLICATE TRAINING
// ========================================================================

    const duplicateBtn = q('#duplicateTrainingBtn');
    const confirmDuplicateBtn = q('#confirmDuplicateBtn');
    const duplicateModalEl = q('#duplicateTrainingModal');

    if (duplicateBtn && confirmDuplicateBtn && duplicateModalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(duplicateModalEl);

        // 1. Show the modal when the icon is clicked
        duplicateBtn.addEventListener('click', () => {
            modal.show();
        });

        // 2. Handle the actual duplication logic on confirmation
        confirmDuplicateBtn.addEventListener('click', async () => {
            const url = duplicateBtn.dataset.action;
            if (!url) return;

            // UI Feedback: Loading state
            confirmDuplicateBtn.disabled = true;
            const originalText = confirmDuplicateBtn.innerHTML;
            confirmDuplicateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Copie en cours...';

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();

                if (result.success) {
                    // Success! Close modal and show toast
                    modal.hide();
                    showToast(true, "Succès", "Entraînement dupliqué avec succès.");

                    // Reload the pair and auto-select the new duplicate ID
                    setTimeout(() => {
                        if (window.reloadDashboardPair) {
                            window.reloadDashboardPair("trainings", result.training.id);
                        }
                    }, 300);

                } else {
                    showToast(false, "Erreur", result.message || "Impossible de dupliquer l'entraînement.");
                }

            } catch (err) {
                console.error("Duplication error:", err);
                showToast(false, "Erreur", "Erreur réseau lors de la duplication.");
            } finally {
                // Reset button state
                confirmDuplicateBtn.disabled = false;
                confirmDuplicateBtn.innerHTML = originalText;
            }
        });
    }

    // ========================================================================
    // 9. INITIAL STATE
    // ========================================================================
    resetButtons(saveBtn, cancelBtn);
});
