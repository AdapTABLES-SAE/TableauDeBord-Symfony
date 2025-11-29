// public/js/modals/task_actions.js

import { showToast } from "../toast/toast.js";

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

        showToast(true);
        return data;

    } catch (err) {
        console.error("Erreur saveTask:", err);
        showToast(false);
    }
}

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

        let tasksMap = {};

        try {
            tasksMap = JSON.parse(card.dataset.tasks || "{}");
        } catch {
            tasksMap = {};
        }

        delete tasksMap[taskType];
        card.dataset.tasks = JSON.stringify(tasksMap);

        const pill = card.querySelector(`.task-card[data-task-type="${taskType}"]`);
        if (pill) pill.classList.remove("task-active");

        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast(true);
        return data;

    } catch (err) {
        console.error("Erreur deleteTask:", err);
        showToast(false);
    }
}
