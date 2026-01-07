import { saveTask, openTaskDeleteModal } from "./task_actions.js";

/* ======================================================================
   CONTEXTE DU NIVEAU (même principe que pour C2)
   ====================================================================== */

function getLevelContext() {
    const ctx = window.CURRENT_LEVEL_CONTEXT || {};

    // tables : array -> nombres
    let tables = Array.isArray(ctx.tables) ? ctx.tables : [];
    tables = tables
        .map(v => parseInt(v, 10))
        .filter(v => !Number.isNaN(v));

    if (!tables.length) {
        tables = [2,3,4,5,6,7,8,9];
    }

    let min = parseInt(ctx.intervalMin ?? "1", 10);
    let max = parseInt(ctx.intervalMax ?? "10", 10);

    if (Number.isNaN(min)) min = 1;
    if (Number.isNaN(max)) max = 10;
    if (min > max) [min, max] = [max, min];

    return { tables, min, max };
}

/* ======================================================================
   Vérification de triples parasites
   ====================================================================== */
/**
 * Détecte s’il existe une autre triple valide dans tokens autre que targetTriple.
 */
function hasExtraValidTriple(tokens, ctx, targetTriple) {
    const targetKey = [...targetTriple].sort((a,b)=>a-b).join(",");

    const tablesSet = new Set(ctx.tables);
    const isOperand = (v)=> v>=ctx.min && v<=ctx.max;

    for (let i=0; i<tokens.length; i++) {
        for (let j=0; j<tokens.length; j++) {
            if (i===j) continue;
            const a = tokens[i];
            const b = tokens[j];

            const case1 = tablesSet.has(a) && isOperand(b);
            const case2 = tablesSet.has(b) && isOperand(a);
            if (!case1 && !case2) continue;

            const prod = a * b;

            for (let k=0; k<tokens.length; k++) {
                if (k===i || k===j) continue;
                if (tokens[k] !== prod) continue;

                const key = [a,b,prod].sort((x,y)=>x-y).join(",");
                if (key !== targetKey) return true;
            }
        }
    }
    return false;
}

/* ======================================================================
   Génération contrôlée de faux candidats
   ====================================================================== */

function generateFakeCandidate(ctx, table, factor, result) {
    const maxPossible = Math.max(...ctx.tables) * ctx.max;

    const r = Math.random();

    if (r < 0.33) {
        // proche de factor ou table
        const base = Math.random() < 0.5 ? table : factor;
        let delta = (Math.floor(Math.random()*5) - 2);
        if (delta === 0) delta = 3;
        let v = base + delta;
        if (v <= 0) v = base + 5;
        return v;
    }
    if (r < 0.66) {
        // proche du résultat
        let delta = (Math.floor(Math.random()*5) + 1);
        if (Math.random() < 0.5) delta = -delta;
        let v = result + delta;
        if (v <= 0) v = result + Math.abs(delta);
        return v;
    }

    // complètement hors zone
    return maxPossible + (10 + Math.floor(Math.random()*50));
}

/* ======================================================================
   PREVIEW REC — Version finale robuste
   ====================================================================== */

function generateRecPreview() {
    const eq   = document.querySelector("#rec_preview_content .preview-equation");
    const opt  = document.querySelector("#rec_preview_content .preview-options");
    const hint = document.querySelector("#rec_preview_content .preview-hint");
    if (!eq || !opt || !hint) return;

    eq.classList.add("updated");
    setTimeout(()=>eq.classList.remove("updated"),10);

    const ctx = getLevelContext();

    // ---------------- FAIT CORRECT ----------------
    const table  = ctx.tables[Math.floor(Math.random()*ctx.tables.length)];
    const factor = Math.floor(Math.random()*(ctx.max - ctx.min + 1)) + ctx.min;
    const result = table * factor;

    const correctTriple = [table, factor, result];

    const H = `<span class="preview-hidden">?</span>`;
    eq.innerHTML = `${H} × ${H} = ${H}`;

    const nbIncorrect = parseInt(document.getElementById("rec_nbIncorrect")?.value || "2",10);
    const totalTokens = nbIncorrect + 3;

    // ---------------- Construction du set final ----------------
    const tokens = [...correctTriple];
    const taken = new Set(tokens);

    const MAX_TRIES = 150;
    let tries = 0;

    while (tokens.length < totalTokens && tries < MAX_TRIES) {
        tries++;

        const cand = generateFakeCandidate(ctx, table, factor, result);
        if (taken.has(cand)) continue;

        tokens.push(cand);
        taken.add(cand);

        if (hasExtraValidTriple(tokens, ctx, correctTriple)) {
            // supprime — triple parasite détecté
            tokens.pop();
            taken.delete(cand);
        }
    }

    // ---------------- Mise en forme ----------------
    opt.innerHTML = "";

    const shuffled = [...tokens].sort(()=>Math.random()-0.5);
    const half = Math.ceil(shuffled.length / 2);

    const top = shuffled.slice(0, half);
    const bot = shuffled.slice(half);

    const topDiv = document.createElement("div");
    topDiv.className = "rec-orb-row rec-orb-row-top";

    const botDiv = document.createElement("div");
    botDiv.className = "rec-orb-row rec-orb-row-bottom";

    top.forEach((v,i)=>{
        const orb = document.createElement("div");
        orb.className = "rec-orb preview-option-btn";
        orb.textContent = v;
        topDiv.appendChild(orb);
        setTimeout(()=>orb.classList.add("show"),80 + i*60);
    });

    bot.forEach((v,i)=>{
        const orb = document.createElement("div");
        orb.className = "rec-orb preview-option-btn";
        orb.textContent = v;
        botDiv.appendChild(orb);
        setTimeout(()=>orb.classList.add("show"),80 + (i+top.length)*60);
    });

    opt.appendChild(topDiv);
    if (bot.length) opt.appendChild(botDiv);

    hint.textContent =
        "Sélectionne les trois éléments corrects (table, facteur, résultat) pour reconstituer totalement la multiplication.";
}

/* ======================================================================
   OPEN MODAL — REC
   ====================================================================== */

export function openRecModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalREC");
    if (!modalEl) return;

    // Contexte du niveau
    window.CURRENT_LEVEL_CONTEXT = {
        tables: (() => {
            try {
                return JSON.parse(card.dataset.tables || "[]");
            } catch {
                return [];
            }
        })(),
        intervalMin: parseInt(card.dataset.intervalMin || "1",10),
        intervalMax: parseInt(card.dataset.intervalMax || "10",10)
    };

    document.getElementById("rec_levelId").value = levelId;

    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const timeSlider  = document.getElementById("rec_time");
    const succSlider  = document.getElementById("rec_successes");

    const nbIncVal = document.getElementById("rec_nbIncorrect_value");
    const timeVal  = document.getElementById("rec_time_value");
    const succVal  = document.getElementById("rec_successes_value");

    // -------- Remplissage --------
    if (task) {
        nbIncSlider.value = task.nbIncorrectChoices ?? 2;
        nbIncVal.textContent = nbIncSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;
    } else {
        nbIncSlider.value = 2;
        nbIncVal.textContent = "2";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    nbIncSlider.oninput = () => {
        nbIncVal.textContent = nbIncSlider.value;
        generateRecPreview();
    };
    timeSlider.oninput = () => {
        timeVal.textContent = timeSlider.value;
        generateRecPreview();
    };
    succSlider.oninput = () => {
        succVal.textContent = succSlider.value;
        generateRecPreview();
    };

    // Suppression
    const deleteBtn = document.getElementById("rec_deleteBtn");

    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");

            deleteBtn.onclick = () => {
                openTaskDeleteModal(
                    levelId,
                    "REC",
                    card,
                    "taskModalREC",
                    "Tâche Récupération (REC)"
                );
            };

        } else {
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    // Confirmation
    const confirmBtn = document.getElementById("rec_confirmBtn");
    confirmBtn.onclick = async () => {
        const payload = {
            taskType: "REC",
            nbIncorrectChoices: parseInt(nbIncSlider.value,10),
            timeMaxSecond: parseInt(timeSlider.value,10),
            successiveSuccessesToReach: parseInt(succSlider.value,10)
        };
        await saveTask(levelId, payload, card, "REC", "taskModalREC");
    };

    const modal = new bootstrap.Modal(modalEl);
    generateRecPreview();
    modal.show();
}
