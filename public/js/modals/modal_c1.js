import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   FONCTION DE PRÉVISUALISATION
   ====================================================== */

function generateC1Preview() {
    const previewEq = document.querySelector("#c1_preview_content .preview-equation");
    const previewOpt = document.querySelector("#c1_preview_content .preview-options");

    if (!previewEq || !previewOpt) return;

    // Exemple aléatoire
    const table = Math.floor(Math.random() * 10) + 1;
    const factor = Math.floor(Math.random() * 10) + 1;
    const result = table * factor;

    const selectedTarget = document.querySelector('input[name="c1_target"]:checked')?.value || "RESULT";

    const hide = `<span class="preview-hidden">?</span>`;
    let eqStr = "";

    if (selectedTarget === "OPERAND") {
        eqStr = `${hide} × ${factor} = ${result}`;
    } else if (selectedTarget === "TABLE") {
        eqStr = `${table} × ${hide} = ${result}`;
    } else {
        eqStr = `${table} × ${factor} = ${hide}`;
    }

    previewEq.innerHTML = eqStr;

    // Options (switch CHOICE / INPUT)
    const isChoice = document.getElementById("c1_mod_choice")?.checked;

    previewOpt.innerHTML = ""; // clean

    if (isChoice) {
        const nbInc = parseInt(document.getElementById("c1_nbIncorrect")?.value || "2", 10);

        let options = new Set([result]);

        while (options.size < nbInc + 1) {
            options.add(Math.floor(Math.random() * 90) + 1);
        }

        options = Array.from(options).sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            previewOpt.innerHTML += `<button class="preview-option-btn">${opt}</button>`;
        });

    } else {
        previewOpt.innerHTML = `
            <input class="preview-input" placeholder="Votre réponse…">
        `;
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
        r.closest('.task-chip')?.classList.remove('active');
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
        const targetRadio = document.querySelector(`input[name="c1_target"][value="${firstTarget}"]`);
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
       AJOUT DES generateC1Preview() PARTOUT
       ====================================================== */

    // Radios
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            radios.forEach(x => x.closest('.task-chip')?.classList.remove("active"));
            radio.closest('.task-chip')?.classList.add("active");

            generateC1Preview();
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

        generateC1Preview();
    }

    if (switchChoice) switchChoice.addEventListener("change", enforceSwitchExclusivity);
    if (switchInput)  switchInput.addEventListener("change", enforceSwitchExclusivity);

    // Sliders
    if (nbIncSlider && nbIncVal) {
        nbIncSlider.oninput = () => {
            nbIncVal.textContent = nbIncSlider.value;
            generateC1Preview();
        };
    }

    if (timeSlider && timeVal) {
        timeSlider.oninput = () => {
            timeVal.textContent = timeSlider.value;
            generateC1Preview();
        };
    }

    if (succSlider && succVal) {
        succSlider.oninput = () => {
            succVal.textContent = succSlider.value;
            generateC1Preview();
        };
    }

    /* ---------- Supprimer ---------- */
    const deleteBtn = document.getElementById("c1_deleteBtn");
    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");
            deleteBtn.onclick = () => deleteTask(levelId, "C1", card, "taskModalC1");
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

    /* ---------- AFFICHAGE MODALE + PREVIEW ---------- */

    const modal = new bootstrap.Modal(modalEl);
    generateC1Preview();
    modal.show();
}
