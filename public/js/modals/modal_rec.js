import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   MODALE REC — Reconstitution d’un fait
   ====================================================== */

export function openRecModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalREC");
    if (!modalEl) return;

    document.getElementById("rec_levelId").value = levelId;

    const nbIncSlider = document.getElementById("rec_nbIncorrect");
    const timeSlider  = document.getElementById("rec_time");
    const succSlider  = document.getElementById("rec_successes");

    const nbIncVal = document.getElementById("rec_nbIncorrect_value");
    const timeVal  = document.getElementById("rec_time_value");
    const succVal  = document.getElementById("rec_successes_value");

    // Existing task
    if (task) {
        nbIncSlider.value = task.nbIncorrectChoices ?? 3;
        nbIncVal.textContent = nbIncSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;
    }

    // New task defaults
    else {
        nbIncSlider.value = 3;
        nbIncVal.textContent = "3";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    // Sliders sync
    nbIncSlider.oninput = () => nbIncVal.textContent = nbIncSlider.value;
    timeSlider.oninput  = () => timeVal.textContent  = timeSlider.value;
    succSlider.oninput  = () => succVal.textContent = succSlider.value;

    // Delete
    const deleteBtn = document.getElementById("rec_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () => deleteTask(levelId, "REC", card, "taskModalREC");
    } else {
        deleteBtn.classList.add("d-none");
    }

    // Confirm
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

    new bootstrap.Modal(modalEl).show();
}
