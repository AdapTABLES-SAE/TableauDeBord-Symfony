// public/js/modals/task_actions.js

import { showToast } from "../toast/toast.js";

/**
 * Sauvegarde une tâche pour un niveau.
 *
 * @param {number} levelId   - ID du niveau
 * @param {object} payload   - Données de la tâche à sauvegarder
 * @param {HTMLElement} card - La carte du niveau (DOM)
 * @param {string} taskType  - C1, C2, REC, ID, MEMB
 * @param {string} modalId   - ID de la modale à fermer après save
 */
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
            showToast(false);
            return;
        }

        // --- Mise à jour du dataset de la carte ---
        const tasksRaw = card.dataset.tasks || "{}";
        let tasksMap = {};

        try {
            tasksMap = JSON.parse(tasksRaw);
        } catch {
            tasksMap = {};
        }

        tasksMap[taskType] = data.task; // données renvoyées par le contrôleur
        card.dataset.tasks = JSON.stringify(tasksMap);

        // --- Marquer la pill comme active ---
        const pill = card.querySelector(`.task-pill[data-task-type="${taskType}"]`);
        if (pill) pill.classList.add("task-active");

        // --- Fermer la modale ---
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast(true);

    } catch (err) {
        console.error("Erreur saveTask:", err);
        showToast(false);
    }
}

/**
 * Suppression d’une tâche pour un niveau.
 *
 * @param {number} levelId
 * @param {string} taskType
 * @param {HTMLElement} card
 * @param {string} modalId
 */
export async function deleteTask(levelId, taskType, card, modalId) {

    const config = window.OBJECTIVE_CONFIG || {};

    if (!config.deleteTaskUrlTemplate) {
        console.error("deleteTaskUrlTemplate missing in OBJECTIVE_CONFIG");
        return;
    }

    if (!confirm("Supprimer cette tâche ?")) return;

    const url = config.deleteTaskUrlTemplate.replace("__LEVEL_ID__", levelId);

    try {
        const resp = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({ taskType })
        });

        const data = await resp.json();

        if (!resp.ok || !data.success) {
            showToast(false);
            return;
        }

        // --- Mise à jour du dataset de la carte ---
        let tasksMap = {};
        try {
            tasksMap = JSON.parse(card.dataset.tasks || "{}");
        } catch {
            tasksMap = {};
        }

        delete tasksMap[taskType];
        card.dataset.tasks = JSON.stringify(tasksMap);

        // --- Désactiver la pill ---
        const pill = card.querySelector(`.task-pill[data-task-type="${taskType}"]`);
        if (pill) pill.classList.remove("task-active");

        // --- Fermer la modale ---
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast(true);

    } catch (err) {
        console.error("Erreur deleteTask:", err);
        showToast(false);
    }
}
