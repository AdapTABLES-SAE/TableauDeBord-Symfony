import { saveTask, openTaskDeleteModal } from "./task_actions.js";

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

    // Effet de petite transition
    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    /* =============================
       PARAMÈTRES DU NIVEAU
       ============================= */

    // Tables travaillées (du niveau)
    let tables = [];
    try {
        tables = JSON.parse(levelCard.dataset.tables || "[]");
    } catch {
        tables = [];
    }
    if (!Array.isArray(tables) || !tables.length) {
        tables = ["1"]; // fallback
    }

    const table = pickRandom(tables, 1);

    // Intervalle min/max
    const min = parseInt(levelCard.dataset.intervalMin || "1", 10);
    const max = parseInt(levelCard.dataset.intervalMax || "10", 10);
    const operand = randInt(min, max);

    // Résultat
    const result = table * operand;

    // Position de l'égal
    let equalPos = levelCard.dataset.equalPosition || "RIGHT"; // LEFT | RIGHT | MIX
    if (equalPos === "MIX") {
        equalPos = Math.random() < 0.5 ? "LEFT" : "RIGHT";
    }

    // Position du facteur
    let factorPos = levelCard.dataset.factorPosition || "OPERAND_TABLE"; // OPERAND_TABLE | TABLE_OPERAND | MIX
    if (factorPos === "MIX") {
        factorPos = Math.random() < 0.5 ? "OPERAND_TABLE" : "TABLE_OPERAND";
    }

    /* =============================
       PARAMÈTRES DE LA TÂCHE
       ============================= */

    const target =
        document.querySelector('input[name="c1_target"]:checked')?.value
        || "RESULT"; // OPERAND | TABLE | RESULT

    const isChoiceMode = document.getElementById("c1_mod_choice")?.checked;
    const nbIncorrectSlider = document.getElementById("c1_nbIncorrect");
    const nbIncorrect = nbIncorrectSlider
        ? parseInt(nbIncorrectSlider.value, 10) || 2
        : 2;

    /* =============================
       CONSTRUCTION DE L'ÉQUATION
       ============================= */

    const H = `<span class="preview-hidden">?</span>`;

    const tableVal = table;
    const operandVal = operand;

    let leftFactorVal;
    let rightFactorVal;

    if (factorPos === "OPERAND_TABLE") {
        leftFactorVal = operandVal;
        rightFactorVal = tableVal;
    } else {
        // TABLE_OPERAND
        leftFactorVal = tableVal;
        rightFactorVal = operandVal;
    }

    let leftFactorDisp = leftFactorVal;
    let rightFactorDisp = rightFactorVal;
    let resultDisp = result;

    // Détermination de la bonne réponse (selon l'élément masqué)
    let correctAnswer = result;

    if (target === "OPERAND") {
        correctAnswer = operandVal;
        if (leftFactorVal === operandVal && rightFactorVal !== operandVal) {
            leftFactorDisp = H;
        } else if (rightFactorVal === operandVal) {
            rightFactorDisp = H;
        } else {
            leftFactorDisp = H; // fallback
        }
    } else if (target === "TABLE") {
        correctAnswer = tableVal;
        if (leftFactorVal === tableVal && rightFactorVal !== tableVal) {
            leftFactorDisp = H;
        } else if (rightFactorVal === tableVal) {
            rightFactorDisp = H;
        } else {
            leftFactorDisp = H; // fallback
        }
    } else if (target === "RESULT") {
        correctAnswer = result;
        resultDisp = H;
    }

    const leftSide = `${leftFactorDisp} × ${rightFactorDisp}`;
    const rightSide = `${resultDisp}`;

    let equation = "";
    if (equalPos === "LEFT") {
        // résultat à gauche
        equation = `${rightSide} = ${leftSide}`;
    } else {
        // RIGHT
        equation = `${leftSide} = ${rightSide}`;
    }

    eq.innerHTML = equation;

    /* =============================
       OPTIONS / INPUT
       ============================= */

    optBox.innerHTML = "";

    if (isChoiceMode) {
        // Génération des mauvaises réponses
        const optionsSet = new Set();
        optionsSet.add(String(correctAnswer));

        while (optionsSet.size < nbIncorrect + 1) {
            let delta = randInt(-10, 10);
            if (delta === 0) delta = 1;
            const candidate = Math.max(0, correctAnswer + delta);
            optionsSet.add(String(candidate));
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
        // Mode saisie
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

    /* ---------- Radios élément recherché ---------- */
    const radios = document.querySelectorAll('input[name="c1_target"]');
    radios.forEach(r => {
        r.checked = false;
        r.closest(".task-chip")?.classList.remove("active");
    });

    /* ---------- Switches modalité ---------- */
    const switchChoice = document.getElementById("c1_mod_choice");
    const switchInput  = document.getElementById("c1_mod_input");

    if (switchChoice) switchChoice.checked = false;
    if (switchInput)  switchInput.checked  = false;

    /* ---------- Sliders ---------- */
    const nbIncSlider = document.getElementById("c1_nbIncorrect");
    const timeSlider  = document.getElementById("c1_time");
    const succSlider  = document.getElementById("c1_successes");

    const nbIncVal = document.getElementById("c1_nbIncorrect_value");
    const timeVal  = document.getElementById("c1_time_value");
    const succVal  = document.getElementById("c1_successes_value");

    /* ======================================================
       REMPLISSAGE (EXISTANT OU DÉFAUT)
       ====================================================== */

    if (task) {
        const firstTarget = task.targets?.[0] ?? "RESULT";
        const targetRadio = document.querySelector(
            `input[name="c1_target"][value="${firstTarget}"]`
        );
        if (targetRadio) {
            targetRadio.checked = true;
            targetRadio.closest(".task-chip")?.classList.add("active");
        }

        if (task.answerModality === "CHOICE") {
            if (switchChoice) switchChoice.checked = true;
        } else {
            if (switchInput) switchInput.checked = true;
        }

        if (nbIncSlider) {
            nbIncSlider.value = task.nbIncorrectChoices ?? 3;
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        }

        if (timeSlider) {
            timeSlider.value = task.timeMaxSecond ?? 30;
            if (timeVal) timeVal.textContent = timeSlider.value;
        }

        if (succSlider) {
            succSlider.value = task.successiveSuccessesToReach ?? 1;
            if (succVal) succVal.textContent = succSlider.value;
        }
    } else {
        const resRadio = document.getElementById("c1_target_result");
        if (resRadio) {
            resRadio.checked = true;
            resRadio.closest(".task-chip")?.classList.add("active");
        }

        if (switchInput) switchInput.checked = true;

        if (nbIncSlider) {
            nbIncSlider.value = 3;
            if (nbIncVal) nbIncVal.textContent = "3";
        }
        if (timeSlider) {
            timeSlider.value = 30;
            if (timeVal) timeVal.textContent = "30";
        }
        if (succSlider) {
            succSlider.value = 1;
            if (succVal) succVal.textContent = "1";
        }
    }

    /* ======================================================
       EVENTS → PREVIEW LIÉ AU NIVEAU (card)
       ====================================================== */

    // Radios
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            radios.forEach(x => x.closest(".task-chip")?.classList.remove("active"));
            radio.closest(".task-chip")?.classList.add("active");
            generateC1Preview(card);
        });
    });

    // Switches exclusifs
    function enforceSwitchExclusivity(event) {
        if (!switchChoice || !switchInput) return;

        if (event.target === switchChoice && switchChoice.checked) {
            switchInput.checked = false;
        } else if (event.target === switchInput && switchInput.checked) {
            switchChoice.checked = false;
        }

        if (!switchChoice.checked && !switchInput.checked) {
            switchInput.checked = true;
        }

        generateC1Preview(card);
    }

    if (switchChoice) switchChoice.addEventListener("change", enforceSwitchExclusivity);
    if (switchInput)  switchInput.addEventListener("change", enforceSwitchExclusivity);

    // Sliders
    if (nbIncSlider && nbIncVal) {
        nbIncSlider.oninput = () => {
            nbIncVal.textContent = nbIncSlider.value;
            generateC1Preview(card);
        };
    }

    if (timeSlider && timeVal) {
        timeSlider.oninput = () => {
            timeVal.textContent = timeSlider.value;
            generateC1Preview(card);
        };
    }

    if (succSlider && succVal) {
        succSlider.oninput = () => {
            succVal.textContent = succSlider.value;
            generateC1Preview(card);
        };
    }

    /* ---------- Supprimer ---------- */
    const deleteBtn = document.getElementById("c1_deleteBtn");
    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");

            // MODIFICATION DU ONCLICK
            deleteBtn.onclick = () => {
                openTaskDeleteModal(
                    levelId,
                    "C1",
                    card,
                    "taskModalC1",
                    "Tâche 1 élément manquant (C1)"
                );
            };

        } else {
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    /* ---------- Enregistrer ---------- */
    const confirmBtn = document.getElementById("c1_confirmBtn");
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const selectedRadio = document.querySelector('input[name="c1_target"]:checked');
            const selectedTarget = selectedRadio ? selectedRadio.value : "RESULT";

            const modality =
                switchChoice && switchChoice.checked
                    ? "CHOICE"
                    : "INPUT";

            const payload = {
                taskType: "C1",
                targets: [selectedTarget],
                answerModality: modality,
                nbIncorrectChoices: nbIncSlider ? parseInt(nbIncSlider.value, 10) : 3,
                timeMaxSecond: timeSlider ? parseInt(timeSlider.value, 10) : 30,
                successiveSuccessesToReach: succSlider ? parseInt(succSlider.value, 10) : 1
            };

            await saveTask(levelId, payload, card, "C1", "taskModalC1");
        };
    }

    /* ---------- AFFICHAGE MODALE + PREVIEW INITIAL ---------- */

    const modal = new bootstrap.Modal(modalEl);
    generateC1Preview(card);
    modal.show();
}
