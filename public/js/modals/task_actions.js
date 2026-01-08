import { showToast } from "../toast/toast.js";

/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let pendingDeletePayload = null;
let pendingSaveCallback = null;

document.addEventListener("DOMContentLoaded", () => {
    initTaskDeleteListeners();
    initTaskSaveListeners();
    checkAndReopenLevel();
    initLevelSliders();
});

/* ============================================================
   LOGIQUE DE RÉOUVERTURE APRÈS REFRESH
============================================================ */
function checkAndReopenLevel() {
    const levelId = sessionStorage.getItem("REFRESH_REOPEN_LEVEL_ID");

    if (levelId) {
        sessionStorage.removeItem("REFRESH_REOPEN_LEVEL_ID");

        setTimeout(() => {
            const cardEl = document.querySelector(`.level-card[data-level-id="${levelId}"]`);

            if (cardEl) {
                if (cardEl.classList.contains('collapsed')) {
                    const toggleBtn = cardEl.querySelector('.toggle-level-details');
                    if (toggleBtn) {
                        toggleBtn.click();
                    } else {
                        cardEl.classList.remove('collapsed');
                        const body = cardEl.querySelector('.level-body');
                        if (body) {
                            body.style.maxHeight = null;
                            body.style.opacity = null;
                        }
                    }
                }
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                console.error(`Impossible de trouver une carte avec data-level-id="${levelId}"`);
            }
        }, 300);
    }
}

/* ============================================================
   INITIALISATION DES ÉCOUTEURS (MODALE SUPPRESSION)
============================================================ */
function initTaskDeleteListeners() {
    const modal = document.getElementById("delete-task-modal");
    const confirmBtn = document.getElementById("btn-confirm-delete-task");
    const cancelBtn = document.getElementById("btn-cancel-delete-task");
    const closeBtn = document.getElementById("btn-close-delete-task");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
        pendingDeletePayload = null;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-trash me-2"></i> Supprimer';
        }
    };

    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- ACTION : CLIC SUR "OUI, SUPPRIMER" ---
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (!pendingDeletePayload) return;

            const { levelId, taskType, parentModalId } = pendingDeletePayload;

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Suppression...';

            await executeDeleteTask(levelId, taskType, parentModalId);
        });
    }
}

/* ============================================================
   INITIALISATION DES ÉCOUTEURS (MODALE SAUVEGARDE)
============================================================ */
function initTaskSaveListeners() {
    const modal = document.getElementById("confirm-task-save-modal");
    const confirmBtn = document.getElementById("btn-force-task-save");
    const cancelBtn = document.getElementById("btn-cancel-confirm-task");
    const closeBtn = document.getElementById("btn-close-confirm-task");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
        pendingSaveCallback = null;
        if (confirmBtn) confirmBtn.disabled = false;
    };

    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- ACTION : CLIC SUR "CONFIRMER" (DANS LA MODALE) ---
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (pendingSaveCallback) {
                confirmBtn.disabled = true;
                await pendingSaveCallback();
            }
        });
    }
}

/* ============================================================
   FONCTION INTERMÉDIAIRE DE SAUVEGARDE
============================================================ */
export function requestTaskSave(saveCallback) {
    if (window.HAS_STUDENTS === true) {
        const modal = document.getElementById("confirm-task-save-modal");
        if (modal) {
            pendingSaveCallback = saveCallback;
            modal.style.display = "flex";
        } else {
            saveCallback();
        }
    } else {
        saveCallback();
    }
}

/* ============================================================
   FONCTION DE SAUVEGARDE RÉELLE (API)
============================================================ */
export async function saveTask(levelId, payload, card, taskType, modalId) {

    const config = window.OBJECTIVE_CONFIG || {};

    if (!config.saveTaskUrlTemplate) {
        console.error("saveTaskUrlTemplate missing");
        return;
    }

    const url = config.saveTaskUrlTemplate.replace("__LEVEL_ID__", levelId);

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok || !data.success) {
            showToast(false, data.message || "Erreur sauvegarde");
            return;
        }

        // =====================================================
        // SUCCESS : SAUVEGARDE ID ET REFRESH
        // =====================================================
        sessionStorage.setItem("REFRESH_REOPEN_LEVEL_ID", levelId);
        window.location.reload();

    } catch (err) {
        console.error("Erreur saveTask:", err);
        showToast(false, "Erreur serveur");
    }
}

/* ============================================================
   OUVERTURE DE LA MODALE DE SUPPRESSION
============================================================ */
export function openTaskDeleteModal(levelId, taskType, card, parentModalId, taskName = "cette tâche") {
    const modal = document.getElementById("delete-task-modal");
    const nameSpan = document.getElementById("delete-task-name-target");

    if (modal) {
        pendingDeletePayload = { levelId, taskType, parentModalId };
        if (nameSpan) nameSpan.textContent = taskName;
        modal.style.display = "flex";
    } else {
        console.error("Modale introuvable : #delete-task-modal");
    }
}

/* ============================================================
   EXÉCUTION RÉELLE SUPPRESSION (Interne)
============================================================ */
async function executeDeleteTask(levelId, taskType, parentModalId) {
    const config = window.OBJECTIVE_CONFIG || {};
    if (!config.deleteTaskUrlTemplate) return false;

    const url = config.deleteTaskUrlTemplate.replace("__LEVEL_ID__", levelId);

    try {
        const resp = await fetch(url, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ taskType })
        });

        const data = await resp.json();

        if (!resp.ok || !data.success) {
            showToast(false, data.message || "Erreur suppression");
            const confirmBtn = document.getElementById("btn-confirm-delete-task");
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-trash me-2"></i> Réessayer';
            }
            return false;
        }

        // =====================================================
        // SUCCESS : SAUVEGARDE ID ET REFRESH
        // =====================================================
        sessionStorage.setItem("REFRESH_REOPEN_LEVEL_ID", levelId);
        window.location.reload();
        return true;

    } catch (err) {
        console.error(err);
        showToast(false, "Erreur serveur");
        return false;
    }
}

/* ============================================================
   GESTION DES SLIDERS DE NIVEAU
   ============================================================ */
function initLevelSliders() {
    const sliders = document.querySelectorAll('.completion-seen, .completion-success');

    sliders.forEach(slider => {
        const updateSlider = () => {
            let val = parseInt(slider.value, 10);

            if (val < 1) {
                val = 1;
                slider.value = 1;
            }

            const display = slider.parentElement.querySelector('.completion-value');
            if (display) {
                display.textContent = val + '%';
            }
        };

        slider.addEventListener('input', updateSlider);
        updateSlider();
    });
}
