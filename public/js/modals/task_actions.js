import { showToast } from "../toast/toast.js";

/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let pendingDeletePayload = null;    // Pour la suppression
let pendingSaveCallback = null;     // Pour la sauvegarde avec confirmation

document.addEventListener("DOMContentLoaded", () => {
    initTaskDeleteListeners();
    initTaskSaveListeners();
});

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

            const { levelId, taskType, card, parentModalId } = pendingDeletePayload;

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Suppression...';

            const success = await executeDeleteTask(levelId, taskType, card, parentModalId);

            if (success) {
                closeModal();
            } else {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-trash me-2"></i> Réessayer';
            }
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
                // UI Loading
                confirmBtn.disabled = true;

                // On exécute la fonction de sauvegarde qui était en attente
                await pendingSaveCallback();

                closeModal();
            }
        });
    }
}

/* ============================================================
   FONCTION INTERMÉDIAIRE DE SAUVEGARDE
   Vérifie s'il faut ouvrir la modale ou sauvegarder direct
============================================================ */
/**
 * @param {Function} saveCallback - La fonction async à exécuter (ex: () => saveTask(...))
 */
export function requestTaskSave(saveCallback) {
    // On vérifie la variable globale définie dans Twig
    if (window.HAS_STUDENTS === true) {
        // Il y a des élèves : On ouvre la modale
        const modal = document.getElementById("confirm-task-save-modal");
        if (modal) {
            pendingSaveCallback = saveCallback; // On stocke l'action pour plus tard
            modal.style.display = "flex";
        } else {
            // Fallback sécurité si modale introuvable
            saveCallback();
        }
    } else {
        // Pas d'élèves : On sauvegarde direct
        saveCallback();
    }
}

/* ============================================================
   FONCTION DE SAUVEGARDE RÉELLE (API)
============================================================ */
export async function saveTask(levelId, payload, card, taskType, modalId) {

    const config = window.OBJECTIVE_CONFIG || {};

    if (!config.saveTaskUrlTemplate) {
        console.error("saveTaskUrlTemplate missing in OBJECTIVE_CONFIG");
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

        let tasksMap = {};

        try {
            tasksMap = JSON.parse(card.dataset.tasks || "{}");
        } catch {
            tasksMap = {};
        }

        tasksMap[taskType] = data.task;
        card.dataset.tasks = JSON.stringify(tasksMap);

        const pill = card.querySelector(`.task-card[data-task-type="${taskType}"]`);
        if (pill) pill.classList.add("task-active");

        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast(true, "Tâche enregistrée");
        return data;

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
        pendingDeletePayload = { levelId, taskType, card, parentModalId };
        if (nameSpan) nameSpan.textContent = taskName;
        modal.style.display = "flex";
    } else {
        console.error("Modale introuvable : #delete-task-modal (Vérifiez l'include Twig)");
    }
}

/* ============================================================
   EXÉCUTION RÉELLE SUPPRESSION (Interne)
============================================================ */
async function executeDeleteTask(levelId, taskType, card, parentModalId) {
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
            return false;
        }

        // Mise à jour dataset et UI
        let tasksMap = {};
        try { tasksMap = JSON.parse(card.dataset.tasks || "{}"); } catch {}
        delete tasksMap[taskType];
        card.dataset.tasks = JSON.stringify(tasksMap);

        const pill = card.querySelector(`.task-card[data-task-type="${taskType}"]`);
        if (pill) pill.classList.remove("task-active");

        const modalEl = document.getElementById(parentModalId);
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast(true, "Tâche supprimée");
        return true;

    } catch (err) {
        console.error(err);
        showToast(false, "Erreur serveur");
        return false;
    }
}
