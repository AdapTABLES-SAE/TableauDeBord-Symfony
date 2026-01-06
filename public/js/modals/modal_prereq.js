// public/js/modals/modal_prereq.js

import { showToast } from "../toast/toast.js";

// Stockage local des données (Objectifs + Niveaux) pour éviter de recharger à chaque fois
let trainingData = [];
// ID du prérequis en cours d'édition (null = mode création)
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
        currentEditingId = null; // On passe en mode création
        if (modalTitle) modalTitle.textContent = "Ajouter un prérequis";
        confirmBtn.textContent = "Confirmer";

        resetForm();
        modal.style.display = "flex";

        // Chargement des données si premier clic
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
        const selectedObjId = parseInt(objSelect.value, 10);
        const objective = trainingData.find(o => o.id === selectedObjId);

        // Reset du niveau
        lvlSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un niveau...</option>';
        criteriaSec.style.display = "none";

        if (objective) {
            populateLevelSelect(objective.levels);
            lvlSelect.disabled = false;
        } else {
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

    // Mise à jour visuelle des sliders
    if (viewsRange && viewsVal) {
        viewsRange.addEventListener("input", () => viewsVal.textContent = viewsRange.value);
    }
    if (succRange && succVal) {
        succRange.addEventListener("input", () => succVal.textContent = succRange.value);
    }

    /* ============================================================
       3. CONFIRMATION (AJOUT OU MODIFICATION)
    ============================================================ */
    confirmBtn.addEventListener("click", async () => {
        // Déterminer l'URL : Ajout ou Édition ?
        let url = config.addPrerequisUrl;

        // Si on est en mode édition, on construit l'URL spécifique
        if (currentEditingId) {
            url = config.editPrerequisUrlTemplate.replace("__ID__", currentEditingId);
        }

        const payload = {
            targetObjectiveId: objSelect.value,
            targetLevelId: lvlSelect.value,
            views: viewsRange.value,
            success: succRange.value
        };

        // UI : Loading
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify(payload)
            });

            const json = await resp.json();

            if (json.success) {
                // A. Création du nouvel élément HTML (Badge)
                const temp = document.createElement("div");
                temp.innerHTML = json.html.trim();
                const newBadge = temp.firstElementChild;

                if (currentEditingId) {
                    // --- MODE ÉDITION : Remplacement ---
                    const oldBadge = document.getElementById(`prereq-badge-${currentEditingId}`);
                    if (oldBadge) {
                        oldBadge.replaceWith(newBadge);
                        showToast(true, "Prérequis mis à jour");
                    }
                } else {
                    // --- MODE AJOUT : Insertion à la fin + Scroll ---
                    listContainer.appendChild(newBadge);

                    // Petit délai pour laisser le DOM s'actualiser avant de scroller
                    setTimeout(() => {
                        listContainer.scrollTop = listContainer.scrollHeight;
                    }, 50);

                    showToast(true, "Prérequis ajouté");
                }

                // Fermeture de la modale
                modal.style.display = "none";

            } else {
                showToast(false, json.message || "Erreur lors de l'enregistrement");
            }

        } catch (e) {
            console.error(e);
            showToast(false, "Erreur de communication serveur");
        } finally {
            // Reset du bouton
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
       5. HELPERS & FONCTIONS GLOBALES
    ============================================================ */

    /**
     * Ouvre la modale en mode ÉDITION.
     * Cette fonction est attachée à window pour être appelée depuis le HTML (onclick).
     */
    window.openEditPrereq = async function(id, objDbId, lvlDbId, views, success) {
        const conf = window.OBJECTIVE_CONFIG || {};

        currentEditingId = id; // Mode Édition
        if (modalTitle) modalTitle.textContent = "Modifier le prérequis";
        confirmBtn.textContent = "Mettre à jour";

        modal.style.display = "flex";

        // 1. Charger les données si nécessaire
        if (trainingData.length === 0) {
            await loadData(conf.apiDataUrl);
        }

        // 2. Remplir le select des objectifs
        populateObjectiveSelect();

        // 3. Pré-remplir le formulaire avec les valeurs existantes
        // On utilise les IDs BDD (Database ID) passés par le bouton
        fillEditForm(objDbId, lvlDbId, views, success);
    };

    function fillEditForm(objId, lvlId, views, success) {
        // Sélection de l'objectif
        objSelect.value = objId;

        // On force le chargement des niveaux pour cet objectif
        const objective = trainingData.find(o => o.id === parseInt(objId));
        if (objective) {
            populateLevelSelect(objective.levels);
            lvlSelect.disabled = false;
        }

        // Sélection du niveau
        lvlSelect.value = lvlId;

        // Affichage et remplissage des critères
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
            const resp = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
            trainingData = await resp.json();
        } catch (e) {
            console.error("Erreur chargement données", e);
            showToast(false, "Impossible de charger les objectifs");
        } finally {
            objSelect.disabled = false;
        }
    }

    function populateObjectiveSelect() {
        objSelect.innerHTML = '<option value="" selected disabled>Sélectionnez un objectif...</option>';
        if (trainingData.length === 0) {
            const opt = document.createElement("option");
            opt.text = "Aucun autre objectif disponible";
            opt.disabled = true;
            objSelect.appendChild(opt);
            return;
        }
        trainingData.forEach(obj => {
            const opt = document.createElement("option");
            opt.value = obj.id;
            opt.textContent = obj.name;
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
            opt.textContent = lvl.name;
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
        // Le bouton est valide seulement si Objectif ET Niveau sont sélectionnés
        const isValid = objSelect.value !== "" && lvlSelect.value !== "";
        confirmBtn.disabled = !isValid;
    }
}

/* ============================================================
   SUPPRESSION GLOBALE (Attachée à window)
============================================================ */
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
                badge.style.transition = "all 0.3s ease";
                badge.style.opacity = '0';
                badge.style.transform = 'translateX(20px)';
                setTimeout(() => badge.remove(), 300);
            }
            showToast(true, "Prérequis supprimé");
        } else {
            showToast(false, "Erreur lors de la suppression");
        }
    } catch (e) {
        console.error(e);
        showToast(false, "Erreur réseau");
    }
};
