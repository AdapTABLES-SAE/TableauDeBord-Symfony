// public/js/modals/modal_id.js

import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   OUTIL : contexte du niveau (comme pour C2 / REC)
   ====================================================== */
function getLevelContext() {
    const ctx = window.CURRENT_LEVEL_CONTEXT || {};

    let tables = Array.isArray(ctx.tables) ? ctx.tables : [];
    tables = tables
        .map(v => parseInt(v, 10))
        .filter(v => !Number.isNaN(v));

    if (!tables.length) {
        tables = [2, 3, 4, 5, 6, 7, 8, 9];
    }

    let min = parseInt(ctx.intervalMin ?? "1", 10);
    let max = parseInt(ctx.intervalMax ?? "10", 10);

    if (Number.isNaN(min)) min = 1;
    if (Number.isNaN(max)) max = 10;
    if (min > max) [min, max] = [max, min];

    return { tables, min, max };
}

/* ======================================================
   FONCTION SÉCURISÉE : retourne RESULT ou OPERAND
   ====================================================== */
function getSourceVariation() {
    const swResult = document.getElementById("id_var_result");
    const swOperand = document.getElementById("id_var_operand");

    // sécurité : si aucun activé → forcer RESULT
    if (!swResult.checked && !swOperand.checked) {
        swResult.checked = true;
    }

    return swOperand.checked ? "OPERAND" : "RESULT";
}

/* ======================================================
   Génération d’un fait pour ID
   ====================================================== */
function buildIdFact(ctx, source, isCorrect) {
    const table = ctx.tables[Math.floor(Math.random() * ctx.tables.length)];
    const operand = Math.floor(Math.random() * (ctx.max - ctx.min + 1)) + ctx.min;
    const trueResult = table * operand;

    let a = table;
    let b = operand;
    let r = trueResult;

    if (!isCorrect) {
        if (source === "RESULT") {
            // faux résultat
            let fake;
            do {
                const delta = (Math.floor(Math.random() * 7) - 3) || 1; // -3..+3 sauf 0
                fake = trueResult + delta;
            } while (fake <= 0 || fake === trueResult);
            r = fake;

        } else {
            // faux facteur
            if (Math.random() < 0.5) {
                let newTable;
                do {
                    newTable = ctx.tables[Math.floor(Math.random() * ctx.tables.length)];
                } while (newTable === table);
                a = newTable;
            } else {
                let newOperand;
                do {
                    newOperand = Math.floor(Math.random() * (ctx.max - ctx.min + 1)) + ctx.min;
                } while (newOperand === operand);

                b = newOperand;
            }
        }
    }

    return { a, b, r, isCorrect };
}

/* ======================================================
   PREVIEW — ID
   ====================================================== */
function generateIdPreview() {
    const grid = document.querySelector("#id_preview_content .preview-grid");
    const hint = document.querySelector("#id_preview_content .preview-hint");

    if (!grid || !hint) return;

    grid.innerHTML = "";

    const ctx = getLevelContext();

    const nbFactsSlider = document.getElementById("id_nbFacts");
    const nbFacts = nbFactsSlider ? parseInt(nbFactsSlider.value || "1", 10) : 1;

    const source = getSourceVariation();

    const facts = [];
    for (let i = 0; i < nbFacts; i++) {
        const isCorrect = Math.random() < 0.5;
        facts.push(buildIdFact(ctx, source, isCorrect));
    }

    facts.forEach((fact, index) => {
        const item = document.createElement("div");
        item.className = "preview-item";

        const eqSpan = document.createElement("span");
        eqSpan.className = "preview-eq";
        eqSpan.textContent = `${fact.a} × ${fact.b} = ${fact.r}`;

        const tag = document.createElement("span");
        tag.className = fact.isCorrect ? "tag-ok" : "tag-ko";
        tag.textContent = fact.isCorrect ? "Vrai" : "Faux";

        item.appendChild(eqSpan);
        item.appendChild(tag);
        grid.appendChild(item);

        setTimeout(() => item.classList.add("show"), 80 + index * 80);
    });

    hint.textContent =
        source === "RESULT"
            ? "Certains résultats ont été modifiés. L’élève doit identifier les faits vrais."
            : "Certains opérandes ont été modifiés. L’élève doit toucher les faits vrais.";
}

/* ======================================================
   OPEN MODAL ID
   ====================================================== */
export function openIdModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalID");
    if (!modalEl) return;

    window.CURRENT_LEVEL_CONTEXT = {
        tables: (() => {
            try {
                const arr = JSON.parse(card.dataset.tables || "[]");
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        })(),
        intervalMin: parseInt(card.dataset.intervalMin || "1", 10),
        intervalMax: parseInt(card.dataset.intervalMax || "10", 10)
    };

    const levelInput = document.getElementById("id_levelId");
    if (levelInput) levelInput.value = levelId;

    const nbFactsSlider = document.getElementById("id_nbFacts");
    const timeSlider = document.getElementById("id_time");
    const succSlider = document.getElementById("id_successes");

    const nbFactsVal = document.getElementById("id_nbFacts_value");
    const timeVal = document.getElementById("id_time_value");
    const succVal = document.getElementById("id_successes_value");

    const switchResult = document.getElementById("id_var_result");
    const switchOperand = document.getElementById("id_var_operand");

    /* ------------------ Remplissage ------------------ */
    if (task) {
        nbFactsSlider.value = task.nbFacts ?? 1;
        nbFactsVal.textContent = nbFactsSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;

        const src = task.sourceVariation ?? "RESULT";
        switchOperand.checked = src === "OPERAND";
        switchResult.checked = src !== "OPERAND";

    } else {
        nbFactsSlider.value = 2;
        nbFactsVal.textContent = "2";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";

        switchResult.checked = true;
        switchOperand.checked = false;
    }

    /* ------------------ Exclusivité switches ------------------ */
    function enforceSwitches(e) {
        if (e.target === switchResult && switchResult.checked) {
            switchOperand.checked = false;
        }
        if (e.target === switchOperand && switchOperand.checked) {
            switchResult.checked = false;
        }

        // sécurité : jamais 0 actif
        getSourceVariation();

        generateIdPreview();
    }

    switchResult.onchange = enforceSwitches;
    switchOperand.onchange = enforceSwitches;

    /* ------------------ Sliders ------------------ */
    nbFactsSlider.oninput = () => {
        nbFactsVal.textContent = nbFactsSlider.value;
        generateIdPreview();
    };

    timeSlider.oninput = () => {
        timeVal.textContent = timeSlider.value;
        generateIdPreview();
    };

    succSlider.oninput = () => {
        succVal.textContent = succSlider.value;
        generateIdPreview();
    };

    /* ------------------ DELETE ------------------ */
    const deleteBtn = document.getElementById("id_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () =>
            deleteTask(levelId, "ID", card, "taskModalID");
    } else {
        deleteBtn.classList.add("d-none");
        deleteBtn.onclick = null;
    }

    /* ------------------ CONFIRM ------------------ */
    const confirmBtn = document.getElementById("id_confirmBtn");
    confirmBtn.onclick = async () => {
        const src = getSourceVariation();

        const payload = {
            taskType: "ID",
            sourceVariation: src,
            nbFacts: parseInt(nbFactsSlider.value, 10),
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "ID", "taskModalID");
    };

    /* ------------------ OUVERTURE ------------------ */
    const modal = new bootstrap.Modal(modalEl);
    generateIdPreview();
    modal.show();
}
