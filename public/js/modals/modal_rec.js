import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   PREVIEW — Reconstitution d'un fait (WOW)
   ====================================================== */
function generateRecPreview() {
    const eq = document.querySelector("#rec_preview_content .preview-equation");
    const opt = document.querySelector("#rec_preview_content .preview-options");
    const hint = document.querySelector("#rec_preview_content .preview-hint");

    if (!eq || !opt || !hint) return;

    // petite anim
    eq.classList.add("updated");
    setTimeout(() => eq.classList.remove("updated"), 10);

    // Génération d'un fait correct
    const table = Math.floor(Math.random() * 10) + 1;
    const factor = Math.floor(Math.random() * 10) + 1;
    const result = table * factor;

    const H = `<span class="preview-hidden">?</span>`;
    eq.innerHTML = `${H} × ${H} = ${H}`;

    // Nombre d’éléments incorrects
    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const nbIncorrect = parseInt(nbIncSlider?.value || "2", 10);

    // On construit la liste des propositions
    opt.innerHTML = "";

    // ---- valeurs correctes ----
    const correctValues = [
        { label: table, type: "TABLE" },
        { label: factor, type: "OPERAND" },
        { label: result, type: "RESULT" }
    ];

    const finalValues = [...correctValues];

    // ---- valeurs incorrectes ----
    while (finalValues.length < nbIncorrect + 3) {
        const fake = Math.floor(Math.random() * 90) + 1;

        if (fake !== table && fake !== factor && fake !== result) {
            finalValues.push({ label: fake, type: "FAKE" });
        }
    }

    // mélange
    finalValues.sort(() => Math.random() - 0.5);

    finalValues.forEach((v, i) => {
        const btn = document.createElement("button");
        btn.className = "preview-option-btn";
        btn.textContent = v.label;
        opt.appendChild(btn);

        // animation progressive
        setTimeout(() => btn.classList.add("show"), 80 + i * 80);
    });

    hint.textContent =
        "L’élève doit sélectionner les éléments corrects pour reconstituer la multiplication.";
}

/* ======================================================
   OUVERTURE DE LA MODALE REC
   ====================================================== */
export function openRecModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalREC");
    if (!modalEl) return;

    document.getElementById("rec_levelId").value = levelId;

    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const timeSlider = document.getElementById("rec_time");
    const succSlider = document.getElementById("rec_successes");

    const nbIncVal = document.getElementById("rec_nbIncorrect_value");
    const timeVal = document.getElementById("rec_time_value");
    const succVal = document.getElementById("rec_successes_value");

    /* -------- Remplissage (task existante) -------- */
    if (task) {
        nbIncSlider.value = task.nbIncorrectChoices ?? 2;
        nbIncVal.textContent = nbIncSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;
    } else {
        /* -------- Valeurs par défaut -------- */
        nbIncSlider.value = 2;
        nbIncVal.textContent = "2";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    /* -------- Sliders dynamiques → preview -------- */
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

    /* -------- Suppression -------- */
    const deleteBtn = document.getElementById("rec_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () =>
            deleteTask(levelId, "REC", card, "taskModalREC");
    } else {
        deleteBtn.classList.add("d-none");
        deleteBtn.onclick = null;
    }

    /* -------- Confirmation -------- */
    const confirmBtn = document.getElementById("rec_confirmBtn");
    confirmBtn.onclick = async () => {
        const payload = {
            taskType: "REC",
            nbIncorrectChoices: parseInt(nbIncSlider.value, 10),
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "REC", "taskModalREC");
    };

    /* -------- OUVERTURE -------- */
    const modal = new bootstrap.Modal(modalEl);
    generateRecPreview();
    modal.show();
}
