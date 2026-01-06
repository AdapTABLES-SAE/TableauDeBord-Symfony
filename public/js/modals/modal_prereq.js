// public/js/modals/modal_prereq.js

import { showToast } from "../toast/toast.js";

// Stockage local des données
let trainingData = [];
let currentEditingId = null;

export function initPrereqModal() {
    const config = window.OBJECTIVE_CONFIG || {};

    // --- ÉLÉMENTS DOM ---
    const modal         = document.getElementById("prerequisite-modal");
    const modalTitle    = modal?.querySelector(".modal-title");
    const openBtn       = document.getElementById("btn-open-prereq-modal");
    const closeBtns     = document.querySelectorAll(".btn-close-modal, .btn-cancel-prereq");
    const confirmBtn    = document.getElementById("confirm-prereq-btn");

    const objSelect     = document.getElementById("prereq-objective-select");
    const lvlSelect     = document.getElementById("prereq-level-select");
    const criteriaSec   = document.getElementById("prereq-criteria-section");

    const viewsRange    = document.getElementById("prereq-views-range");
    const viewsVal      = document.getElementById("prereq-views-value");
    const succRange     = document.getElementById("prereq-successes-range");
    const succVal       = document.getElementById("prereq-successes-value");

    const listContainer = document.getElementById("prerequisites-list");

    if (!modal || !openBtn) return;

    /* ============================================================
       1. OUVERTURE (MODE CRÉATION)
    ============================================================ */
    openBtn.addEventListener("click", async () => {
        currentEditingId = null;
        if (modalTitle) modalTitle.textContent = "Ajouter un prérequis";
        confirmBtn.textContent = "Confirmer";

        resetForm();
        modal.style.display = "flex";

        // Chargement des données au premier clic
        if (trainingData.length === 0) {
            await loadData(config.apiDataUrl);
        }

        populateObjectiveSelect();
    });

    /* ============================================================
       2. LOGIQUE DYNAMIQUE (Formulaire)
    ============================================================ */

    // Changement d'Objectif -> Charge les Niveaux
    objSelect.addEventListener("change", () => {
        const selectedObjId = objSelect.value;

        // Log de débogage pour voir ce qui est sélectionné
        console.log("Objectif sélectionné (ID):", selectedObjId);
        console.log("Données disponibles:", trainingData);

        // Utilisation de "==" (pas ===) pour matcher string vs int
        const objective = trainingData.find(o => o.id == selectedObjId);

        // Reset du niveau
        lvlSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un niveau...</option>';
        criteriaSec.style.display = "none";

        if (objective) {
            console.log("Objectif trouvé, chargement des niveaux:", objective.levels);
            populateLevelSelect(objective.levels);
            lvlSelect.disabled = false;
        } else {
            console.warn("Impossible de trouver l'objectif ID:", selectedObjId);
            lvlSelect.disabled = true;
        }
        checkValidity();
    });

    // Changement de Niveau -> Affiche les critères
    lvlSelect.addEventListener("change", () => {
        if (lvlSelect.value) {
            criteriaSec.style.display = "block";
        } else {
            criteriaSec.style.display = "none";
        }
        checkValidity();
    });

    // Sliders
    if (viewsRange && viewsVal) {
        viewsRange.addEventListener("input", () => viewsVal.textContent = viewsRange.value);
    }
    if (succRange && succVal) {
        succRange.addEventListener("input", () => succVal.textContent = succRange.value);
    }

    /* ============================================================
       3. CONFIRMATION
    ============================================================ */
    confirmBtn.addEventListener("click", async () => {
        let url = config.addPrerequisUrl;
        if (currentEditingId) {
            url = config.editPrerequisUrlTemplate.replace("__ID__", currentEditingId);
        }

        const payload = {
            targetObjectiveId: objSelect.value,
            targetLevelId: lvlSelect.value,
            views: viewsRange.value,
            success: succRange.value
        };

        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify(payload)
            });

            const json = await resp.json();

            if (json.success) {
                const temp = document.createElement("div");
                temp.innerHTML = json.html.trim();
                const newBadge = temp.firstElementChild;

                if (currentEditingId) {
                    const oldBadge = document.getElementById(`prereq-badge-${currentEditingId}`);
                    if (oldBadge) {
                        oldBadge.replaceWith(newBadge);
                        showToast(true, "Prérequis mis à jour");
                    }
                } else {
                    listContainer.appendChild(newBadge);
                    setTimeout(() => { listContainer.scrollTop = listContainer.scrollHeight; }, 50);
                    showToast(true, "Prérequis ajouté");
                }
                modal.style.display = "none";
            } else {
                showToast(false, json.message || "Erreur lors de l'enregistrement");
            }
        } catch (e) {
            console.error(e);
            showToast(false, "Erreur serveur");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
    });

    /* ============================================================
       4. FERMETURE
    ============================================================ */
    const closeModal = () => modal.style.display = "none";
    closeBtns.forEach(btn => btn.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });

    /* ============================================================
       5. HELPERS
    ============================================================ */

    // Fonction globale pour l'ouverture en édition
    window.openEditPrereq = async function(id, objDbId, lvlDbId, views, success) {
        const conf = window.OBJECTIVE_CONFIG || {};
        currentEditingId = id;

        if (modalTitle) modalTitle.textContent = "Modifier le prérequis";
        confirmBtn.textContent = "Mettre à jour";
        modal.style.display = "flex";

        // 1. Charger les données si vide
        if (trainingData.length === 0) {
            await loadData(conf.apiDataUrl);
        }

        // 2. Remplir objectifs
        populateObjectiveSelect();

        // 3. Pré-remplir formulaire
        fillEditForm(objDbId, lvlDbId, views, success);
    };

    function fillEditForm(objId, lvlId, views, success) {
        // Sélectionne l'objectif
        objSelect.value = objId;

        // Cherche l'objectif avec comparaison souple (==)
        const objective = trainingData.find(o => o.id == objId);

        // Reset niveaux
        lvlSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un niveau...</option>';

        if (objective) {
            populateLevelSelect(objective.levels);
            lvlSelect.disabled = false;

            // Sélectionne le niveau
            lvlSelect.value = lvlId;
        } else {
            console.warn("Mode Édition: Objectif non trouvé dans les données", objId);
            lvlSelect.disabled = true;
        }

        // Affiche la suite
        criteriaSec.style.display = "block";
        viewsRange.value = views;
        viewsVal.textContent = views;
        succRange.value = success;
        succVal.textContent = success;

        checkValidity();
    }

    async function loadData(url) {
        if (!url) return;
        objSelect.innerHTML = '<option>Chargement...</option>';
        objSelect.disabled = true;

        try {
            console.log("Chargement des données depuis:", url);
            const resp = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
            trainingData = await resp.json();
            console.log("Données chargées:", trainingData);
        } catch (e) {
            console.error("Erreur chargement données", e);
            showToast(false, "Impossible de charger les objectifs");
        } finally {
            objSelect.disabled = false;
        }
    }

    function populateObjectiveSelect() {
        objSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un objectif...</option>';

        if (!trainingData || trainingData.length === 0) {
            const opt = document.createElement("option");
            opt.text = "Aucun autre objectif disponible";
            opt.disabled = true;
            objSelect.appendChild(opt);
            return;
        }

        trainingData.forEach(obj => {
            const opt = document.createElement("option");
            opt.value = obj.id;

            const label = (obj.name && obj.name.trim() !== "") ? obj.name : `Objectif #${obj.id}`;
            opt.textContent = label;

            objSelect.appendChild(opt);
        });
    }

    function populateLevelSelect(levels) {
        lvlSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un niveau...</option>';

        if (!levels || levels.length === 0) {
            const opt = document.createElement("option");
            opt.text = "Aucun niveau";
            opt.disabled = true;
            lvlSelect.appendChild(opt);
            return;
        }

        levels.forEach(lvl => {
            const opt = document.createElement("option");
            opt.value = lvl.id;
            const label = (lvl.name && lvl.name.trim() !== "") ? lvl.name : `Niveau #${lvl.id}`;
            opt.textContent = label;

            lvlSelect.appendChild(opt);
        });
    }

    function resetForm() {
        objSelect.value = "";
        lvlSelect.innerHTML = '<option value="" selected disabled>Sélectionnez d\'abord un objectif</option>';
        lvlSelect.disabled = true;
        criteriaSec.style.display = "none";
        viewsRange.value = 0; viewsVal.textContent = "0";
        succRange.value = 0; succVal.textContent = "0";
        checkValidity();
    }

    function checkValidity() {
        const isValid = objSelect.value !== "" && lvlSelect.value !== "";
        confirmBtn.disabled = !isValid;
    }
}

// Fonction globale suppression
window.deletePrerequis = async function(id) {
    if (!confirm("Voulez-vous vraiment supprimer ce prérequis ?")) return;

    const config = window.OBJECTIVE_CONFIG || {};
    const url = config.deletePrerequisUrlTemplate.replace("__ID__", id);

    try {
        const resp = await fetch(url, {
            method: "DELETE",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });
        const json = await resp.json();

        if (json.success) {
            const badge = document.getElementById(`prereq-badge-${id}`);
            if (badge) {
                badge.style.opacity = '0';
                setTimeout(() => badge.remove(), 300);
            }
            showToast(true, "Prérequis supprimé");
        } else {
            showToast(false, "Erreur suppression");
        }
    } catch (e) {
        showToast(false, "Erreur réseau");
    }
};
