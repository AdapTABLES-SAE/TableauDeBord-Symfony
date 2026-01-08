import { showToast } from './toast/toast.js';

// Import des modales
import { openC1Modal }   from "./modals/modal_c1.js";
import { openC2Modal }   from "./modals/modal_c2.js";
import { openRecModal }  from "./modals/modal_rec.js";
import { openIdModal }   from "./modals/modal_id.js";
import { openMembModal } from "./modals/modal_memb.js";
import { initPrereqModal } from './modals/modal_prereq.js';

import "./add_level_manager.js";

// Import des actions communes
import { saveTask as originalSaveTask, openTaskDeleteModal } from "./modals/task_actions.js";

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

    // =========================================================================
    // GESTION GLOBALE DE LA MODALE DE SUPPRESSION NIVEAU
    // =========================================================================

    const deleteModal     = document.getElementById("delete-level-modal");
    const confirmDelBtn   = document.getElementById("btn-confirm-delete");
    const cancelDelBtn    = document.getElementById("btn-cancel-delete");
    const closeDelBtn     = document.getElementById("btn-close-delete-modal");

    // Variable pour se souvenir QUEL niveau on veut supprimer
    let cardPendingDelete = null;

    // Fonction de fermeture
    const closeDeleteModal = () => {
        if (deleteModal) deleteModal.style.display = "none";
        cardPendingDelete = null;
        if (confirmDelBtn) confirmDelBtn.disabled = false;
    };

    // Events de fermeture
    if (cancelDelBtn) cancelDelBtn.addEventListener("click", closeDeleteModal);
    if (closeDelBtn)  closeDelBtn.addEventListener("click", closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener("click", (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // --- CLIC SUR LE BOUTON "OUI, SUPPRIMER" ---
    if (confirmDelBtn) {
        confirmDelBtn.addEventListener("click", async () => {
            if (!cardPendingDelete) return;

            const card = cardPendingDelete;
            const url = config.deleteLevelUrlTemplate.replace("__LEVEL_ID__", card.dataset.levelId);

            // UI Loading
            confirmDelBtn.disabled = true;
            const originalHTML = confirmDelBtn.innerHTML;
            confirmDelBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Suppression...';

            try {
                const resp = await fetch(url, {
                    method: "DELETE",
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });

                const json = await resp.json();

                if (!json.success) {
                    showToast(false, json.message || "Erreur lors de la suppression.");
                } else {
                    // Suppression réussie
                    card.remove();
                    showToast(true, "Niveau supprimé.");

                    updatePreview();
                    captureInitialState(); // Reset de l'état "modifié"
                }
            } catch (err) {
                console.error(err);
                showToast(false, "Erreur serveur.");
            } finally {
                // Reset UI
                confirmDelBtn.innerHTML = originalHTML;
                closeDeleteModal();
            }
        });
    }

    /* =========================================================================================
       COLLECTEUR GLOBAL : objectif + niveaux + tâches
    ========================================================================================= */

    function collectAllData() {
        const objective = {
            name: objectiveNameEl?.value.trim() || "",
            tables: getSelectedTables()
        };

        const levels = [];
        const tasks = [];

        document.querySelectorAll(".level-card").forEach(card => {
            const levelId = parseInt(card.dataset.levelId, 10);

            // 1. Récupération des données du niveau
            let levelTables = [];
            try { levelTables = JSON.parse(card.dataset.tables || "[]"); } catch { levelTables = []; }

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

            // 2. RÉCUPÉRATION DES TÂCHES ET DE LEUR RÉPARTITION
            // On regarde les inputs de ce niveau
            card.querySelectorAll('.task-repartition-input').forEach(input => {
                const taskType = input.dataset.taskType;

                // On vérifie si la tâche est active via la classe du bouton associé
                // (L'input a data-task-type="C1", on cherche le bouton correspondant)
                const btn = card.querySelector(`.task-card[data-task-type="${taskType}"]`);

                if (btn && btn.classList.contains('task-active')) {
                    // On récupère les données existantes (pour ne pas perdre les targets, etc.)
                    const tasksMap = getTasksMap(card);
                    const currentData = tasksMap[taskType] || {};

                    tasks.push({
                        levelId: levelId,
                        taskType: taskType,
                        repartitionPercent: parseInt(input.value, 10) || 0,

                        // On renvoie aussi les autres paramètres s'ils existent déjà en mémoire
                        timeMaxSecond: currentData.timeMaxSecond || 20,
                        successiveSuccessesToReach: currentData.successiveSuccessesToReach || 1,
                        targets: currentData.targets || [],
                        answerModality: currentData.answerModality || null,
                        nbIncorrectChoices: currentData.nbIncorrectChoices || null,
                        nbCorrectChoices: currentData.nbCorrectChoices || null,
                        nbFacts: currentData.nbFacts || null,
                        sourceVariation: currentData.sourceVariation || null,
                        target: currentData.target || null
                    });
                }
            });
        });

        return { objective, levels, tasks };
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

        // Récupérer les tables globales
        const tables = getSelectedTables();

        // Trouver le niveau OUVERT (celui qui n'a pas la classe .collapsed)
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

        // Calcul du total pour CE niveau uniquement
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

        // Génération des exemples
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

            // Animation de rotation
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

            // Appel de la fonction de mise à jour
            updatePreview();
        });
    }

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
            // On cherche le conteneur de l'input associé
            const wrapper = btn.closest('.task-wrapper');
            const inputGroup = wrapper ? wrapper.querySelector('.repartition-input-group') : null;

            if (tasksMap[type]) {
                // Tâche active
                btn.classList.add("task-active");
                if (inputGroup) inputGroup.classList.remove("d-none");

            } else {
                // Tâche inactive
                btn.classList.remove("task-active");
                if (inputGroup) inputGroup.classList.add("d-none");
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
       COMPTAGE DES FAITS
    ========================================================================================= */

    function getTablesForCard(card) {
        try {
            const arr = JSON.parse(card.dataset.tables || "[]");
            if (Array.isArray(arr) && arr.length) return arr;
        } catch {}
        return getSelectedTables();
    }

    function computeFactsCount(card) {
        // Base : (Nombre de tables) x (Taille de l'intervalle)
        const tables = getTablesForCard(card);
        const min = parseInt(card.dataset.intervalMin || "1", 10);
        const max = parseInt(card.dataset.intervalMax || "10", 10);
        let count = tables.length * Math.max(0, max - min + 1);

        // Position du signe Égal
        // Si "MIX" (Les deux), on double car "a = b" et "b = a" sont deux items distincts
        const eqPos = card.dataset.equalPosition || "RIGHT";
        if (eqPos === "MIX") {
            count *= 2;
        }

        // Position des Facteurs
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
                updatePreview();
            } else {
                // Si c'est fermé, ON FERME TOUS LES AUTRES d'abord
                document.querySelectorAll(".level-card").forEach(otherCard => {
                    if (otherCard !== card) {
                        closeCard(otherCard);
                    }
                });

                openCard(card);
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

        // On vérifie juste que le bouton existe
        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {

                // SÉCURITÉ : EMPÊCHER LA SUPPRESSION DU DERNIER NIVEAU
                const allLevels = document.querySelectorAll(".level-card");
                if (allLevels.length <= 1) {
                    showToast(false, "Impossible de supprimer l'unique niveau de l'objectif.");
                    return;
                }

                // PRÉPARATION DE LA SUPPRESSION
                cardPendingDelete = card;

                //Récupérer le nom pour l'afficher dans la modale ---
                const levelName = card.querySelector(".level-name-input").value || "Niveau sans nom";
                const nameSpan = document.getElementById("delete-level-name-target");
                if(nameSpan) nameSpan.textContent = levelName;

                // OUVERTURE DE LA MODALE
                const deleteModal = document.getElementById("delete-level-modal");
                if (deleteModal) {
                    deleteModal.style.display = "flex";
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

        // Écouteur sur les inputs de répartition ---
        card.querySelectorAll('.task-repartition-input').forEach(input => {
            input.addEventListener('input', () => {
                const type = input.dataset.taskType;
                const tasksMap = getTasksMap(card);
                if (tasksMap[type]) {
                    tasksMap[type].repartitionPercent = parseInt(input.value, 10);
                    setTasksMap(card, tasksMap);
                }

                // On signale qu'il y a des changements non sauvegardés
                markDirty();
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

    // =========================================================================
    // GESTION SUPPRESSION PRÉREQUIS (Via Modale Rouge)
    // =========================================================================

    const delPrereqModal   = document.getElementById("delete-prereq-modal");
    const confirmPrereqBtn = document.getElementById("btn-confirm-delete-prereq");
    const cancelPrereqBtn  = document.getElementById("btn-cancel-delete-prereq");
    const closePrereqBtn   = document.getElementById("btn-close-delete-prereq");
    const prereqNameTarget = document.getElementById("delete-prereq-name-target");

    // Variables pour stocker ce qu'on est en train de supprimer
    let pendingPrereqId = null;
    let pendingPrereqBadge = null;
    let pendingDeleteUrl = null;

    // --- FERMETURE DE LA MODALE ---
    const closePrereqModal = () => {
        if (delPrereqModal) delPrereqModal.style.display = "none";
        pendingPrereqId = null;
        pendingPrereqBadge = null;
        pendingDeleteUrl = null;
        if (confirmPrereqBtn) confirmPrereqBtn.disabled = false;
    };

    // Écouteurs pour fermer la modale
    if (cancelPrereqBtn) cancelPrereqBtn.addEventListener("click", closePrereqModal);
    if (closePrereqBtn)  closePrereqBtn.addEventListener("click", closePrereqModal);
    if (delPrereqModal) {
        delPrereqModal.addEventListener("click", (e) => {
            if (e.target === delPrereqModal) closePrereqModal();
        });
    }

    // --- DÉTECTION DU CLIC SUR LA POUBELLE (Event Delegation) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-prereq-btn');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();

            pendingPrereqId = btn.dataset.prereqId;
            const name = btn.dataset.prereqName || "ce prérequis";
            pendingPrereqBadge = btn.closest('.prereq-badge');

            pendingDeleteUrl = btn.dataset.deleteUrl;

            if (prereqNameTarget) prereqNameTarget.textContent = name;
            if (delPrereqModal) delPrereqModal.style.display = "flex";
        }
    });

    // --- CONFIRMATION DE LA SUPPRESSION (Appel Serveur) ---
    if (confirmPrereqBtn) {
        confirmPrereqBtn.addEventListener("click", async () => {
            // On vérifie l'URL
            if (!pendingDeleteUrl) return;

            // --- SAUVEGARDE LOCALE IMPORTANTE ---
            // On stocke l'élément dans une variable locale
            const badgeToRemove = pendingPrereqBadge;
            const container = document.getElementById('prerequisites-list');

            // UI : Loading
            confirmPrereqBtn.disabled = true;
            const originalHTML = confirmPrereqBtn.innerHTML;
            confirmPrereqBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Suppression...';

            try {
                const resp = await fetch(pendingDeleteUrl, {
                    method: "DELETE",
                    headers: { "X-Requested-With": "XMLHttpRequest" }
                });

                if (!resp.ok) throw new Error("Erreur réseau : " + resp.status);

                const json = await resp.json();

                if (json.success) {
                    // SUCCÈS
                    if (badgeToRemove) {
                        // Animation
                        badgeToRemove.style.transition = "all 0.3s ease";
                        badgeToRemove.style.opacity = "0";
                        badgeToRemove.style.transform = "translateX(20px)";

                        setTimeout(() => {
                            // Suppression
                            badgeToRemove.remove();

                            // Nettoyage du conteneur (Espace blanc)
                            if (container) {
                                const remainingCount = container.querySelectorAll('.prereq-badge').length;
                                if (remainingCount === 0) {
                                    container.style.display = 'none';
                                    container.classList.remove('d-flex', 'mb-2', 'gap-2');
                                    container.classList.add('d-none');
                                }
                            }
                        }, 300);
                    }
                    showToast(true, "Prérequis supprimé.");
                } else {
                    showToast(false, json.message || "Impossible de supprimer.");
                }

            } catch (err) {
                console.error("Erreur suppression:", err);
                showToast(false, "Une erreur est survenue.");
            } finally {
                // Reset UI et Fermeture
                confirmPrereqBtn.innerHTML = originalHTML;
                closePrereqModal();
            }
        });
    }

    /* =========================================================================================
   SAVE ALL (AVEC SÉCURITÉ ÉLÈVES)
========================================================================================= */

    const saveModal    = document.getElementById("confirm-save-modal");
    const forceSaveBtn = document.getElementById("btn-force-save"); // Bouton dans la modale
    const closeSaveBtn = document.getElementById("btn-close-confirm-save");
    const cancelSaveBtn = document.getElementById("btn-cancel-confirm-save");

// --- FONCTION DE FERMETURE MODALE ---
    const closeSaveModal = () => {
        if (saveModal) saveModal.style.display = "none";
        if (forceSaveBtn) {
            forceSaveBtn.disabled = false;
            forceSaveBtn.innerHTML = '<i class="bi bi-save me-2"></i> Confirmer et Enregistrer';
        }
    };

    if (cancelSaveBtn) cancelSaveBtn.addEventListener("click", closeSaveModal);
    if (closeSaveBtn) closeSaveBtn.addEventListener("click", closeSaveModal);

// --- FONCTION DE SAUVEGARDE RÉUTILISABLE (Votre logique originale encapsulée) ---
    async function executeGlobalSave() {
        const payload = collectAllData();

        // UI Loading sur le bouton principal (si visible)
        if (saveAllBtn) saveAllBtn.classList.add("loading");

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

            // Nettoyage UI
            if (saveAllBtn) saveAllBtn.classList.remove("loading");
            closeSaveModal(); // On ferme la modale si elle était ouverte

            if (!json.success) {
                return showToast(false, json.message || "Erreur lors de l'enregistrement");
            }

            captureInitialState();
            showToast(true, "Enregistrement réussi !");

        } catch (err) {
            console.error(err);
            if (saveAllBtn) saveAllBtn.classList.remove("loading");
            closeSaveModal();
            showToast(false, "Erreur serveur");
        }
    }

// --- CLIC SUR LE BOUTON PRINCIPAL "ENREGISTRER TOUT" ---
    if (saveAllBtn) {
        saveAllBtn.addEventListener("click", async () => {

            // 1. Validation de base (Tables)
            const selectedTables = getSelectedTables();
            if (!selectedTables.length) {
                showToast(false, "Sélectionnez au moins une table pour enregistrer.");
                return;
            }

            // 2. VALIDATION DES POURCENTAGES (NOUVEAU)
            let percentError = false;
            document.querySelectorAll(".level-card").forEach(card => {
                // On récupère les tâches actives
                const activeInputs = [];
                card.querySelectorAll('.task-repartition-input').forEach(input => {
                    const type = input.dataset.taskType;
                    const btn = card.querySelector(`.task-card[data-task-type="${type}"]`);
                    if (btn && btn.classList.contains('task-active')) {
                        activeInputs.push(input);
                    }
                });

                if (activeInputs.length > 0) {
                    // Calcul de la somme
                    const sum = activeInputs.reduce((acc, input) => acc + (parseInt(input.value, 10) || 0), 0);

                    // On tolère 99, 100 ou 101 à cause des arrondis, ou strict 100 selon votre préférence
                    // Ici on demande strict 100
                    if (sum !== 100) {
                        percentError = true;
                        // Feedback visuel (bordure rouge temporaire)
                        activeInputs.forEach(input => input.classList.add('border-danger'));
                        setTimeout(() => activeInputs.forEach(input => input.classList.remove('border-danger')), 2000);
                    }
                }
            });

            if (percentError) {
                showToast(false, "La somme des pourcentages des tâches actives doit être égale à 100% pour chaque niveau.");
                return; // ON BLOQUE L'ENREGISTREMENT
            }

            // 3. Vérification de sécurité (Élèves présents ?)
            const hasStudents = saveAllBtn.dataset.hasStudents === "true";

            if (hasStudents) {
                // A. Il y a des élèves : on ouvre la modale rouge
                if (saveModal) saveModal.style.display = "flex";
            } else {
                // B. Pas d'élèves : on sauvegarde directement
                await executeGlobalSave();
            }
        });
    }

// --- CLIC SUR LE BOUTON DE CONFIRMATION (DANS LA MODALE) ---
    if (forceSaveBtn) {
        forceSaveBtn.addEventListener("click", async () => {
            // UI Loading sur le bouton de la modale pour feedback immédiat
            forceSaveBtn.disabled = true;
            forceSaveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enregistrement...';

            // On lance la sauvegarde réelle
            await executeGlobalSave();
        });
    }



    /* =========================================================================================
       TASK WRAPPERS — LIVE UPDATE
    ========================================================================================= */

    window.saveTask = async function(levelId, payload, card, taskType, modalId) {
        // On appelle simplement la fonction originale.
        // C'est elle qui appelle le PHP (qui fait le calcul 100%) puis recharge la page.
        const result = await originalSaveTask(levelId, payload, card, taskType, modalId);

        if (result && result.success) {
            // On met juste à jour l'état visuel local en attendant que la page reload
            updateTaskState(card, taskType, result.task);
        }
        return result;
    };

    window.deleteTask = function(levelId, taskType, card, modalId) {
        let taskName = `Tâche ${taskType}`;

        switch (taskType) {
            case 'C1':   taskName = "Tâche 1 élément manquant (C1)"; break;
            case 'C2':   taskName = "Tâche 2 éléments manquants (C2)"; break;
            case 'ID':   taskName = "Tâche Identification (ID)"; break;
            case 'MEMB': taskName = "Tâche Appartenance (MEMB)"; break;
            case 'REC':  taskName = "Tâche Récupération (REC)"; break;
        }

        openTaskDeleteModal(levelId, taskType, card, modalId, taskName);
    };

});
