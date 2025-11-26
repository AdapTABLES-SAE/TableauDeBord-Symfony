import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   MODALE C2 — Complétion 2 éléments
   ====================================================== */

export function openC2Modal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalC2");
    if (!modalEl) return;

    // ID du niveau
    document.getElementById("c2_levelId").value = levelId;

    // Cibles possibles = 3 valeurs
    const radios = document.querySelectorAll('input[name="c2_target"]');
    radios.forEach(r => {
        r.checked = false;
        r.closest(".task-chip")?.classList.remove("active");
    });

    const nbIncSlider = document.getElementById("c2_nbIncorrect");
    const timeSlider  = document.getElementById("c2_time");
    const succSlider  = document.getElementById("c2_successes");

    const nbIncVal = document.getElementById("c2_nbIncorrect_value");
    const timeVal  = document.getElementById("c2_time_value");
    const succVal  = document.getElementById("c2_successes_value");

    // ----------------------------------------------------
    // EXISTING TASK → pré-remplissage
    // ----------------------------------------------------
    if (task) {

        const target = task.targets?.[0] ?? "OPERAND_TABLE";
        const radioEl = document.querySelector(`input[name="c2_target"][value="${target}"]`);

        if (radioEl) {
            radioEl.checked = true;
            radioEl.closest(".task-chip")?.classList.add("active");
        }

        nbIncSlider.value = task.nbIncorrectChoices ?? 3;
        nbIncVal.textContent = nbIncSlider.value;

        timeSlider.value = task.timeMaxSecond ?? 20;
        timeVal.textContent = timeSlider.value;

        succSlider.value = task.successiveSuccessesToReach ?? 1;
        succVal.textContent = succSlider.value;
    }

        // ----------------------------------------------------
        // NEW TASK → defaults
    // ----------------------------------------------------
    else {
        const defaultRadio = document.querySelector(`input[name="c2_target"][value="OPERAND_TABLE"]`);
        if (defaultRadio) {
            defaultRadio.checked = true;
            defaultRadio.closest(".task-chip").classList.add("active");
        }

        nbIncSlider.value = 3;
        nbIncVal.textContent = "3";

        timeSlider.value = 20;
        timeVal.textContent = "20";

        succSlider.value = 1;
        succVal.textContent = "1";
    }

    // Radio exclusivité visuelle
    radios.forEach(r => {
        r.addEventListener("change", () => {
            radios.forEach(x => x.closest(".task-chip")?.classList.remove("active"));
            r.closest(".task-chip")?.classList.add("active");
        });
    });

    // Sliders synchro
    nbIncSlider.oninput = () => nbIncVal.textContent = nbIncSlider.value;
    timeSlider.oninput  = () => timeVal.textContent  = timeSlider.value;
    succSlider.oninput  = () => succVal.textContent  = succSlider.value;

    // ----------------------------------------------------
    // Suppression
    // ----------------------------------------------------
    const deleteBtn = document.getElementById("c2_deleteBtn");
    if (task && task.id) {
        deleteBtn.classList.remove("d-none");
        deleteBtn.onclick = () => deleteTask(levelId, "C2", card, "taskModalC2");
    } else {
        deleteBtn.classList.add("d-none");
        deleteBtn.onclick = null;
    }

    // ----------------------------------------------------
    // Confirmation
    // ----------------------------------------------------
    const confirmBtn = document.getElementById("c2_confirmBtn");

    confirmBtn.onclick = async () => {
        const target = document.querySelector('input[name="c2_target"]:checked').value;

        const payload = {
            taskType: "C2",
            targets: [target],
            nbIncorrectChoices: parseInt(nbIncSlider.value),
            timeMaxSecond: parseInt(timeSlider.value),
            successiveSuccessesToReach: parseInt(succSlider.value)
        };

        await saveTask(levelId, payload, card, "C2", "taskModalC2");
    };

    new bootstrap.Modal(modalEl).show();
}
