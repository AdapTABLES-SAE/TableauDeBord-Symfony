// public/js/objective_builder.js

import { showToast } from './toast/toast.js';

// Import des modales
import { openC1Modal }   from "./modals/modal_c1.js";
import { openC2Modal }   from "./modals/modal_c2.js";
import { openRecModal }  from "./modals/modal_rec.js";
import { openIdModal }   from "./modals/modal_id.js";
import { openMembModal } from "./modals/modal_memb.js";

// Import des actions communes
import { saveTask as originalSaveTask, deleteTask as originalDeleteTask } from "./modals/task_actions.js";

document.addEventListener("DOMContentLoaded", () => {

    const config = window.OBJECTIVE_CONFIG || {};

    const tablesWrapper   = document.getElementById("tables-wrapper");
    const previewBox      = document.getElementById("preview-box");
    const levelsContainer = document.getElementById("levels-container");
    const addLevelBtn     = document.getElementById("add-level-btn");
    const saveAllBtn      = document.getElementById("save-all-btn");
    const objectiveNameEl = document.getElementById("objective_name");

    let unsavedChanges = false;
    let initialState   = null;

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

            const seenSlider    = card.querySelector(".completion-seen");
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
        const previewBox = document.getElementById("preview-box");
        const infoLine   = document.getElementById("preview-info-line");

        if (!previewBox) return;

        // 1. Récupérer les tables globales
        const tables = getSelectedTables();

        // --- CALCUL DU TOTAL GLOBAL DES FAITS ---
        // On parcourt toutes les cartes et on utilise la fonction computeFactsCount
        // (qu'on a corrigée à l'étape précédente pour inclure les positions MIX/Left/Right)
        let totalGlobalFacts = 0;
        const levelCards = document.querySelectorAll(".level-card");

        levelCards.forEach(card => {
            totalGlobalFacts += computeFactsCount(card);
        });

        // Mise à jour du texte d'information
        if (infoLine) {
            if (levelCards.length === 0 || totalGlobalFacts === 0) {
                infoLine.innerHTML = "Aucun fait généré pour l'instant.";
            } else {
                // "Voici 8 exemples de faits sur X faits au total"
                infoLine.innerHTML = `Voici <strong>8</strong> exemples de faits sur <strong>${totalGlobalFacts}</strong> faits au total.`;
            }
        }

        // --- GESTION DE L'AFFICHAGE DES BADGES (Reste similaire) ---

        if (!tables.length) {
            previewBox.innerHTML = `
                <div class="preview-empty">
                    <i class="bi bi-grid-3x3 mb-2 d-block" style="font-size: 1.5rem;"></i>
                    Aucune table sélectionnée
                </div>`;
            return;
        }

        if (levelCards.length === 0) {
            previewBox.innerHTML = `
                <div class="preview-empty">
                    <i class="bi bi-plus-circle-dotted mb-2 d-block" style="font-size: 1.5rem;"></i>
                    Ajoutez un niveau pour voir l'aperçu.
                </div>`;
            return;
        }

        const list = [];
        const count = 8;

        for (let i = 0; i < count; i++) {
            // A. PIOCHER UN NIVEAU ALÉATOIRE
            const randomIndex = Math.floor(Math.random() * levelCards.length);
            const card = levelCards[randomIndex];

            // B. Lire les paramètres de CE niveau
            const min = parseInt(card.dataset.intervalMin || "1", 10);
            const max = parseInt(card.dataset.intervalMax || "10", 10);
            const eqPos = card.dataset.equalPosition || "RIGHT";
            const facPos = card.dataset.factorPosition || "OPERAND_TABLE";

            // C. Choisir table et opérande
            const t = parseInt(tables[i % tables.length], 10);
            const operand = Math.floor(Math.random() * (max - min + 1)) + min;
            const result  = t * operand;

            // D. Position du Facteur
            let currentFacPos = facPos;
            if (currentFacPos === "MIX") {
                currentFacPos = Math.random() < 0.5 ? "OPERAND_TABLE" : "TABLE_OPERAND";
            }

            let leftFactor, rightFactor;
            if (currentFacPos === "OPERAND_TABLE") {
                leftFactor = operand;
                rightFactor = t;
            } else {
                leftFactor = t;
                rightFactor = operand;
            }

            // E. Position de l'Égal
            let currentEqPos = eqPos;
            if (currentEqPos === "MIX") {
                currentEqPos = Math.random() < 0.5 ? "LEFT" : "RIGHT";
            }

            let equationHTML = "";
            if (currentEqPos === "LEFT") {
                equationHTML = `<strong>${result}</strong> = ${leftFactor} × ${rightFactor}`;
            } else {
                equationHTML = `${leftFactor} × ${rightFactor} = <strong>${result}</strong>`;
            }

            list.push(`
                <div class="op-badge" title="Tiré du Niveau ${randomIndex + 1}">
                    ${equationHTML}
                </div>
            `);
        }

        previewBox.innerHTML = list.join("");
    }

    // Appel initial
    updatePreview();

    /* =========================================================================================
       GESTION DU BOUTON REFRESH
    ========================================================================================= */

    const refreshPreviewBtn = document.getElementById("refresh-preview-btn");

    if (refreshPreviewBtn) {
        refreshPreviewBtn.addEventListener("click", () => {

            // 1. Animation de rotation pour le fun (UX)
            const icon = refreshPreviewBtn.querySelector("i");
            if (icon) {
                // On applique la rotation
                icon.style.transition = "transform 0.4s ease";
                icon.style.transform = "rotate(360deg)";

                // On réinitialise après l'animation pour pouvoir le refaire au prochain clic
                setTimeout(() => {
                    icon.style.transition = "none";
                    icon.style.transform = "rotate(0deg)";
                }, 400);
            }

            // 2. Appel de la fonction de mise à jour
            updatePreview();
        });
    }

    // Appel initial au chargement de la page
    updatePreview();

    /* =========================================================================================
       TACHES - UTILITAIRES
    ========================================================================================= */

    function getTasksMap(card) {
        let raw;
        try {
            raw = JSON.parse(card.dataset.tasks || "{}");
        } catch {
            return {};
        }

        if (Array.isArray(raw)) {
            const map = {};
            raw.forEach(item => {
                if (item && item.taskType) {
                    map[item.taskType] = item;
                }
            });
            return map;
        }

        return raw || {};
    }

    function setTasksMap(card, map) {
        card.dataset.tasks = JSON.stringify(map);
    }

    function refreshTasksUI(card) {
        const tasksMap = getTasksMap(card);

        card.querySelectorAll(".task-card").forEach(btn => {
            const type = btn.dataset.taskType;
            if (tasksMap[type]) {
                btn.classList.add("task-active");
            } else {
                btn.classList.remove("task-active");
            }
        });
    }

    function updateTaskState(card, taskType, taskData) {
        const map = getTasksMap(card);

        if (taskData) {
            map[taskType] = taskData;
        } else {
            delete map[taskType];
        }

        setTasksMap(card, map);
        refreshTasksUI(card);
        markDirty();
    }

    /* =========================================================================================
       FACTS COUNT
    ========================================================================================= */

    function getTablesForCard(card) {
        try {
            const arr = JSON.parse(card.dataset.tables || "[]");
            if (Array.isArray(arr) && arr.length) return arr;
        } catch {}
        return getSelectedTables();
    }

    function computeFactsCount(card) {
        // 1. Base : (Nombre de tables) x (Taille de l'intervalle)
        const tables = getTablesForCard(card);
        const min = parseInt(card.dataset.intervalMin || "1", 10);
        const max = parseInt(card.dataset.intervalMax || "10", 10);
        let count = tables.length * Math.max(0, max - min + 1);

        // 2. Position du signe Égal
        // Si "MIX" (Les deux), on double car "a = b" et "b = a" sont deux items distincts
        const eqPos = card.dataset.equalPosition || "RIGHT";
        if (eqPos === "MIX") {
            count *= 2;
        }

        // 3. Position des Facteurs
        // Si "MIX" (Les deux), on double car "a x b" et "b x a" sont deux items distincts
        const facPos = card.dataset.factorPosition || "OPERAND_TABLE";
        if (facPos === "MIX") {
            count *= 2;
        }

        return count;
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

        const range     = wrap.querySelector(".range-range");
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

            range.style.left  = percent(minVal) + "%";
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

                if (type === "min") {
                    minVal = Math.min(val, maxVal);
                } else {
                    maxVal = Math.max(val, minVal);
                }

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
        const seen        = card.querySelector(".completion-seen");
        const success     = card.querySelector(".completion-success");
        const seenValue   = card.querySelector(".completion-seen-value");
        const successValue= card.querySelector(".completion-success-value");

        if (!seen || !success) return;

        seen.value    = card.dataset.encounterCriteria || 80;
        success.value = card.dataset.successCriteria    || 100;

        seenValue.textContent    = seen.value + "%";
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
       COLLAPSE
    ========================================================================================= */

    function initCollapse(card) {
        // On cible le bouton ET le header pour permettre de cliquer n'importe où (optionnel)
        const toggleBtn = card.querySelector(".toggle-level-details");
        const header    = card.querySelector(".level-header");
        const body      = card.querySelector(".level-body");

        if (!toggleBtn || !body) return;

        // Fonction de bascule
        const toggle = (e) => {
            // Évite de déclencher si on clique sur l'input du nom
            if (e.target.closest('.level-name-input')) return;

            const isCollapsed = card.classList.toggle("collapsed");

            if (isCollapsed) {
                body.style.maxHeight = "0px";
                body.style.opacity   = "0";
            } else {
                // On calcule la hauteur réelle du contenu interne
                body.style.maxHeight = body.scrollHeight + "px";
                body.style.opacity   = "1";
            }
        };

        // Clic sur le bouton chevron
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Évite double déclenchement si on ajoute l'event sur le header aussi
            toggle(e);
        });

        // (Optionnel) Clic sur tout le header pour ouvrir/fermer
        // header.addEventListener("click", toggle);

        // Initialisation état par défaut (ouvert)
        if (!card.classList.contains("collapsed")) {
            body.style.maxHeight = body.scrollHeight + "px";
            body.style.opacity   = "1";
        } else {
            body.style.maxHeight = "0px";
            body.style.opacity   = "0";
        }
    }

    /* =========================================================================================
       INIT LEVEL CARD
    ========================================================================================= */

    function initLevelCard(card) {
        if (!card) return;

        // Détecte chaque frappe (lettre, espace...) dans le nom du niveau
        const nameInput = card.querySelector(".level-name-input");
        if (nameInput) {
            nameInput.addEventListener("input", () => {
                markDirty();
            });
        }

        const equalGroup  = card.querySelector(".equal-position-group");
        const factorGroup = card.querySelector(".factor-position-group");

        initCollapse(card);
        initCompletionSliders(card);
        initDoubleSlider(card);

        updateFactsCount(card);
        refreshTasksUI(card);

        // Equal position
        const eqCurrent = card.dataset.equalPosition;
        if (equalGroup) {
            equalGroup.querySelectorAll(".position-btn").forEach(btn => {
                if (btn.dataset.value === eqCurrent) btn.classList.add("active");

                btn.addEventListener("click", () => {
                    equalGroup.querySelectorAll(".position-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    card.dataset.equalPosition = btn.dataset.value;
                    updateFactsCount(card);
                    updatePreview();
                    markDirty();
                });
            });
        }

        // Factor position
        const facCurrent = card.dataset.factorPosition;
        if (factorGroup) {
            factorGroup.querySelectorAll(".position-btn").forEach(btn => {
                if (btn.dataset.value === facCurrent) btn.classList.add("active");

                btn.addEventListener("click", () => {
                    factorGroup.querySelectorAll(".position-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    card.dataset.factorPosition = btn.dataset.value;
                    updateFactsCount(card);
                    updatePreview();
                    markDirty();
                });
            });
        }

        // Delete level
        const deleteBtn = card.querySelector(".delete-level-btn");
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
                    showToast(true);

                    updatePreview();

                    captureInitialState();

                } catch (err) {
                    console.error(err);
                    showToast(false);
                }
            });
        }

        // Modales TACHES
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

                // 1. Création du DOM
                const temp = document.createElement("div");
                temp.innerHTML = json.html.trim();
                const newCard = temp.firstElementChild;

                // 2. Injection dans le conteneur
                levelsContainer.appendChild(newCard);

                // 3. SYNCHRONISATION IMMÉDIATE DES TABLES GLOBALES
                // On récupère les tables actuellement sélectionnées à gauche
                const currentTables = getSelectedTables();
                // On les injecte dans le dataset du nouveau niveau
                newCard.dataset.tables = JSON.stringify(currentTables);

                // 4. Initialisation du niveau (Sliders, Listeners, etc.)
                initLevelCard(newCard);

                // 5. Forcer la mise à jour visuelle du badge "Faits"
                updateFactsCount(newCard);

                // 6. Mise à jour de l'aperçu et sauvegarde état
                updatePreview();
                showToast(true);
                captureInitialState();

            } catch (err) {
                console.error(err);
                showToast(false);
            }
        });
    }

    /* =========================================================================================
       TASK WRAPPERS — LIVE UPDATE
    ========================================================================================= */

    window.saveTask = async function(levelId, payload, card, taskType, modalId) {
        const result = await originalSaveTask(levelId, payload, card, taskType, modalId);

        if (result && result.success) {
            updateTaskState(card, taskType, result.task);
        }
        return result;
    };

    window.deleteTask = async function(levelId, taskType, card, modalId) {
        const result = await originalDeleteTask(levelId, taskType, card, modalId);

        if (result && result.success) {
            updateTaskState(card, taskType, null);
        }
        return result;
    };

});
