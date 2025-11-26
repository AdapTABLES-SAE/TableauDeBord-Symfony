import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   FONCTION DE PRÉVISUALISATION
   ====================================================== */

function generateC2Preview() {
    const eq = document.querySelector("#c2_preview_content .preview-equation");
    const optBox = document.querySelector("#c2_preview_content .preview-options");
    const hint = document.querySelector("#c2_preview_content .preview-hint");

    if (!eq || !optBox || !hint) return;

    // petite anim sur l’équation
    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    // valeurs de base
    const table  = Math.floor(Math.random() * 10) + 1; // "table"
    const factor = Math.floor(Math.random() * 10) + 1; // "opérande"
    const result = table * factor;

    const target = document.querySelector('input[name="c2_target"]:checked')?.value || "OPERAND_TABLE";
    const H = `<span class="preview-hidden">?</span>`;
    let equation = "";

    // équation générique affichée en haut
    switch (target) {
        case "OPERAND_TABLE":   // opérande & table masqués
            equation = `${H} × ${H} = ${result}`;
            break;
        case "OPERAND_RESULT":  // opérande & résultat masqués
            equation = `${H} × ${table} = ${H}`;
            break;
        case "TABLE_RESULT":    // table & résultat masqués
            equation = `${H} × ${factor} = ${H}`;
            break;
    }
    eq.innerHTML = equation;

    // ----------------- Génération des propositions -----------------
    optBox.innerHTML = "";

    const nbIncSlider = document.getElementById("c2_nbIncorrect");
    const nbIncorrect = parseInt(nbIncSlider?.value || "3", 10); // 3..6
    const totalChoices = nbIncorrect + 1; // 1 bonne + nbIncorrect mauvaises

    // bonne réponse (toujours la même valeur logique mais on l’adapte au texte)
    const correct = { table, factor, result };

    // génère des candidates "equation" complètes
    const candidates = [];

    // on commence par la bonne
    candidates.push(correct);

    // puis on génère des mauvaises (produit faux)
    while (candidates.length < totalChoices) {
        let t2 = Math.floor(Math.random() * 10) + 1;
        let f2 = Math.floor(Math.random() * 10) + 1;
        let r2 = Math.floor(Math.random() * 100) + 1; // volontairement libre

        // on évite de retomber exactement sur la bonne combinaison
        if (t2 === table && f2 === factor && r2 === result) continue;
        // on évite les cas qui seraient exactement corrects pour la tâche choisie
        if (target === "OPERAND_TABLE" && t2 * f2 === result) continue;
        if (target === "OPERAND_RESULT" && t2 * table === r2) continue;
        if (target === "TABLE_RESULT" && table * factor === r2 && t2 === table) continue;

        candidates.push({ table: t2, factor: f2, result: r2 });
    }

    // mélange
    candidates.sort(() => Math.random() - 0.5);

    // rendu des boutons, en texte complet "a × b = c" selon la cible
    candidates.forEach((c, i) => {
        let label;
        switch (target) {
            case "OPERAND_TABLE":
                label = `${c.table} × ${c.factor} = ${result}`;
                break;
            case "OPERAND_RESULT":
                label = `${c.factor} × ${table} = ${c.result}`;
                break;
            case "TABLE_RESULT":
                label = `${c.table} × ${factor} = ${c.result}`;
                break;
        }

        const btn = document.createElement("button");
        btn.className = "preview-option-btn";
        btn.textContent = label;
        optBox.appendChild(btn);

        setTimeout(() => btn.classList.add("show"), 80 + i * 80);
    });

    hint.textContent = "L’élève doit choisir l’équation qui complète correctement les deux valeurs manquantes.";
}

/* ======================================================
   OUVERTURE DE LA MODALE C2
   ====================================================== */
export function openC2Modal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalC2");
    if (!modalEl) return;

    // ID du niveau
    const levelInput = document.getElementById("c2_levelId");
    if (levelInput) levelInput.value = levelId;

    const radios = document.querySelectorAll('input[name="c2_target"]');

    const nbIncSlider = document.getElementById("c2_nbIncorrect");
    const timeSlider  = document.getElementById("c2_time");
    const succSlider  = document.getElementById("c2_successes");

    const nbIncVal = document.getElementById("c2_nbIncorrect_value");
    const timeVal  = document.getElementById("c2_time_value");
    const succVal  = document.getElementById("c2_successes_value");

    // ---------- Pré-remplissage ----------
    if (task) {
        const target = task.targets?.[0] ?? "OPERAND_TABLE";
        const radioEl = document.querySelector(`input[name="c2_target"][value="${target}"]`);
        if (radioEl) {
            radioEl.checked = true;
            radioEl.closest(".task-chip")?.classList.add("active");
        }

        if (nbIncSlider) {
            nbIncSlider.value = task.nbIncorrectChoices ?? 3;
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
        // valeurs par défaut pour nouvelle tâche
        const defaultRadio = document.querySelector('input[name="c2_target"][value="OPERAND_TABLE"]');
        if (defaultRadio) {
            defaultRadio.checked = true;
            defaultRadio.closest(".task-chip")?.classList.add("active");
        }

        if (nbIncSlider) {
            nbIncSlider.value = 3;
            if (nbIncVal) nbIncVal.textContent = "3";
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

    // ---------- radios → visuel + preview ----------
    radios.forEach(r => {
        r.addEventListener("change", () => {
            radios.forEach(x => x.closest(".task-chip")?.classList.remove("active"));
            r.closest(".task-chip")?.classList.add("active");
            generateC2Preview();
        });
    });

    // ---------- sliders → texte + preview ----------
    if (nbIncSlider && nbIncVal) {
        nbIncSlider.oninput = () => {
            nbIncVal.textContent = nbIncSlider.value;
            generateC2Preview();
        };
    }
    if (timeSlider && timeVal) {
        timeSlider.oninput = () => {
            timeVal.textContent = timeSlider.value;
            generateC2Preview();
        };
    }
    if (succSlider && succVal) {
        succSlider.oninput = () => {
            succVal.textContent = succSlider.value;
            // pas forcément utile pour l’aperçu, mais on peut regénérer
            generateC2Preview();
        };
    }

    // ---------- suppression ----------
    const deleteBtn = document.getElementById("c2_deleteBtn");
    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");
            deleteBtn.onclick = () => deleteTask(levelId, "C2", card, "taskModalC2");
        } else {
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    // ---------- confirmation ----------
    const confirmBtn = document.getElementById("c2_confirmBtn");
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const target = document.querySelector('input[name="c2_target"]:checked').value;

            const payload = {
                taskType: "C2",
                targets: [target],
                nbIncorrectChoices: parseInt(nbIncSlider.value, 10),
                timeMaxSecond: parseInt(timeSlider.value, 10),
                successiveSuccessesToReach: parseInt(succSlider.value, 10)
            };

            await saveTask(levelId, payload, card, "C2", "taskModalC2");
        };
    }

    const modal = new bootstrap.Modal(modalEl);
    generateC2Preview();
    modal.show();
}
