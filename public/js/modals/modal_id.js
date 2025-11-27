import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   PREVIEW — ID (WOW)
   ====================================================== */
function generateIdPreview() {
    const grid = document.querySelector("#id_preview_content .preview-grid");
    const hint = document.querySelector("#id_preview_content .preview-hint");
    if (!grid || !hint) return;

    grid.innerHTML = "";

    // nombre de faits
    const nbFacts = parseInt(
        document.getElementById("id_nbFacts")?.value || "1",
        10
    );

    // source variable (OPERAND ou RESULT)
    const opSwitch = document.getElementById("id_var_operand");
    const source = opSwitch?.checked ? "OPERAND" : "RESULT";

    for (let i = 0; i < nbFacts; i++) {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const res = a * b;

        let display;
        if (source === "OPERAND") {
            const fakeOperand = Math.floor(Math.random() * 10) + 1;
            display = `${fakeOperand} × ${b} = ${res}`;
        } else {
            const fakeResult = res + (Math.floor(Math.random() * 5) + 1);
            display = `${a} × ${b} = ${fakeResult}`;
        }

        const div = document.createElement("div");
        div.className = "preview-item";
        div.textContent = display;
        grid.appendChild(div);

        setTimeout(() => div.classList.add("show"), 100 + i * 100);
    }

    hint.textContent =
        "L’élève doit repérer le fait correct parmi les propositions affichées.";
}

/* ======================================================
   MODALE ID — Identification de faits
   ====================================================== */
export function openIdModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalID");
    if (!modalEl) return;

    document.getElementById("id_levelId").value = levelId;

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
        switchResult.checked = true;

        nbFactsSlider.value = 1;
        nbFactsVal.textContent = "1";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    /* ------------------ Exclusivité switches ------------------ */
    function enforceSwitches(event) {
        if (event.target === switchResult && switchResult.checked) {
            switchOperand.checked = false;
        }
        if (event.target === switchOperand && switchOperand.checked) {
            switchResult.checked = false;
        }

        // sécurité : toujours 1 actif minimum
        if (!switchOperand.checked && !switchResult.checked) {
            switchResult.checked = true;
        }

        generateIdPreview();
    }

    switchResult.addEventListener("change", enforceSwitches);
    switchOperand.addEventListener("change", enforceSwitches);

    /* ------------------ Sliders dynamiques ------------------ */
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
    }

    /* ------------------ CONFIRM ------------------ */
    const confirmBtn = document.getElementById("id_confirmBtn");
    confirmBtn.onclick = async () => {
        const source = switchOperand.checked ? "OPERAND" : "RESULT";

        const payload = {
            taskType: "ID",
            sourceVariation: source,
            nbFacts: parseInt(nbFactsSlider.value, 10),
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "ID", "taskModalID");
    };

    /* ------------------ OPEN ------------------ */
    const modal = new bootstrap.Modal(modalEl);
    generateIdPreview();
    modal.show();
}
