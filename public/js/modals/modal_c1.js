import { saveTask, openTaskDeleteModal, requestTaskSave } from "./task_actions.js";

/* ======================================================
   FONCTIONS UTILITAIRES
   ====================================================== */

function randInt(min, max) {
    const a = parseInt(min, 10);
    const b = parseInt(max, 10);
    if (isNaN(a) || isNaN(b)) return 1;
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

function pickRandom(arr, fallback = 1) {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    const idx = Math.floor(Math.random() * arr.length);
    const raw = arr[idx];
    const num = parseInt(raw, 10);
    return isNaN(num) ? fallback : num;
}

/* ======================================================
   FONCTION DE PRÉVISUALISATION
   ====================================================== */

function generateC1Preview(levelCard) {
    const eq = document.querySelector("#c1_preview_content .preview-equation");
    const optBox = document.querySelector("#c1_preview_content .preview-options");
    const hint = document.querySelector("#c1_preview_content .preview-hint");

    if (!eq || !optBox || !hint || !levelCard) return;

    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    /* --- PARAMÈTRES DU NIVEAU --- */
    let tables = [];
    try { tables = JSON.parse(levelCard.dataset.tables || "[]"); } catch { tables = []; }
    if (!Array.isArray(tables) || !tables.length) tables = ["1"];

    const table = pickRandom(tables, 1);
    const min = parseInt(levelCard.dataset.intervalMin || "1", 10);
    const max = parseInt(levelCard.dataset.intervalMax || "10", 10);
    const operand = randInt(min, max);
    const result = table * operand;

    let equalPos = levelCard.dataset.equalPosition || "RIGHT";
    if (equalPos === "MIX") equalPos = Math.random() < 0.5 ? "LEFT" : "RIGHT";

    let factorPos = levelCard.dataset.factorPosition || "OPERAND_TABLE";
    if (factorPos === "MIX") factorPos = Math.random() < 0.5 ? "OPERAND_TABLE" : "TABLE_OPERAND";

    /* --- PARAMÈTRES DE LA TÂCHE --- */
    const target = document.querySelector('input[name="c1_target"]:checked')?.value || "RESULT";

    // IMPORTANT : On récupère l'élément en direct pour être sûr d'avoir le bon état
    const currentChoiceSwitch = document.getElementById("c1_mod_choice");
    const isChoiceMode = currentChoiceSwitch ? currentChoiceSwitch.checked : false;

    const nbIncorrectSlider = document.getElementById("c1_nbIncorrect");
    const nbIncorrect = nbIncorrectSlider ? (parseInt(nbIncorrectSlider.value, 10) || 2) : 2;

    /* --- CONSTRUCTION DE L'ÉQUATION --- */
    const H = `<span class="preview-hidden">?</span>`;
    let leftFactorVal, rightFactorVal;

    if (factorPos === "OPERAND_TABLE") {
        leftFactorVal = operand; rightFactorVal = table;
    } else {
        leftFactorVal = table; rightFactorVal = operand;
    }

    let leftFactorDisp = leftFactorVal;
    let rightFactorDisp = rightFactorVal;
    let resultDisp = result;
    let correctAnswer = result;

    if (target === "OPERAND") {
        correctAnswer = operand;
        if (leftFactorVal === operand && rightFactorVal !== operand) leftFactorDisp = H;
        else if (rightFactorVal === operand) rightFactorDisp = H;
        else leftFactorDisp = H;
    } else if (target === "TABLE") {
        correctAnswer = table;
        if (leftFactorVal === table && rightFactorVal !== table) leftFactorDisp = H;
        else if (rightFactorVal === table) rightFactorDisp = H;
        else leftFactorDisp = H;
    } else if (target === "RESULT") {
        correctAnswer = result;
        resultDisp = H;
    }

    let equation = "";
    if (equalPos === "LEFT") {
        equation = `<strong>${resultDisp}</strong> <span class="mx-1">=</span> ${leftFactorDisp} <span class="mx-1">×</span> ${rightFactorDisp}`;
    } else {
        equation = `${leftFactorDisp} <span class="mx-1">×</span> ${rightFactorDisp} <span class="mx-1">=</span> <strong>${resultDisp}</strong>`;
    }

    eq.innerHTML = equation;

    /* --- OPTIONS / INPUT --- */
    optBox.innerHTML = "";

    if (isChoiceMode) {
        // Mode CHOIX
        const optionsSet = new Set();
        optionsSet.add(String(correctAnswer));
        while (optionsSet.size < nbIncorrect + 1) {
            let delta = randInt(-10, 10);
            if (delta === 0) delta = 1;
            optionsSet.add(String(Math.max(0, correctAnswer + delta)));
        }
        let options = Array.from(optionsSet).map(v => parseInt(v, 10));
        options.sort(() => Math.random() - 0.5);

        options.forEach((value, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "preview-option-btn";
            btn.textContent = value;
            optBox.appendChild(btn);
            setTimeout(() => btn.classList.add("show"), 50 + 80 * i);
        });
        hint.textContent = "L’élève doit cliquer sur la bonne réponse.";
    } else {
        // Mode SAISIE
        const input = document.createElement("input");
        input.className = "preview-input";
        input.placeholder = "Votre réponse…";
        optBox.appendChild(input);
        hint.textContent = "L’élève saisit directement la réponse.";
    }
}

/* ======================================================
   OUVERTURE ET GESTION DE LA MODALE C1
   ====================================================== */

export function openC1Modal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalC1");
    if (!modalEl) return;

    const levelInput = document.getElementById("c1_levelId");
    if (levelInput) levelInput.value = levelId;

    /* -----------------------------------------------------------
       1. NETTOYAGE ET CLONAGE (CRITIQUE POUR ÉVITER LES BUGS)
       ----------------------------------------------------------- */

    // On clone d'abord pour supprimer les anciens écouteurs d'événements
    // et on met à jour les références pour travailler sur les éléments vivants.

    // A. Switches Modalité
    let switchChoice = document.getElementById("c1_mod_choice");
    let switchInput  = document.getElementById("c1_mod_input");

    if (switchChoice && switchInput) {
        const newSwitchChoice = switchChoice.cloneNode(true);
        switchChoice.parentNode.replaceChild(newSwitchChoice, switchChoice);
        switchChoice = newSwitchChoice; // MAJ référence

        const newSwitchInput = switchInput.cloneNode(true);
        switchInput.parentNode.replaceChild(newSwitchInput, switchInput);
        switchInput = newSwitchInput; // MAJ référence
    }

    // B. Radios Targets
    const oldRadios = document.querySelectorAll('input[name="c1_target"]');
    oldRadios.forEach(radio => {
        const newRadio = radio.cloneNode(true);
        radio.parentNode.replaceChild(newRadio, radio);
    });
    // On re-sélectionne la liste propre
    const radios = document.querySelectorAll('input[name="c1_target"]');

    // C. Sliders
    const nbIncSlider = document.getElementById("c1_nbIncorrect");
    const nbIncVal    = document.getElementById("c1_nbIncorrect_value");
    const timeSlider  = document.getElementById("c1_time");
    const timeVal     = document.getElementById("c1_time_value");
    const succSlider  = document.getElementById("c1_successes");
    const succVal     = document.getElementById("c1_successes_value");


    /* -----------------------------------------------------------
       2. LOGIQUE D'INTERFACE (ETAT VISUEL)
       ----------------------------------------------------------- */

    const updateUiState = () => {
        if (!switchChoice || !switchInput) return;

        // 1. Gestion stricte de l'exclusivité (Checkbox -> Comportement Radio)
        if (switchChoice.checked) {
            // Si Choix est coché, Saisie DOIT être décoché
            if (switchInput.checked) switchInput.checked = false;
        } else {
            // Si Choix est décoché, Saisie DOIT être coché (force un choix)
            if (!switchInput.checked) switchInput.checked = true;
        }

        // 2. Griser le slider "Mauvaises réponses" si nécessaire
        if (nbIncSlider) {
            const sliderBlock = nbIncSlider.closest('.task-slider-block') || nbIncSlider.parentElement;

            if (switchChoice.checked) {
                // MODE CHOIX : Slider Actif
                nbIncSlider.disabled = false;
                if (sliderBlock) {
                    sliderBlock.style.opacity = "1";
                    sliderBlock.style.pointerEvents = "auto";
                }
            } else {
                // MODE SAISIE : Slider Grisé
                nbIncSlider.disabled = true;
                if (sliderBlock) {
                    sliderBlock.style.opacity = "0.4";
                    sliderBlock.style.pointerEvents = "none";
                }
            }
        }

        // 3. Mise à jour de l'aperçu
        generateC1Preview(card);
    };


    /* -----------------------------------------------------------
       3. ATTACHEMENT DES ÉVÉNEMENTS (LISTENERS)
       ----------------------------------------------------------- */

    if (switchChoice && switchInput) {
        // Clic sur "Choix"
        switchChoice.addEventListener("change", () => {
            // La logique d'exclusivité est gérée dans updateUiState
            updateUiState();
        });

        // Clic sur "Saisie"
        switchInput.addEventListener("change", () => {
            // Si on coche Saisie, on décoche Choix manuellement avant l'update
            // pour guider la logique
            if (switchInput.checked) {
                switchChoice.checked = false;
            } else {
                switchChoice.checked = true;
            }
            updateUiState();
        });
    }

    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            radios.forEach(r => r.closest(".task-chip")?.classList.remove("active"));
            radio.closest(".task-chip")?.classList.add("active");
            generateC1Preview(card);
        });
    });

    if (nbIncSlider) nbIncSlider.oninput = () => {
        if(nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        generateC1Preview(card);
    };
    if (timeSlider) timeSlider.oninput = () => {
        if(timeVal) timeVal.textContent = timeSlider.value;
        generateC1Preview(card);
    };
    if (succSlider) succSlider.oninput = () => {
        if(succVal) succVal.textContent = succSlider.value;
        generateC1Preview(card);
    };


    /* -----------------------------------------------------------
       4. REMPLISSAGE DES DONNÉES (INIT)
       ----------------------------------------------------------- */

    if (task) {
        // Cible
        const firstTarget = task.targets?.[0] ?? "RESULT";
        const targetRadio = document.querySelector(`input[name="c1_target"][value="${firstTarget}"]`);
        if (targetRadio) {
            targetRadio.checked = true;
            radios.forEach(r => r.closest(".task-chip")?.classList.remove("active"));
            targetRadio.closest(".task-chip")?.classList.add("active");
        }

        // Modalité
        if (switchChoice && switchInput) {
            if (task.answerModality === "CHOICE") {
                switchChoice.checked = true;
                switchInput.checked = false;
            } else {
                switchChoice.checked = false;
                switchInput.checked = true;
            }
        }

        // Sliders
        if (nbIncSlider) { nbIncSlider.value = task.nbIncorrectChoices ?? 3; if (nbIncVal) nbIncVal.textContent = nbIncSlider.value; }
        if (timeSlider) { timeSlider.value = task.timeMaxSecond ?? 30; if (timeVal) timeVal.textContent = timeSlider.value; }
        if (succSlider) { succSlider.value = task.successiveSuccessesToReach ?? 1; if (succVal) succVal.textContent = succSlider.value; }

    } else {
        // DÉFAUT
        const resRadio = document.getElementById("c1_target_result");
        radios.forEach(r => r.closest(".task-chip")?.classList.remove("active"));
        if (resRadio) { resRadio.checked = true; resRadio.closest(".task-chip")?.classList.add("active"); }

        if (switchChoice && switchInput) {
            switchChoice.checked = false;
            switchInput.checked = true;
        }

        if (nbIncSlider) { nbIncSlider.value = 3; if (nbIncVal) nbIncVal.textContent = "3"; }
        if (timeSlider) { timeSlider.value = 30; if (timeVal) timeVal.textContent = "30"; }
        if (succSlider) { succSlider.value = 1; if (succVal) succVal.textContent = "1"; }
    }

    // Appel initial pour caler l'interface (griser ou non)
    updateUiState();


    /* -----------------------------------------------------------
       5. BOUTONS ACTION (SUPPRIMER / ENREGISTRER)
       ----------------------------------------------------------- */

    /* ---------- Supprimer ---------- */
    const deleteBtn = document.getElementById("c1_deleteBtn");
    if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        if (task && task.id) {
            newDeleteBtn.classList.remove("d-none");

            newDeleteBtn.onclick = () => {
                // 1. On vérifie l'état global
                const isDirty = (typeof window.isUnsaved === 'function') && window.isUnsaved();

                // Debug console pour vérifier
                console.log("Clic Supprimer. Modifications en cours ?", isDirty);

                if (isDirty) {
                    // CAS A : Changements en cours
                    // -> On ouvre la modale JAUNE
                    window.checkUnsavedChanges(async () => {
                        // Si l'utilisateur valide (Save ou Ignore), on supprime DIRECTEMENT
                        // (On saute la modale rouge)
                        await window.deleteTaskDirectly(levelId, "C1", "taskModalC1");
                    });

                } else {
                    // CAS B : Pas de changements
                    // -> On ouvre la modale ROUGE classique
                    openTaskDeleteModal(
                        levelId,
                        "C1",
                        card,
                        "taskModalC1",
                        "Tâche 1 élément manquant (C1)"
                    );
                }
            };
        } else {
            newDeleteBtn.classList.add("d-none");
        }
    }

    /* ---------- Enregistrer ---------- */
    const confirmBtn = document.getElementById("c1_confirmBtn");
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.onclick = () => {
            const selectedRadio = document.querySelector('input[name="c1_target"]:checked');
            const selectedTarget = selectedRadio ? selectedRadio.value : "RESULT";

            // Sécurité pour la modalité
            const choiceSwitch = document.getElementById("c1_mod_choice");
            const modality = (choiceSwitch && choiceSwitch.checked) ? "CHOICE" : "INPUT";

            const payload = {
                taskType: "C1",
                targets: [selectedTarget],
                answerModality: modality,
                nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 3,
                timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 30,
                successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
            };

            // 1. On vérifie les changements non sauvegardés (Notre nouvelle modale)
            window.checkUnsavedChanges(() => {

                // 2. Si c'est bon, on vérifie la sécurité élèves (requestTaskSave)
                requestTaskSave(async () => {

                    // 3. Enfin, on sauvegarde la tâche
                    await saveTask(levelId, payload, card, "C1", "taskModalC1");
                });
            });
        };
    }

    /* -----------------------------------------------------------
       6. OUVERTURE MODALE
       ----------------------------------------------------------- */
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}
