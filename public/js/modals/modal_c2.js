import { saveTask, openTaskDeleteModal, requestTaskSave } from "./task_actions.js";

/* ======================================================
   OUTIL : récupération du contexte du niveau
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

    const equalPosition  = ctx.equalPosition  || "RIGHT";
    const factorPosition = ctx.factorPosition || "OPERAND_TABLE";

    return {
        tables,
        min,
        max,
        equalPosition,
        factorPosition,
    };
}

/* ======================================================
   OUTIL : MAUVAISES RÉPONSES COHÉRENTES
   ====================================================== */

function generateSmartWrongValues(correctPair, count, context, target, leftVal, rightVal, result, isLeftTable) {
    const values = new Set(correctPair);

    // Empêche toute répétition
    const avoid = new Set(correctPair);

    while (values.size < count + correctPair.length) {

        let candidate;

        const rand = Math.random();

        /* ---------------------------------------------------------
           35% : variation légère ±1 / ±2 autour d’un des bons nombres
        --------------------------------------------------------- */
        if (rand < 0.35) {
            const base = correctPair[Math.floor(Math.random() * correctPair.length)];
            const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 2) + 1);
            candidate = base + delta;
        }

        /* ---------------------------------------------------------
           25% : opérandes valides dans l’intervalle du niveau
        --------------------------------------------------------- */
        else if (rand < 0.60) {
            candidate = Math.floor(Math.random() * (context.max - context.min + 1)) + context.min;
        }

        /* ---------------------------------------------------------
           25% : “produits plausibles” = proches du résultat
        --------------------------------------------------------- */
        else if (rand < 0.85) {
            const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 3) + 1);
            candidate = result + delta;
        }

        /* ---------------------------------------------------------
           15% : bruit plus large mais cohérent
        --------------------------------------------------------- */
        else {
            const base = correctPair[Math.floor(Math.random() * correctPair.length)];
            const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 5) + 3);
            candidate = base + delta;
        }

        if (candidate <= 0) continue;
        if (avoid.has(candidate)) continue;

        // Empêche de créer une réponse "presque correcte" selon la logique de la tâche
        if (target === "OPERAND_TABLE") {
            // on évite de reproduire exactement un facteur correct
            if (candidate === leftVal || candidate === rightVal) continue;
        }

        if (target === "OPERAND_RESULT") {
            // éviter un résultat valide
            if (candidate === result) continue;
        }

        if (target === "TABLE_RESULT") {
            // éviter de donner la table correcte
            if (candidate === (isLeftTable ? leftVal : rightVal)) continue;
        }

        values.add(candidate);
    }

    return Array.from(values);
}

/* ======================================================
   PRÉVISUALISATION C2
   ====================================================== */

function generateC2Preview() {
    const eq     = document.querySelector("#c2_preview_content .preview-equation");
    const optBox = document.querySelector("#c2_preview_content .preview-options");
    const hint   = document.querySelector("#c2_preview_content .preview-hint");

    if (!eq || !optBox || !hint) return;

    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    const ctx = getLevelContext();

    /* Tirage d’un fait conforme au niveau */
    const table = ctx.tables[Math.floor(Math.random() * ctx.tables.length)];
    const operand = Math.floor(Math.random() * (ctx.max - ctx.min + 1)) + ctx.min;
    const result = table * operand;

    /* Position du facteur */
    let factorPos = ctx.factorPosition;
    if (factorPos === "MIX") {
        factorPos = Math.random() < 0.5 ? "OPERAND_TABLE" : "TABLE_OPERAND";
    }

    let leftVal, rightVal, isLeftTable;

    if (factorPos === "OPERAND_TABLE") {
        leftVal = operand;
        rightVal = table;
        isLeftTable = false;
    } else {
        leftVal = table;
        rightVal = operand;
        isLeftTable = true;
    }

    /* Position de l’égal */
    let equalPos = ctx.equalPosition;
    if (equalPos === "MIX") {
        equalPos = Math.random() < 0.5 ? "LEFT" : "RIGHT";
    }

    /* Cible de la tâche */
    const target =
        document.querySelector('input[name="c2_target"]:checked')?.value ||
        "OPERAND_TABLE";

    const unknown = { left: false, right: false, result: false };

    if (target === "OPERAND_TABLE") {
        unknown.left = true;
        unknown.right = true;
    }
    else if (target === "OPERAND_RESULT") {
        unknown.result = true;
        unknown[isLeftTable ? "right" : "left"] = true;
    }
    else if (target === "TABLE_RESULT") {
        unknown.result = true;
        unknown[isLeftTable ? "left" : "right"] = true;
    }

    const H = `<span class="preview-hidden">?</span>`;
    const span = v => `<span>${v}</span>`;

    /* Rend l’équation selon la position de l’égal */
    let html = "";

    if (equalPos === "RIGHT") {
        html = `${unknown.left ? H : span(leftVal)} × ${unknown.right ? H : span(rightVal)} = ${unknown.result ? H : span(result)}`;
    } else {
        html = `${unknown.result ? H : span(result)} = ${unknown.left ? H : span(leftVal)} × ${unknown.right ? H : span(rightVal)}`;
    }

    eq.innerHTML = html;

    /* Détermination de la paire correcte */
    let correctPair = [];

    if (target === "OPERAND_TABLE") {
        correctPair = [leftVal, rightVal];
    }
    else if (target === "OPERAND_RESULT") {
        const operandDisplay = isLeftTable ? rightVal : leftVal;
        correctPair = [operandDisplay, result];
    }
    else if (target === "TABLE_RESULT") {
        const tableDisplay = isLeftTable ? leftVal : rightVal;
        correctPair = [tableDisplay, result];
    }

    /* Génération intelligente */
    const nbIncorrect = parseInt(document.getElementById("c2_nbIncorrect")?.value || "3", 10);

    const values = generateSmartWrongValues(
        correctPair,
        nbIncorrect,
        ctx,
        target,
        leftVal,
        rightVal,
        result,
        isLeftTable
    );

    /* Mélange + rendu scène Zelda */
    optBox.innerHTML = "";

    const all = values.sort(() => Math.random() - 0.5);
    const half = Math.ceil(all.length / 2);

    const topRow = document.createElement("div");
    topRow.className = "c2-orb-row c2-orb-row-top";

    const bottomRow = document.createElement("div");
    bottomRow.className = "c2-orb-row c2-orb-row-bottom";

    all.slice(0, half).forEach((v, i) => {
        const orb = document.createElement("div");
        orb.className = "c2-orb preview-option-btn";
        orb.textContent = v;
        topRow.appendChild(orb);
        setTimeout(() => orb.classList.add("show"), 60 + i * 70);
    });

    all.slice(half).forEach((v, i) => {
        const orb = document.createElement("div");
        orb.className = "c2-orb preview-option-btn";
        orb.textContent = v;
        bottomRow.appendChild(orb);
        setTimeout(() => orb.classList.add("show"), 60 + (i + half) * 70);
    });

    optBox.appendChild(topRow);
    optBox.appendChild(bottomRow);

    hint.textContent =
        "Deux des résultats correspondront aux éléments manquants de la multiplication ci-dessus.";
}

/* ======================================================
   OUVERTURE DE LA MODALE C2
   ====================================================== */

export function openC2Modal(levelId, task, card) {
    window.CURRENT_LEVEL_CONTEXT = {
        tables: (() => {
            try {
                const arr = JSON.parse(card.dataset.tables || "[]");
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        })(),
        equalPosition: card.dataset.equalPosition || "RIGHT",
        factorPosition: card.dataset.factorPosition || "OPERAND_TABLE",
        intervalMin: parseInt(card.dataset.intervalMin || "1", 10),
        intervalMax: parseInt(card.dataset.intervalMax || "10", 10),
    };

    const modalEl = document.getElementById("taskModalC2");
    if (!modalEl) return;

    document.getElementById("c2_levelId").value = levelId;

    const radios = document.querySelectorAll('input[name="c2_target"]');
    const nbIncSlider = document.getElementById("c2_nbIncorrect");
    const timeSlider  = document.getElementById("c2_time");
    const succSlider  = document.getElementById("c2_successes");

    const nbIncVal = document.getElementById("c2_nbIncorrect_value");
    const timeVal  = document.getElementById("c2_time_value");
    const succVal  = document.getElementById("c2_successes_value");

    /* RESET VISUEL */
    radios.forEach(r => {
        r.checked = false;
        r.closest(".task-chip")?.classList.remove("active");
    });

    /* PRÉ-REMPLISSAGE */
    if (task) {
        const radio = document.querySelector(`input[name="c2_target"][value="${task.targets?.[0]}"]`);
        if (radio) {
            radio.checked = true;
            radio.closest(".task-chip")?.classList.add("active");
        }
        nbIncSlider.value = task.nbIncorrectChoices;
        nbIncVal.textContent = nbIncSlider.value;

        timeSlider.value = task.timeMaxSecond;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach;
        succVal.textContent = succSlider.value;
    } else {
        const def = document.querySelector('input[name="c2_target"][value="OPERAND_TABLE"]');
        def.checked = true;
        def.closest(".task-chip")?.classList.add("active");

        nbIncSlider.value = 3;
        nbIncVal.textContent = "3";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    /* LISTENERS */
    radios.forEach(r => {
        r.addEventListener("change", () => {
            radios.forEach(x => x.closest(".task-chip")?.classList.remove("active"));
            r.closest(".task-chip")?.classList.add("active");
            generateC2Preview();
        });
    });

    nbIncSlider.oninput = () => {
        nbIncVal.textContent = nbIncSlider.value;
        generateC2Preview();
    };
    timeSlider.oninput = () => {
        timeVal.textContent = timeSlider.value;
        generateC2Preview();
    };
    succSlider.oninput = () => {
        succVal.textContent = succSlider.value;
        generateC2Preview();
    };

    /* SUPPRESSION */
    const deleteBtn = document.getElementById("c2_deleteBtn");

    if (deleteBtn) {
        if (task && task.id) {
            // Si la tâche existe, on affiche le bouton
            deleteBtn.classList.remove("d-none");

            deleteBtn.onclick = () => {
                openTaskDeleteModal(
                    levelId,
                    "C2",
                    card,
                    "taskModalC2",
                    "Tâche 2 éléments manquants (C2)"
                );
            };

        } else {
            // Si c'est une création, pas de bouton supprimer
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    /* ENREGISTREMENT */
    const confirmBtn = document.getElementById("c2_confirmBtn");
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const targetInput = document.querySelector('input[name="c2_target"]:checked');
            const target = targetInput ? targetInput.value : "RESULT";

            const payload = {
                taskType: "C2",
                targets: [target],
                nbIncorrectChoices: parseInt(nbIncSlider.value, 10),
                timeMaxSecond: parseInt(timeSlider.value, 10),
                successiveSuccessesToReach: parseInt(succSlider.value, 10),
            };

            requestTaskSave(async () => {
                await saveTask(levelId, payload, card, "C2", "taskModalC2");
            });
        };
    }

    /* Lancement */
    const modal = new bootstrap.Modal(modalEl);
    generateC2Preview();
    modal.show();
}
