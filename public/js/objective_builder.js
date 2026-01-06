// public/js/objective_builder.js

import { showToast } from './toast/toast.js';

// Import des modales
import { openC1Modal }   from "./modals/modal_c1.js";
import { openC2Modal }   from "./modals/modal_c2.js";
import { openRecModal }  from "./modals/modal_rec.js";
import { openIdModal }   from "./modals/modal_id.js";
import { openMembModal } from "./modals/modal_memb.js";
import { initPrereqModal } from './modals/modal_prereq.js';

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

    // Initialisation de la modale prérequis
    initPrereqModal();

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
       PREVIEW CIBLÉ
    ========================================================================================= */

    const refreshPreviewBtn = document.getElementById("refresh-preview-btn");

    function updatePreview() {
        const previewBox = document.getElementById("preview-box");
        const infoLine   = document.getElementById("preview-info-line");

        if (!previewBox) return;

        // 1. Récupérer les tables globales
        const tables = getSelectedTables();

        // 2. Trouver le niveau OUVERT (celui qui n'a pas la classe .collapsed)
        const openCard = document.querySelector(".level-card:not(.collapsed)");

        // Cas : Aucun niveau ou aucun niveau ouvert
        if (!openCard) {
            if (infoLine) infoLine.textContent = "";
            previewBox.innerHTML = `
                <div class="preview-empty">
                    <i class="bi bi-eye-slash mb-2 d-block" style="font-size: 1.5rem;"></i>
                    Ouvrez un niveau pour voir l'aperçu associé.
                </div>`;
            return;
        }

        // 3. Calcul du total pour CE niveau uniquement
        const totalFacts = computeFactsCount(openCard);

        // Mise à jour du texte d'information
        if (infoLine) {
            // Récupère le titre (ex: "Niveau 2")
            const levelTitle = openCard.querySelector(".level-title")?.textContent.trim() || "Niveau actuel";
            infoLine.innerHTML = `Aperçu basé sur <strong>${levelTitle}</strong> (${totalFacts} faits possibles)`;
        }

        if (!tables.length) {
            previewBox.innerHTML = `
                <div class="preview-empty">
                    <i class="bi bi-grid-3x3 mb-2 d-block" style="font-size: 1.5rem;"></i>
                    Aucune table sélectionnée
                </div>`;
            return;
        }

        // 4. Génération des exemples
        const list = [];
        const count = 8;

        // Lire les paramètres du niveau ouvert
        const min = parseInt(openCard.dataset.intervalMin || "1", 10);
        const max = parseInt(openCard.dataset.intervalMax || "10", 10);
        const eqPos = openCard.dataset.equalPosition || "RIGHT";
        const facPos = openCard.dataset.factorPosition || "OPERAND_TABLE";

        for (let i = 0; i < count; i++) {
            const t = parseInt(tables[i % tables.length], 10);
            const operand = Math.floor(Math.random() * (max - min + 1)) + min;
            const result  = t * operand;

            // Position Facteur
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

            // Position Égal
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
                <div class="op-badge">
                    ${equationHTML}
                </div>
            `);
        }

        previewBox.innerHTML = list.join("");
    }

    /* =========================================================================================
       GESTION DU BOUTON REFRESH
    ========================================================================================= */

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
        const toggleBtn = card.querySelector(".toggle-level-details");
        const body      = card.querySelector(".level-body");

        if (!toggleBtn || !body) return;

        // Fonction helper pour fermer une carte
        const closeCard = (c) => {
            c.classList.add("collapsed");
            const b = c.querySelector(".level-body");
            if (b) {
                b.style.maxHeight = "0px";
                b.style.opacity   = "0";
            }
        };

        // Fonction helper pour ouvrir une carte
        const openCard = (c) => {
            c.classList.remove("collapsed");
            const b = c.querySelector(".level-body");
            if (b) {
                b.style.maxHeight = b.scrollHeight + "px";
                b.style.opacity   = "1";
            }
        };

        // État initial (Si la carte est déjà marquée collapsed dans le HTML)
        if (card.classList.contains("collapsed")) {
            closeCard(card);
        } else {
            openCard(card);
        }

        // Clic sur le bouton
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const isCurrentlyOpen = !card.classList.contains("collapsed");

            if (isCurrentlyOpen) {
                // Si c'est ouvert, on ferme simplement
                closeCard(card);
                // Optionnel : On vide l'aperçu car rien n'est sélectionné
                updatePreview();
            } else {
                // Si c'est fermé, ON FERME TOUS LES AUTRES d'abord
                document.querySelectorAll(".level-card").forEach(otherCard => {
                    if (otherCard !== card) {
                        closeCard(otherCard);
                    }
                });

                // Puis on ouvre celui-ci
                openCard(card);

                // Et on met à jour l'aperçu immédiatement
                updatePreview();
            }
        });
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

                // 2. Suppression du bandeau "Aucun niveau" s'il existe
                const alertBanner = document.getElementById("no-levels-alert");
                if (alertBanner) {
                    alertBanner.remove();
                }

                // 3. FERMETURE DE TOUS LES NIVEAUX EXISTANTS (Mode Accordéon)
                // On ferme visuellement tout ce qui est déjà là pour que le focus soit sur le nouveau
                document.querySelectorAll(".level-card").forEach(c => {
                    c.classList.add("collapsed");
                    const b = c.querySelector(".level-body");
                    if (b) {
                        b.style.maxHeight = "0px";
                        b.style.opacity   = "0";
                    }
                });

                // 4. Injection du nouveau niveau dans le conteneur
                levelsContainer.appendChild(newCard);

                // 5. Sync des tables globales vers le nouveau niveau
                const currentTables = getSelectedTables();
                newCard.dataset.tables = JSON.stringify(currentTables);

                // 6. Initialisation (Events, Sliders...)
                // Note : Le HTML renvoyé par le serveur pour un "nouveau" niveau ne doit pas avoir la classe "collapsed",
                // donc initCollapse va le laisser ouvert par défaut.
                initLevelCard(newCard);

                // 7. Mise à jour des compteurs et de l'aperçu
                updateFactsCount(newCard);

                // updatePreview() va chercher le seul niveau ouvert (le nouveau) pour générer les exemples
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
