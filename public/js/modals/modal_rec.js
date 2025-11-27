// public/js/modals/modal_rec.js

import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================================
   CONTEXTE DU NIVEAU (même principe que C2)
   ====================================================================== */

function getLevelContext() {
    const ctx = window.CURRENT_LEVEL_CONTEXT || {};

    // tables : array de chaînes -> nombres
    let tables = Array.isArray(ctx.tables) ? ctx.tables : [];
    tables = tables
        .map(v => parseInt(v, 10))
        .filter(v => !Number.isNaN(v));

    // fallback : tables "classiques"
    if (!tables.length) {
        tables = [2, 3, 4, 5, 6, 7, 8, 9];
    }

    let min = parseInt(ctx.intervalMin ?? "1", 10);
    let max = parseInt(ctx.intervalMax ?? "10", 10);

    if (Number.isNaN(min)) min = 1;
    if (Number.isNaN(max)) max = 10;
    if (min > max) [min, max] = [max, min];

    return {
        tables,
        min,
        max
    };
}

/* ======================================================================
   PREVIEW — Reconstitution d’un fait (REC)
   ====================================================================== */

function generateRecPreview() {
    const eq   = document.querySelector("#rec_preview_content .preview-equation");
    const opt  = document.querySelector("#rec_preview_content .preview-options");
    const hint = document.querySelector("#rec_preview_content .preview-hint");

    if (!eq || !opt || !hint) return;

    // petite anim sur l’équation
    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    const ctx = getLevelContext();

    // -------- Fact correct, respectant le niveau --------
    const table = ctx.tables[Math.floor(Math.random() * ctx.tables.length)];
    const factor = Math.floor(Math.random() * (ctx.max - ctx.min + 1)) + ctx.min;
    const result = table * factor;

    const H = `<span class="preview-hidden">?</span>`;

    // Pour REC : les trois éléments sont à reconstituer -> 3 ?
    eq.innerHTML = `${H} × ${H} = ${H}`;

    // -------- Nombre d’éléments incorrects --------
    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const nbIncorrect = parseInt(nbIncSlider?.value || "2", 10); // 2..5
    const totalTokens = nbIncorrect + 3; // 3 bons + nbIncorrect faux

    opt.innerHTML = "";

    // -------- valeurs correctes --------
    const correctValues = [table, factor, result];

    const numbersSet = new Set(correctValues);

    // -------- pool de fausses valeurs "intelligentes" --------
    const candidatePool = [];

    // autour de l’opérande
    candidatePool.push(factor - 1, factor + 1, factor + 2, factor - 2);

    // autour de la table
    candidatePool.push(table - 1, table + 1);

    // autour du résultat (autres produits plausibles)
    candidatePool.push(result - table, result + table);
    candidatePool.push(result - factor, result + factor);

    // Nettoyage : >0, entiers
    const cleanedPool = candidatePool.filter(
        v => Number.isFinite(v) && v > 0 && Number.isInteger(v)
    );

    for (const val of cleanedPool) {
        if (numbersSet.size >= totalTokens) break;
        if (!numbersSet.has(val)) numbersSet.add(val);
    }

    // Compléter si besoin avec quelques nombres proches du résultat
    while (numbersSet.size < totalTokens) {
        const offset = (Math.floor(Math.random() * 7) - 3); // -3..+3
        const candidate = Math.max(1, result + offset * table);

        if (!numbersSet.has(candidate)) {
            numbersSet.add(candidate);
        }
    }

    const allValues = Array.from(numbersSet).sort(() => Math.random() - 0.5);

    // -------- Mise en page : deux rangées d’orbes --------
    const half = Math.ceil(allValues.length / 2);
    const topValues = allValues.slice(0, half);
    const bottomValues = allValues.slice(half);

    const topRow = document.createElement("div");
    topRow.className = "rec-orb-row rec-orb-row-top";

    const bottomRow = document.createElement("div");
    bottomRow.className = "rec-orb-row rec-orb-row-bottom";

    topValues.forEach((v, idx) => {
        const orb = document.createElement("div");
        orb.className = "rec-orb preview-option-btn";
        orb.textContent = v;
        topRow.appendChild(orb);

        setTimeout(() => orb.classList.add("show"), 80 + idx * 60);
    });

    bottomValues.forEach((v, idx) => {
        const orb = document.createElement("div");
        orb.className = "rec-orb preview-option-btn";
        orb.textContent = v;
        bottomRow.appendChild(orb);

        setTimeout(
            () => orb.classList.add("show"),
            80 + (idx + topValues.length) * 60
        );
    });

    opt.appendChild(topRow);
    if (bottomValues.length) {
        opt.appendChild(bottomRow);
    }

    // -------- Texte d’aide --------
    hint.textContent =
        "Sélectionne les trois éléments corrects (table, facteur, résultat) pour reconstituer totalement la multiplication.";
}

/* ======================================================================
   OUVERTURE DE LA MODALE REC
   ====================================================================== */

export function openRecModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalREC");
    if (!modalEl) return;

    // Contexte du niveau (pour generateRecPreview, comme C2)
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

    const levelInput = document.getElementById("rec_levelId");
    if (levelInput) levelInput.value = levelId;

    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const timeSlider  = document.getElementById("rec_time");
    const succSlider  = document.getElementById("rec_successes");

    const nbIncVal = document.getElementById("rec_nbIncorrect_value");
    const timeVal  = document.getElementById("rec_time_value");
    const succVal  = document.getElementById("rec_successes_value");

    /* -------- Remplissage (task existante) -------- */
    if (task) {
        if (nbIncSlider) {
            nbIncSlider.value = task.nbIncorrectChoices ?? 2;
            if (nbIncVal) nbIncVal.textContent = nbIncSlider.value;
        }

        if (timeSlider) {
            timeSlider.value = task.timeMaxSecond ?? 20;
            if (timeVal) timeVal.textContent = timeSlider.value;
        }

        if (succSlider) {
            succSlider.value = task.successiveSuccessesToReach ?? 1;
            if (succVal) succVal.textContent = succSlider.value;
        }
    } else {
        /* -------- Valeurs par défaut -------- */
        if (nbIncSlider) {
            nbIncSlider.value = 2;
            if (nbIncVal) nbIncVal.textContent = "2";
        }
        if (timeSlider) {
            timeSlider.value = 20;
            if (timeVal) timeVal.textContent = "20";
        }
        if (succSlider) {
            succSlider.value = 1;
            if (succVal) succVal.textContent = "1";
        }
    }

    /* -------- Sliders dynamiques → preview -------- */
    if (nbIncSlider && nbIncVal) {
        nbIncSlider.oninput = () => {
            nbIncVal.textContent = nbIncSlider.value;
            generateRecPreview();
        };
    }

    if (timeSlider && timeVal) {
        timeSlider.oninput = () => {
            timeVal.textContent = timeSlider.value;
            generateRecPreview();
        };
    }

    if (succSlider && succVal) {
        succSlider.oninput = () => {
            succVal.textContent = succSlider.value;
            generateRecPreview();
        };
    }

    /* -------- Suppression -------- */
    const deleteBtn = document.getElementById("rec_deleteBtn");
    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");
            deleteBtn.onclick = () =>
                deleteTask(levelId, "REC", card, "taskModalREC");
        } else {
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    /* -------- Confirmation -------- */
    const confirmBtn = document.getElementById("rec_confirmBtn");
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const payload = {
                taskType: "REC",
                nbIncorrectChoices: nbIncSlider
                    ? parseInt(nbIncSlider.value, 10)
                    : 2,
                timeMaxSecond: timeSlider
                    ? parseInt(timeSlider.value, 10)
                    : 20,
                successiveSuccessesToReach: succSlider
                    ? parseInt(succSlider.value, 10)
                    : 1
            };

            await saveTask(levelId, payload, card, "REC", "taskModalREC");
        };
    }

    /* -------- OUVERTURE -------- */
    const modal = new bootstrap.Modal(modalEl);
    generateRecPreview();
    modal.show();
}
