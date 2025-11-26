import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   MODALE MEMB — Identification vrai / faux
   ====================================================== */

export function openMembModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalMEMB");
    if (!modalEl) return;

    document.getElementById("memb_levelId").value = levelId;

    const radioCorrect  = document.getElementById("memb_target_correct");
    const radioIncorrect = document.getElementById("memb_target_incorrect");

    const nbCorrectSlider = document.getElementById("memb_nbCorrect");
    const nbIncorrectSlider = document.getElementById("memb_nbIncorrect");
    const timeSlider = document.getElementById("memb_time");
    const succSlider = document.getElementById("memb_successes");

    const nbCorrectVal = document.getElementById("memb_nbCorrect_value");
    const nbIncorrectVal = document.getElementById("memb_nbIncorrect_value");
    const timeVal = document.getElementById("memb_time_value");
    const succVal = document.getElementById("memb_successes_value");

    // Existing
    if (task) {

        const target = task.target ?? "CORRECT";

        if (target === "INCORRECT") radioIncorrect.checked = true;
        else radioCorrect.checked = true;

        nbCorrectSlider.value = task.nbCorrectChoices ?? 0;
        nbCorrectVal.textContent = nbCorrectSlider.value;

        nbIncorrectSlider.value = task.nbIncorrectChoices ?? 0;
        nbIncorrectVal.textContent = nbIncorrectSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;
    }

    // New default
    else {
        radioCorrect.checked = true;

        nbCorrectSlider.value = 0;
        nbCorrectVal.textContent = "0";

        nbIncorrectSlider.value = 0;
        nbIncorrectVal.textContent = "0";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    // Sliders sync
    nbCorrectSlider.oninput = () => nbCorrectVal.textContent = nbCorrectSlider.value;
    nbIncorrectSlider.oninput = () => nbIncorrectVal.textContent = nbIncorrectSlider.value;
    timeSlider.oninput = () => timeVal.textContent = timeSlider.value;
    succSlider.oninput = () => succVal.textContent = succSlider.value;

    // Delete
    const deleteBtn = document.getElementById("memb_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () => deleteTask(levelId, "MEMB", card, "taskModalMEMB");
    } else {
        deleteBtn.classList.add("d-none");
    }

    // Confirm
    const confirmBtn = document.getElementById("memb_confirmBtn");
    confirmBtn.onclick = async () => {

        const target = radioIncorrect.checked ? "INCORRECT" : "CORRECT";

        const payload = {
            taskType: "MEMB",
            target: target,
            nbCorrectChoices: parseInt(nbCorrectSlider.value, 10),
            nbIncorrectChoices: parseInt(nbIncorrectSlider.value, 10),
            timeMaxSecond: parseInt(timeSlider.value, 10),
            successiveSuccessesToReach: parseInt(succSlider.value, 10)
        };

        await saveTask(levelId, payload, card, "MEMB", "taskModalMEMB");
    };

    new bootstrap.Modal(modalEl).show();
}
