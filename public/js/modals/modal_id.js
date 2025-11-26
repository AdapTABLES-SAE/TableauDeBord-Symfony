import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   MODALE ID — Identification des résultats
   ====================================================== */

export function openIdModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalID");
    if (!modalEl) return;

    document.getElementById("id_levelId").value = levelId;

    const nbFactsSlider = document.getElementById("id_nbFacts");
    const timeSlider    = document.getElementById("id_time");
    const succSlider    = document.getElementById("id_successes");

    const nbFactsVal = document.getElementById("id_nbFacts_value");
    const timeVal    = document.getElementById("id_time_value");
    const succVal    = document.getElementById("id_successes_value");

    const radioResult = document.getElementById("id_source_result");
    const radioOperand = document.getElementById("id_source_operand");

    // EXISTING
    if (task) {

        nbFactsSlider.value = task.nbFacts ?? 1;
        nbFactsVal.textContent = nbFactsSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;

        const src = task.sourceVariation ?? "RESULT";

        if (src === "OPERAND") {
            radioOperand.checked = true;
        } else {
            radioResult.checked = true;
        }
    }

    // NEW
    else {
        radioResult.checked = true;   // default

        nbFactsSlider.value = 1;
        nbFactsVal.textContent = "1";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    // Sliders sync
    nbFactsSlider.oninput = () => nbFactsVal.textContent = nbFactsSlider.value;
    timeSlider.oninput    = () => timeVal.textContent    = timeSlider.value;
    succSlider.oninput    = () => succVal.textContent    = succSlider.value;

    // DELETE
    const deleteBtn = document.getElementById("id_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () => deleteTask(levelId, "ID", card, "taskModalID");
    } else {
        deleteBtn.classList.add("d-none");
    }

    // CONFIRM
    const confirmBtn = document.getElementById("id_confirmBtn");
    confirmBtn.onclick = async () => {

        const source = radioOperand.checked ? "OPERAND" : "RESULT";

        const payload = {
            taskType: "ID",
            nbFacts: parseInt(nbFactsSlider.value, 10),
            sourceVariation: source,
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "ID", "taskModalID");
    };

    new bootstrap.Modal(modalEl).show();
}
