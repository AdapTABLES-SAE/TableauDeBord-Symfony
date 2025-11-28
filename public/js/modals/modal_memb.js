// public/js/modals/modal_memb.js
import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   OUTIL : contexte du niveau (table + intervalle)
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
   Génère un résultat incorrect cohérent
   - NE DOIT PAS appartenir à la table sélectionnée
   ====================================================== */
function generateFakeResult(table, min, max, trueResultsSet) {
    let fake;
    let attempts = 0;

    while (true) {
        attempts++;

        // Faux résultat plausible — entre 1 et table*max
        fake = Math.floor(Math.random() * (table * max + 10)) + 1;

        // Conditions pour éviter les ambiguïtés :
        if (!trueResultsSet.has(fake)) break;
        if (attempts > 50) {
            fake = fake + 1; // fallback extrême
            break;
        }
    }

    return fake;
}

/* ======================================================
   PREVIEW — MEMB (aperçu réaliste)
   ====================================================== */
function generateMembPreview() {
    const container = document.getElementById("memb_preview_content");
    if (!container) return;

    const grid = container.querySelector(".preview-grid");
    const hint = container.querySelector(".preview-hint");
    const title = container.querySelector(".preview-title");

    if (!grid || !hint) return;
    grid.innerHTML = "";

    const ctx = getLevelContext();

    // choisir une table aléatoire du niveau
    const table = ctx.tables[Math.floor(Math.random() * ctx.tables.length)];

    // slider values
    const nbCorrectSlider = document.getElementById("memb_nbCorrect");
    const nbIncorrectSlider = document.getElementById("memb_nbIncorrect");
    const switchIncorrect = document.getElementById("memb_incorrect");

    const nbCorrect = Math.max(1, parseInt(nbCorrectSlider?.value || "1", 10));
    const nbIncorrect = Math.max(
        1,
        parseInt(nbIncorrectSlider?.value || "1", 10)
    );

    const total = nbCorrect + nbIncorrect;
    const targetIncorrect = !!switchIncorrect?.checked;

    // texte dépendant du mode
    if (title) {
        title.textContent = `Résultats de la table de ${table}`;
    }

    const trueResults = [];
    const trueResultsSet = new Set();

    // Génère la liste complète des résultats corrects sur l’intervalle
    for (let i = ctx.min; i <= ctx.max; i++) {
        const r = table * i;
        trueResults.push(r);
        trueResultsSet.add(r);
    }

    // Tirage de nbCorrect résultats corrects
    const selectedCorrect = [];
    const correctCopy = [...trueResults];

    for (let i = 0; i < nbCorrect && correctCopy.length > 0; i++) {
        const pick = Math.floor(Math.random() * correctCopy.length);
        selectedCorrect.push(correctCopy[pick]);
        correctCopy.splice(pick, 1);
    }

    // Tirage de faux résultats sans ambiguïté
    const selectedFake = [];
    for (let i = 0; i < nbIncorrect; i++) {
        selectedFake.push(generateFakeResult(table, ctx.min, ctx.max, trueResultsSet));
    }

    // Mélange final
    const tokens = [
        ...selectedCorrect.map(v => ({ value: v, correct: true })),
        ...selectedFake.map(v => ({ value: v, correct: false }))
    ];

    tokens.sort(() => Math.random() - 0.5);

    // Affichage visuel type "potion"
    tokens.forEach((tok, idx) => {
        const orb = document.createElement("div");
        orb.className = "memb-orb";

        orb.innerHTML = `
            <span class="memb-number">${tok.value}</span>
            <span class="memb-tag ${tok.correct ? "tag-ok" : "tag-ko"}">
                ${tok.correct ? "Vrai" : "Faux"}
            </span>
        `;

        grid.appendChild(orb);

        setTimeout(() => orb.classList.add("show"), 80 + idx * 60);
    });

    // texte d’aide
    if (targetIncorrect) {
        hint.textContent =
            "Sélectionne uniquement les résultats incorrects appartenant à cette table.";
    } else {
        hint.textContent =
            "Sélectionne uniquement les résultats corrects appartenant à cette table.";
    }
}

/* ======================================================
   MODALE MEMB
   ====================================================== */
export function openMembModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalMEMB");
    if (!modalEl) return;

    // Contexte du niveau
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

    const levelInput = document.getElementById("memb_levelId");
    if (levelInput) levelInput.value = levelId;

    const switchCorrect = document.getElementById("memb_correct");
    const switchIncorrect = document.getElementById("memb_incorrect");

    const nbCorrectSlider = document.getElementById("memb_nbCorrect");
    const nbIncorrectSlider = document.getElementById("memb_nbIncorrect");
    const timeSlider = document.getElementById("memb_time");
    const succSlider = document.getElementById("memb_successes");

    const nbCorrectVal = document.getElementById("memb_nbCorrect_value");
    const nbIncorrectVal = document.getElementById("memb_nbIncorrect_value");
    const timeVal = document.getElementById("memb_time_value");
    const succVal = document.getElementById("memb_successes_value");

    /* ---------- Remplissage ---------- */
    if (task) {
        const target = task.target ?? "CORRECT";

        switchCorrect.checked = target === "CORRECT";
        switchIncorrect.checked = target === "INCORRECT";

        nbCorrectSlider.value = String(task.nbCorrectChoices ?? 1);
        nbCorrectVal.textContent = nbCorrectSlider.value;

        nbIncorrectSlider.value = String(task.nbIncorrectChoices ?? 1);
        nbIncorrectVal.textContent = nbIncorrectSlider.value;

        timeSlider.value = String(task.timeMaxSecond ?? 20);
        timeVal.textContent = timeSlider.value;

        succSlider.value = String(task.successiveSuccessesToReach ?? 1);
        succVal.textContent = succSlider.value;
    } else {
        // defaults
        switchCorrect.checked = true;
        switchIncorrect.checked = false;

        nbCorrectSlider.value = "1";
        nbCorrectVal.textContent = "1";

        nbIncorrectSlider.value = "1";
        nbIncorrectVal.textContent = "1";

        timeSlider.value = "20";
        timeVal.textContent = "20";

        succSlider.value = "1";
        succVal.textContent = "1";
    }

    /* ---------- Exclusivité switches ---------- */
    function enforceExclusive(e) {
        if (e.target === switchCorrect) {
            switchCorrect.checked = true;
            switchIncorrect.checked = false;
        }
        if (e.target === switchIncorrect) {
            switchIncorrect.checked = true;
            switchCorrect.checked = false;
        }

        generateMembPreview();
    }

    switchCorrect.addEventListener("change", enforceExclusive);
    switchIncorrect.addEventListener("change", enforceExclusive);

    /* ---------- Sliders ---------- */
    nbCorrectSlider.oninput = () => {
        nbCorrectVal.textContent = nbCorrectSlider.value;
        generateMembPreview();
    };

    nbIncorrectSlider.oninput = () => {
        nbIncorrectVal.textContent = nbIncorrectSlider.value;
        generateMembPreview();
    };

    timeSlider.oninput = () => {
        timeVal.textContent = timeSlider.value;
    };

    succSlider.oninput = () => {
        succVal.textContent = succSlider.value;
    };

    /* ---------- Delete ---------- */
    const deleteBtn = document.getElementById("memb_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () =>
            deleteTask(levelId, "MEMB", card, "taskModalMEMB");
    } else {
        deleteBtn.classList.add("d-none");
        deleteBtn.onclick = null;
    }

    /* ---------- Confirm ---------- */
    const confirmBtn = document.getElementById("memb_confirmBtn");
    confirmBtn.onclick = async () => {
        const target =
            switchIncorrect.checked ? "INCORRECT" : "CORRECT";

        const payload = {
            taskType: "MEMB",
            target,
            nbCorrectChoices: parseInt(nbCorrectSlider.value, 10),
            nbIncorrectChoices: parseInt(nbIncorrectSlider.value, 10),
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "MEMB", "taskModalMEMB");
    };

    /* ---------- Preview + show ---------- */
    const modal = new bootstrap.Modal(modalEl);
    generateMembPreview();
    modal.show();
}
