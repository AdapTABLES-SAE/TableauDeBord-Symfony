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

    // IDs EXACTS du Twig edit.html.twig
    const tablesWrapper   = document.getElementById("tables-wrapper");
    const previewBox      = document.getElementById("preview-box");
    const levelsContainer = document.getElementById("levels-container");
    const addLevelBtn     = document.getElementById("add-level-btn");

    /* =======================================================================
       TABLES 1..12
       ======================================================================= */

    function getSelectedTables() {
        const out = [];
        if (!tablesWrapper) return out;

        tablesWrapper.querySelectorAll(".table-pill.active").forEach(btn => {
            out.push(btn.dataset.value);
        });

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
            });
        });
    }

    /* =======================================================================
       PREVIEW MULTIPLICATIONS
       ======================================================================= */

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

        previewBox.innerHTML = list.map(x => `<div>${x}</div>`).join("");
    }

    updatePreview();

    /* =======================================================================
       UTILITAIRES NIVEAUX / TÂCHES
       ======================================================================= */

    function getTasksMap(card) {
        try {
            return JSON.parse(card.dataset.tasks || "{}");
        } catch {
            return {};
        }
    }

    function setTasksMap(card, map) {
        card.dataset.tasks = JSON.stringify(map || {});
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
        const range = Math.max(0, max - min + 1);
        return tables.length * range;
    }

    function updateFactsCount(card) {
        const span = card.querySelector("[data-facts-count]");
        if (span) span.textContent = computeFactsCount(card);
    }

    /* =======================================================================
       INITIALISATION D’UNE CARTE NIVEAU
       ======================================================================= */

    function initLevelCard(card) {
        if (!card) return;

        const equalGroup   = card.querySelector(".equal-position-group");
        const factorGroup  = card.querySelector(".factor-position-group");
        const interval     = card.querySelector(".level-interval-slider");
        const deleteBtn    = card.querySelector(".delete-level-btn");
        const saveBtn      = card.querySelector(".save-level-btn");
        const toggleBtn    = card.querySelector(".toggle-level-details");

        // --- toggle collapse des détails
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                card.classList.toggle("collapsed");
            });
        }

        // --- position de l’égal
        const eqCurrent = card.dataset.equalPosition || "RIGHT";
        if (equalGroup) {
            equalGroup.querySelectorAll("button").forEach(btn => {
                if (btn.dataset.value === eqCurrent) {
                    btn.classList.add("active");
                }

                btn.addEventListener("click", () => {
                    equalGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    card.dataset.equalPosition = btn.dataset.value;
                    updateFactsCount(card);
                });
            });
        }

        // --- position du facteur
        const facCurrent = card.dataset.factorPosition || "OPERAND_TABLE";
        if (factorGroup) {
            factorGroup.querySelectorAll("button").forEach(btn => {
                if (btn.dataset.value === facCurrent) {
                    btn.classList.add("active");
                }

                btn.addEventListener("click", () => {
                    factorGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    card.dataset.factorPosition = btn.dataset.value;
                    updateFactsCount(card);
                });
            });
        }

        // --- intervalle (slider max)
        const minSpan = card.querySelector("[data-interval-min]");
        const maxSpan = card.querySelector("[data-interval-max]");

        if (interval) {
            // valeur initiale
            interval.value = card.dataset.intervalMax || "10";

            interval.addEventListener("input", () => {
                const max = parseInt(interval.value, 10);
                const min = parseInt(card.dataset.intervalMin || "1", 10);

                card.dataset.intervalMax = String(max);
                if (maxSpan) maxSpan.textContent = String(max);
                if (minSpan) minSpan.textContent = String(min);

                updateFactsCount(card);
                updatePreview();
            });
        }

        // Nombre de faits initial
        updateFactsCount(card);

        // --- SUPPRESSION DU NIVEAU
        if (deleteBtn && config.deleteLevelUrlTemplate) {
            deleteBtn.addEventListener("click", async () => {
                if (!confirm("Supprimer ce niveau ?")) return;

                const levelId = card.dataset.levelId;
                const url = config.deleteLevelUrlTemplate.replace("__LEVEL_ID__", levelId);

                try {
                    const resp = await fetch(url, {
                        method: "DELETE",
                        headers: { "X-Requested-With": "XMLHttpRequest" }
                    });

                    const data = await resp.json();
                    if (!resp.ok || !data.success) {
                        showToast(false);
                        return;
                    }

                    card.remove();
                    showToast(true);

                } catch (e) {
                    console.error(e);
                    showToast(false);
                }
            });
        }

        // --- SAUVEGARDE DU NIVEAU
        if (saveBtn && config.saveLevelUrlTemplate) {
            saveBtn.addEventListener("click", async () => {
                const levelId = card.dataset.levelId;
                const url = config.saveLevelUrlTemplate.replace("__LEVEL_ID__", levelId);

                const nameInput = card.querySelector(".level-name-input");
                const name = nameInput ? nameInput.value.trim() : "";

                const eqBtn = equalGroup ? equalGroup.querySelector("button.active") : null;
                const facBtn = factorGroup ? factorGroup.querySelector("button.active") : null;

                const payload = {
                    name,
                    tables: getTablesForCard(card),
                    intervalMin: parseInt(card.dataset.intervalMin || "1", 10),
                    intervalMax: parseInt(card.dataset.intervalMax || "10", 10),
                    equalPosition: eqBtn ? eqBtn.dataset.value : "RIGHT",
                    factorPosition: facBtn ? facBtn.dataset.value : "OPERAND_TABLE"
                };

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

                    showToast(true);

                } catch (e) {
                    console.error(e);
                    showToast(false);
                }
            });
        }

        // --- OUVERTURE DES MODALES DE TÂCHES
        card.querySelectorAll(".task-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                const levelId  = card.dataset.levelId;
                const taskType = pill.dataset.taskType;

                const tasksMap = getTasksMap(card);
                const existing = tasksMap[taskType] || null;

                switch (taskType) {
                    case "C1":
                        openC1Modal(levelId, existing, card);
                        break;
                    case "C2":
                        openC2Modal(levelId, existing, card);
                        break;
                    case "REC":
                        openRecModal(levelId, existing, card);
                        break;
                    case "ID":
                        openIdModal(levelId, existing, card);
                        break;
                    case "MEMB":
                        openMembModal(levelId, existing, card);
                        break;
                }
            });
        });
    }

    function initAllLevelCards() {
        if (!levelsContainer) return;
        levelsContainer.querySelectorAll(".level-card").forEach(card => initLevelCard(card));
    }

    initAllLevelCards();

    /* =======================================================================
       AJOUT D’UN NIVEAU
       ======================================================================= */

    if (addLevelBtn && config.addLevelUrl) {
        addLevelBtn.addEventListener("click", async () => {
            try {
                const resp = await fetch(config.addLevelUrl, {
                    method: "POST",
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });

                const data = await resp.json();
                if (!resp.ok || !data.success || !data.html) {
                    showToast(false);
                    return;
                }

                const temp = document.createElement("div");
                temp.innerHTML = data.html.trim();
                const newCard = temp.firstElementChild;

                if (levelsContainer && newCard) {
                    levelsContainer.appendChild(newCard);
                    initLevelCard(newCard);
                    showToast(true);
                }

            } catch (e) {
                console.error(e);
                showToast(false);
            }
        });
    }

    /* =======================================================================
       Rendre saveTask / deleteTask accessibles aux modales via window
       ======================================================================= */

    window.saveTask = saveTask;
    window.deleteTask = deleteTask;
});
