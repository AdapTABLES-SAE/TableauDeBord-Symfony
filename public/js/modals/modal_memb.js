// public/js/modals/modal_memb.js
import { saveTask, deleteTask } from "./task_actions.js";

/* ======================================================
   PREVIEW — MEMB
   ====================================================== */
function generateMembPreview() {
    const container = document.getElementById("memb_preview_content");
    if (!container) return;

    const grid = container.querySelector(".preview-grid");
    const hint = container.querySelector(".preview-hint");
    if (!grid || !hint) return;

    grid.innerHTML = "";

    const nbCorrectSlider   = document.getElementById("memb_nbCorrect");
    const nbIncorrectSlider = document.getElementById("memb_nbIncorrect");
    const switchIncorrect   = document.getElementById("memb_incorrect");

    const nbCorrect   = Math.max(1, parseInt(nbCorrectSlider?.value || "1", 10));
    const nbIncorrect = Math.max(1, parseInt(nbIncorrectSlider?.value || "1", 10));
    const total       = nbCorrect + nbIncorrect;

    const targetIncorrect = !!switchIncorrect?.checked;
    const target = targetIncorrect ? "INCORRECT" : "CORRECT";

    for (let i = 0; i < total; i++) {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const trueRes = a * b;

        let display = `${a} × ${b} = ${trueRes}`;
        let tagHtml = `<span class="tag-ok">Correct</span>`;

        if (i >= nbCorrect) {
            const fakeRes = trueRes + (Math.floor(Math.random() * 5) + 1);
            display = `${a} × ${b} = ${fakeRes}`;
            tagHtml = `<span class="tag-ko">Faux</span>`;
        }

        const row = document.createElement("div");
        row.className = "preview-item";
        row.innerHTML = `
            <span>${display}</span>
            ${tagHtml}
        `;
        grid.appendChild(row);

        setTimeout(() => row.classList.add("show"), 80 + i * 90);
    }

    hint.textContent =
        target === "CORRECT"
            ? "L’élève doit valider les résultats corrects."
            : "L’élève doit identifier les résultats incorrects.";
}

/* ======================================================
   MODALE MEMB — Validation résultats
   ====================================================== */
export function openMembModal(levelId, task, card) {
    const modalEl = document.getElementById("taskModalMEMB");
    if (!modalEl) return;

    const levelInput = document.getElementById("memb_levelId");
    if (levelInput) levelInput.value = levelId;

    const switchCorrect   = document.getElementById("memb_correct");
    const switchIncorrect = document.getElementById("memb_incorrect");

    const nbCorrectSlider   = document.getElementById("memb_nbCorrect");
    const nbIncorrectSlider = document.getElementById("memb_nbIncorrect");
    const timeSlider        = document.getElementById("memb_time");
    const succSlider        = document.getElementById("memb_successes");

    const nbCorrectVal   = document.getElementById("memb_nbCorrect_value");
    const nbIncorrectVal = document.getElementById("memb_nbIncorrect_value");
    const timeVal        = document.getElementById("memb_time_value");
    const succVal        = document.getElementById("memb_successes_value");

    /* ---------- Pré-remplissage ---------- */
    if (task) {
        const target = task.target ?? "CORRECT";

        if (switchCorrect && switchIncorrect) {
            switchCorrect.checked   = target === "CORRECT";
            switchIncorrect.checked = target === "INCORRECT";
        }

        if (nbCorrectSlider && nbCorrectVal) {
            const v = Math.max(1, Math.min(3, task.nbCorrectChoices ?? 1));
            nbCorrectSlider.value = String(v);
            nbCorrectVal.textContent = String(v);
        }

        if (nbIncorrectSlider && nbIncorrectVal) {
            const v = Math.max(1, Math.min(3, task.nbIncorrectChoices ?? 1));
            nbIncorrectSlider.value = String(v);
            nbIncorrectVal.textContent = String(v);
        }

        if (timeSlider && timeVal) {
            const v = task.timeMaxSecond ?? 20;
            timeSlider.value = String(v);
            timeVal.textContent = String(v);
        }

        if (succSlider && succVal) {
            const v = task.successiveSuccessesToReach ?? 1;
            succSlider.value = String(v);
            succVal.textContent = String(v);
        }

    } else {
        // NEW TASK → defaults
        if (switchCorrect && switchIncorrect) {
            switchCorrect.checked = true;
            switchIncorrect.checked = false;
        }

        if (nbCorrectSlider && nbCorrectVal) {
            nbCorrectSlider.value = "1";
            nbCorrectVal.textContent = "1";
        }
        if (nbIncorrectSlider && nbIncorrectVal) {
            nbIncorrectSlider.value = "1";
            nbIncorrectVal.textContent = "1";
        }

        if (timeSlider && timeVal) {
            timeSlider.value = "20";
            timeVal.textContent = "20";
        }
        if (succSlider && succVal) {
            succSlider.value = "1";
            succVal.textContent = "1";
        }
    }

    /* ---------- Exclusivité des switches (FIX) ---------- */
    function enforceExclusive() {
        if (!switchCorrect || !switchIncorrect) return;

        const clickedCorrect  = event.target === switchCorrect;
        const clickedIncorrect = event.target === switchIncorrect;

        if (clickedCorrect) {
            switchCorrect.checked = true;
            switchIncorrect.checked = false;
        }

        if (clickedIncorrect) {
            switchIncorrect.checked = true;
            switchCorrect.checked = false;
        }

        // Sécurité : ne jamais avoir 0 / 0
        if (!switchCorrect.checked && !switchIncorrect.checked) {
            switchCorrect.checked = true;
        }

        generateMembPreview();
    }

    if (switchCorrect)   switchCorrect.addEventListener("change", enforceExclusive);
    if (switchIncorrect) switchIncorrect.addEventListener("change", enforceExclusive);

    /* ---------- Sliders sync ---------- */
    if (nbCorrectSlider && nbCorrectVal) {
        nbCorrectSlider.oninput = () => {
            if (parseInt(nbCorrectSlider.value, 10) < 1) nbCorrectSlider.value = "1";
            nbCorrectVal.textContent = nbCorrectSlider.value;
            generateMembPreview();
        };
    }

    if (nbIncorrectSlider && nbIncorrectVal) {
        nbIncorrectSlider.oninput = () => {
            if (parseInt(nbIncorrectSlider.value, 10) < 1) nbIncorrectSlider.value = "1";
            nbIncorrectVal.textContent = nbIncorrectSlider.value;
            generateMembPreview();
        };
    }

    if (timeSlider && timeVal) {
        timeSlider.oninput = () => {
            timeVal.textContent = timeSlider.value;
        };
    }

    if (succSlider && succVal) {
        succSlider.oninput = () => {
            succVal.textContent = succSlider.value;
        };
    }

    /* ---------- Delete ---------- */
    const deleteBtn = document.getElementById("memb_deleteBtn");
    if (deleteBtn) {
        if (task && task.id) {
            deleteBtn.classList.remove("d-none");
            deleteBtn.onclick = () =>
                deleteTask(levelId, "MEMB", card, "taskModalMEMB");
        } else {
            deleteBtn.classList.add("d-none");
            deleteBtn.onclick = null;
        }
    }

    /* ---------- Confirm ---------- */
    const confirmBtn = document.getElementById("memb_confirmBtn");
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const target =
                switchIncorrect && switchIncorrect.checked ? "INCORRECT" : "CORRECT";

            const payload = {
                taskType: "MEMB",
                target,
                nbCorrectChoices: parseInt(nbCorrectSlider?.value || "1", 10),
                nbIncorrectChoices: parseInt(nbIncorrectSlider?.value || "1", 10),
                timeMaxSecond: parseInt(timeSlider?.value || "20", 10),
                successiveSuccessesToReach: parseInt(succSlider?.value || "1", 10),
            };

            await saveTask(levelId, payload, card, "MEMB", "taskModalMEMB");
        };
    }

    /* ---------- OUVERTURE ---------- */
    const modal = new bootstrap.Modal(modalEl);
    generateMembPreview();
    modal.show();
}
