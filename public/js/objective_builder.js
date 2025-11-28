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
    const objectiveNameEl = document.getElementById("objective_name");

    let unsavedChanges = false;
    let initialState = null;

    /* =========================================================================================
       COLLECTEUR GLOBAL : objectif + niveaux
    ========================================================================================= */

    function collectAllData() {
        const objective = {
            name: objectiveNameEl?.value.trim() || "",
            tables: getSelectedTables()
        };

        const levels = [];

        document.querySelectorAll(".level-card").forEach(card => {

            const levelId = parseInt(card.dataset.levelId, 10);

            let levelTables = [];
            try {
                levelTables = JSON.parse(card.dataset.tables || "[]");
            } catch {
                levelTables = [];
            }

            const seenSlider = card.querySelector(".completion-seen");
            const successSlider = card.querySelector(".completion-success");

            levels.push({
                id: levelId,
                name: card.querySelector(".level-name-input")?.value.trim() || "",
                tables: levelTables,
                equalPosition: card.dataset.equalPosition,
                factorPosition: card.dataset.factorPosition,
                intervalMin: parseInt(card.dataset.intervalMin || "1", 10),
                intervalMax: parseInt(card.dataset.intervalMax || "10", 10),
                successCompletionCriteria: successSlider ? parseInt(successSlider.value,10) : 80,
                encounterCompletionCriteria: seenSlider ? parseInt(seenSlider.value,10) : 100
            });
        });

        return { objective, levels };
    }

    function captureInitialState() {
        initialState = collectAllData();
        unsavedChanges = false;
        if (saveAllBtn) {
            saveAllBtn.classList.remove("pulse-warning", "loading");
        }
    }

    function isSameState(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function refreshDirtyState() {
        if (!initialState || !saveAllBtn) return;

        const current = collectAllData();

        if (isSameState(initialState, current)) {
            unsavedChanges = false;
            saveAllBtn.classList.remove("pulse-warning");
        } else {
            unsavedChanges = true;
            saveAllBtn.classList.add("pulse-warning");
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
       OBJECTIVE NAME
    ========================================================================================= */

    if (objectiveNameEl) {
        objectiveNameEl.addEventListener("input", () => markDirty());
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
       UTILITAIRES
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
        const min = parseInt(card.dataset.intervalMin || "1", 10);
        const max = parseInt(card.dataset.intervalMax || "10", 10);
        return tables.length * Math.max(0, max - min + 1);
    }

    function updateFactsCount(card) {
        const span = card.querySelector("[data-facts-count]");
        if (span) span.textContent = computeFactsCount(card);
    }

    /* =========================================================================================
       DOUBLE SLIDER
    ========================================================================================= */

    function initDoubleSlider(card) {
        const wrap = card.querySelector(".range-double");
        if (!wrap) return;

        const minLabel = card.querySelector("[data-interval-min]");
        const maxLabel = card.querySelector("[data-interval-max]");

        const range = wrap.querySelector(".range-range");
        const handleMin = wrap.querySelector(".range-handle-min");
        const handleMax = wrap.querySelector(".range-handle-max");

        const MIN = 1;
        const MAX = 10;

        let minVal = parseInt(wrap.dataset.min, 10) || 1;
        let maxVal = parseInt(wrap.dataset.max, 10) || 10;

        function percent(value) {
            return ((value - MIN) / (MAX - MIN)) * 100;
        }

        function updateUI() {
            handleMin.style.left = percent(minVal) + "%";
            handleMax.style.left = percent(maxVal) + "%";

            range.style.left = percent(minVal) + "%";
            range.style.right = (100 - percent(maxVal)) + "%";

            minLabel.textContent = minVal;
            maxLabel.textContent = maxVal;

            card.dataset.intervalMin = minVal;
            card.dataset.intervalMax = maxVal;

            updateFactsCount(card);
            updatePreview();
            markDirty();
        }

        updateUI();

        function drag(type) {
            function move(e) {
                const rect = wrap.getBoundingClientRect();
                const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                const val = Math.round(MIN + pct * (MAX - MIN));

                if (type === "min") minVal = Math.min(val, maxVal);
                else maxVal = Math.max(val, minVal);

                updateUI();
            }
            function stop() {
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", stop);
            }
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", stop);
        }

        handleMin.addEventListener("mousedown", () => drag("min"));
        handleMax.addEventListener("mousedown", () => drag("max"));
    }

    /* =========================================================================================
       COMPLETION SLIDERS
    ========================================================================================= */

    function initCompletionSliders(card) {
        const seen = card.querySelector(".completion-seen");
        const success = card.querySelector(".completion-success");
        const seenValue = card.querySelector(".completion-seen-value");
        const successValue = card.querySelector(".completion-success-value");

        if (!seen || !success) return;

        seen.value = card.dataset.encounterCriteria || 80;
        success.value = card.dataset.successCriteria || 100;

        seenValue.textContent = seen.value + "%";
        successValue.textContent = success.value + "%";

        seen.addEventListener("input", () => {
            seenValue.textContent = seen.value + "%";
            card.dataset.encounterCriteria = seen.value;
            markDirty();
        });

        success.addEventListener("input", () => {
            successValue.textContent = success.value + "%";
            card.dataset.successCriteria = success.value;
            markDirty();
        });
    }

    /* =========================================================================================
       INIT LEVEL CARD
    ========================================================================================= */

    function initLevelCard(card) {
        if (!card) return;

        const equalGroup  = card.querySelector(".equal-position-group");
        const factorGroup = card.querySelector(".factor-position-group");

        initCompletionSliders(card);

        /* -------------------------------------------------------------------
           POSITION DU “=”
        ------------------------------------------------------------------- */
        const eqCurrent = card.dataset.equalPosition;
        if (equalGroup) {
            const buttons = equalGroup.querySelectorAll(".position-btn");

            // État initial
            buttons.forEach(btn => {
                if (btn.dataset.value === eqCurrent) {
                    btn.classList.add("active");
                }
            });

            // Clic
            buttons.forEach(btn => {
                btn.addEventListener("click", () => {
                    buttons.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");

                    card.dataset.equalPosition = btn.dataset.value;

                    updateFactsCount(card);
                    markDirty();
                });
            });
        }

        /* -------------------------------------------------------------------
           POSITION DU FACTEUR
        ------------------------------------------------------------------- */
        const facCurrent = card.dataset.factorPosition;
        if (factorGroup) {
            const buttons = factorGroup.querySelectorAll(".position-btn");

            buttons.forEach(btn => {
                if (btn.dataset.value === facCurrent) {
                    btn.classList.add("active");
                }
            });

            buttons.forEach(btn => {
                btn.addEventListener("click", () => {
                    buttons.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");

                    card.dataset.factorPosition = btn.dataset.value;

                    updateFactsCount(card);
                    markDirty();
                });
            });
        }

        // Double slider
        initDoubleSlider(card);
        updateFactsCount(card);

        // Delete level
        const deleteBtn = card.querySelector(".delete-level-btn");
        if (deleteBtn) {
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
                    showToast(true);
                    captureInitialState();

                } catch (err) {
                    console.error(err);
                    showToast(false);
                }
            });
        }

        // Task modals
        card.querySelectorAll(".task-card").forEach(taskBtn => {
            taskBtn.addEventListener("click", () => {
                const type = taskBtn.dataset.taskType;
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
       SAVE ALL
    ========================================================================================= */

    if (saveAllBtn) {
        saveAllBtn.addEventListener("click", async () => {

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

                captureInitialState();
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
                showToast(true);

                captureInitialState();

            } catch (err) {
                console.error(err);
                showToast(false);
            }
        });
    }

    window.saveTask = saveTask;
    window.deleteTask = deleteTask;
});
