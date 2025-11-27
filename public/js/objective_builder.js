// public/js/objective_builder.js

import { showToast } from './toast/toast.js';

// Import des modales
import { openC1Modal }   from "./modals/modal_c1.js";
import { openC2Modal }   from "./modals/modal_c2.js";
import { openRecModal }  from "./modals/modal_rec.js";
import { openIdModal }   from "./modals/modal_id.js";
import { openMembModal } from "./modals/modal_memb.js";

// Import des actions communes
import { saveTask, deleteTask } from "./modals/task_actions.js";

document.addEventListener("DOMContentLoaded", () => {

    const config = window.OBJECTIVE_CONFIG || {};

    const tablesWrapper   = document.getElementById("tables-wrapper");
    const previewBox      = document.getElementById("preview-box");
    const levelsContainer = document.getElementById("levels-container");
    const addLevelBtn     = document.getElementById("add-level-btn");
    const saveAllBtn      = document.getElementById("save-all-btn");

    let unsavedChanges = false;
    let initialState = null;

    /* =========================================================================================
       COLLECTEUR GLOBAL : objectif + niveaux + tâches
    ========================================================================================= */

    function collectAllData() {
        const objective = {
            name: document.getElementById("objective_name")?.value.trim() || "",
            tables: getSelectedTables()
        };

        const levels = [];
        const tasks = [];

        document.querySelectorAll(".level-card").forEach(card => {
            const levelId = parseInt(card.dataset.levelId, 10);

            levels.push({
                id: levelId,
                name: card.querySelector(".level-name-input").value.trim(),
                tables: JSON.parse(card.dataset.tables || "[]"),
                intervalMin: parseInt(card.dataset.intervalMin),
                intervalMax: parseInt(card.dataset.intervalMax),
                equalPosition: card.dataset.equalPosition,
                factorPosition: card.dataset.factorPosition
            });

            const tasksMap = JSON.parse(card.dataset.tasks || "{}");

            for (const type in tasksMap) {
                tasks.push({
                    levelId,
                    ...tasksMap[type]
                });
            }
        });

        return { objective, levels, tasks };
    }

    function captureInitialState() {
        initialState = collectAllData();
    }

    function isSameState(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function refreshDirtyState() {
        const current = collectAllData();

        if (isSameState(initialState, current)) {
            unsavedChanges = false;
            if (saveAllBtn) saveAllBtn.classList.remove("pulse-warning");
        } else {
            unsavedChanges = true;
            if (saveAllBtn) saveAllBtn.classList.add("pulse-warning");
        }
    }

    function markDirty() {
        refreshDirtyState();
    }

    window.addEventListener("beforeunload", (e) => {
        if (!unsavedChanges) return;
        e.preventDefault();
        e.returnValue = "";
    });

    /* =========================================================================================
       TABLES 1..12
    ========================================================================================= */

    function getSelectedTables() {
        const out = [];
        if (!tablesWrapper) return out;

        tablesWrapper.querySelectorAll(".table-pill.active").forEach(btn =>
            out.push(btn.dataset.value)
        );

        return out;
    }

    if (tablesWrapper) {
        tablesWrapper.querySelectorAll(".table-pill").forEach(btn => {
            btn.addEventListener("click", () => {
                btn.classList.toggle("active");

                const tables = getSelectedTables();

                document.querySelectorAll(".level-card").forEach(card => {
                    card.dataset.tables = JSON.stringify(tables);
                    updateFactsCount(card);
                });

                updatePreview();
                markDirty();
            });
        });
    }

    /* =========================================================================================
       PREVIEW MULTIPLICATIONS
    ========================================================================================= */

    function updatePreview() {
        if (!previewBox) return;

        const tables = getSelectedTables();
        if (!tables.length) {
            previewBox.innerHTML = "Aucune table sélectionnée.";
            return;
        }

        const list = [];
        for (let i = 0; i < 8; i++) {
            const t = tables[i % tables.length];
            const x = Math.floor(Math.random() * 10) + 1;
            list.push(`${t} × ${x} = ${t * x}`);
        }

        previewBox.innerHTML = list.map(v => `<div>${v}</div>`).join("");
    }

    updatePreview();

    /* =========================================================================================
       UTILITAIRES NIVEAUX / TÂCHES
    ========================================================================================= */

    function getTasksMap(card) {
        try { return JSON.parse(card.dataset.tasks || "{}"); }
        catch { return {}; }
    }

    function getTablesForCard(card) {
        try {
            const arr = JSON.parse(card.dataset.tables || "[]");
            if (Array.isArray(arr) && arr.length) return arr;
        } catch {}
        return getSelectedTables();
    }

    function computeFactsCount(card) {
        const tables = getTablesForCard(card);
        const min = parseInt(card.dataset.intervalMin || "1");
        const max = parseInt(card.dataset.intervalMax || "10");
        return tables.length * (max - min + 1);
    }

    function updateFactsCount(card) {
        const span = card.querySelector("[data-facts-count]");
        if (span) span.textContent = computeFactsCount(card);
    }

    /* =========================================================================================
       INITIALISATION D’UNE CARTE NIVEAU
    ========================================================================================= */

    function initLevelCard(card) {
        if (!card) return;

        const equalGroup   = card.querySelector(".equal-position-group");
        const factorGroup  = card.querySelector(".factor-position-group");
        const interval     = card.querySelector(".level-interval-slider");
        const deleteBtn    = card.querySelector(".delete-level-btn");
        const toggleBtn    = card.querySelector(".toggle-level-details");

        // Collapse
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                card.classList.toggle("collapsed");
            });
        }

        // Equal position
        const eqCurrent = card.dataset.equalPosition;
        equalGroup?.querySelectorAll("button").forEach(btn => {
            if (btn.dataset.value === eqCurrent) btn.classList.add("active");

            btn.addEventListener("click", () => {
                equalGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                card.dataset.equalPosition = btn.dataset.value;
                updateFactsCount(card);
                markDirty();
            });
        });

        // Factor position
        const facCurrent = card.dataset.factorPosition;
        factorGroup?.querySelectorAll("button").forEach(btn => {
            if (btn.dataset.value === facCurrent) btn.classList.add("active");

            btn.addEventListener("click", () => {
                factorGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                card.dataset.factorPosition = btn.dataset.value;
                updateFactsCount(card);
                markDirty();
            });
        });

        // Interval slider
        const minSpan = card.querySelector("[data-interval-min]");
        const maxSpan = card.querySelector("[data-interval-max]");

        if (interval) {
            interval.value = card.dataset.intervalMax;

            interval.addEventListener("input", () => {
                const max = parseInt(interval.value, 10);
                card.dataset.intervalMax = String(max);

                maxSpan.textContent = max;
                minSpan.textContent = card.dataset.intervalMin;

                updateFactsCount(card);
                updatePreview();
                markDirty();
            });
        }

        updateFactsCount(card);

        // Suppression du niveau
        if (deleteBtn && config.deleteLevelUrlTemplate) {
            deleteBtn.addEventListener("click", async () => {
                if (!confirm("Supprimer ce niveau ?")) return;

                const url = config.deleteLevelUrlTemplate.replace("__LEVEL_ID__", card.dataset.levelId);

                try {
                    const resp = await fetch(url, {
                        method: "DELETE",
                        headers: { "X-Requested-With": "XMLHttpRequest" }
                    });

                    const json = await resp.json();
                    if (!json.success) return showToast(false);

                    card.remove();
                    markDirty();
                    showToast(true);

                } catch (err) {
                    console.error(err);
                    showToast(false);
                }
            });
        }

        // Modales de tâches
        card.querySelectorAll(".task-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                const type = pill.dataset.taskType;
                const tasksMap = getTasksMap(card);
                const existing = tasksMap[type] || null;

                switch (type) {
                    case "C1":  openC1Modal(card.dataset.levelId, existing, card); break;
                    case "C2":  openC2Modal(card.dataset.levelId, existing, card); break;
                    case "REC": openRecModal(card.dataset.levelId, existing, card); break;
                    case "ID":  openIdModal(card.dataset.levelId, existing, card); break;
                    case "MEMB":openMembModal(card.dataset.levelId, existing, card); break;
                }
            });
        });
    }

    function initAllLevelCards() {
        levelsContainer?.querySelectorAll(".level-card").forEach(card =>
            initLevelCard(card)
        );
    }

    initAllLevelCards();
    captureInitialState();

    /* =========================================================================================
       BOUTON SAVE-ALL
    ========================================================================================= */

    if (saveAllBtn) {
        saveAllBtn.addEventListener("click", async () => {

            // Vérification : au moins une table doit être sélectionnée
            const selectedTables = getSelectedTables();
            if (!selectedTables.length) {
                showToast(false, "Sélectionnez au moins une table pour enregistrer.");
                return;
            }

            const payload = collectAllData();
            saveAllBtn.classList.add("loading");

            try {
                const resp = await fetch(config.saveAllUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify(payload)
                });

                const json = await resp.json();

                if (!json.success) {
                    saveAllBtn.classList.remove("loading");
                    return showToast(false);
                }

                initialState = collectAllData();
                unsavedChanges = false;
                saveAllBtn.classList.remove("pulse-warning");
                saveAllBtn.classList.remove("loading");

                showToast(true);

            } catch (err) {
                console.error(err);
                saveAllBtn.classList.remove("loading");
                showToast(false);
            }
        });
    }

    /* =========================================================================================
       AJOUT NIVEAU
    ========================================================================================= */

    if (addLevelBtn && config.addLevelUrl) {
        addLevelBtn.addEventListener("click", async () => {
            try {
                const resp = await fetch(config.addLevelUrl, {
                    method: "POST",
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });

                const json = await resp.json();
                if (!json.success || !json.html) return showToast(false);

                const temp = document.createElement("div");
                temp.innerHTML = json.html.trim();
                const newCard = temp.firstElementChild;

                levelsContainer.appendChild(newCard);
                initLevelCard(newCard);
                markDirty();
                showToast(true);

            } catch (err) {
                console.error(err);
                showToast(false);
            }
        });
    }

    // Export global pour les modales
    window.saveTask = saveTask;
    window.deleteTask = deleteTask;
});
