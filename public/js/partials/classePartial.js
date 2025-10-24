
// Call custom event
// document.addEventListener('partial:loaded', e => {
//     const container = e.detail.target;
//     const saveBtn = document.getElementById("inputs_save_button")
//     const cancelBtn = document.getElementById("inputs_cancel_button")
//
//     container.querySelectorAll('input').forEach(input => {
//         input.addEventListener('input', () => {
//             saveBtn.classList.remove("btn-outline-success", "disabled")
//             saveBtn.classList.add("btn-success")
//
//             cancelBtn.classList.remove("disabled")
//         });
//     });
// });


document.addEventListener('partial:loaded', e => {
    const container = document.getElementById('includedPartial');

    const form = document.getElementById("save_form");
    const saveBtn = document.getElementById("input_save_button");
    const cancelBtn = document.getElementById("input_cancel_button");

    container.querySelectorAll('input, select').forEach(element => {
        // Use "input" for text fields, "change" for selects
        const eventType = element.tagName.toLowerCase() === 'select' ? 'change' : 'input';

        element.addEventListener(eventType, () => {
            const changed = element.value !== element.defaultValue;
            if (changed) {

                const tr = element.closest('tr');
                if (tr && container.contains(tr)) {
                    tr.dataset.rowEdited = "true";
                }
                element.style.backgroundColor = "#dcdca7"
                enable_btn_classes(saveBtn, cancelBtn);
            }
        });
    });

    // Handle CANCEL button
    // todo: maybe only reload partial?
    cancelBtn.addEventListener('click', () => {
        window.location.reload();
    });

    if (!form || !saveBtn) return;
    // Handle SAVE button
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editedRows = Array.from(document.querySelectorAll('[data-row-edited="true"]'));
        const classTitle = document.getElementById("classTitle");

        const studentFormData = new FormData();

        if(classTitle.value !== classTitle.defaultValue){
            studentFormData.append(`class[${classTitle.dataset.dbId}][title]`, classTitle.value);
        }

        editedRows.forEach(row => {
            // Skip if nothing was actually edited
            if (row.dataset.rowEdited !== "true") return;

            // Get inputs inside the row
            const studentInput = row.querySelector('td input');
            const trainingSelect = row.querySelector('td select');

            // Extract values safely
            const dbId = row.dataset.dbId;
            const studentIdValue = studentInput ? studentInput.value.trim() : null;
            const trainingValue = trainingSelect ? trainingSelect.value : null;

            // Extra safety: skip if all empty or unchanged
            if (!studentIdValue && !trainingValue) return;

            studentFormData.append(`students[${dbId}][id]`, dbId);
            studentFormData.append(`students[${dbId}][studentId]`, studentIdValue);
            studentFormData.append(`students[${dbId}][trainingPathId]`, trainingValue);

            studentFormData.forEach((value, key) => {
                console.log(key, "→", value);
            });
        });

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: studentFormData
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            console.log("✅ Server response:", result);

            if (result.success) {
                alert("Modifications enregistrées !");
                setTimeout(() => {
                    window.location.reload();
                }, 300)
            } else {
                alert("⚠️ Une erreur est survenue lors de la sauvegarde.");
            }
            reset_btn_classes(saveBtn, cancelBtn);
        } catch (error) {
            console.error("❌ Erreur POST:", error);
            alert("Erreur de communication avec le serveur.");
        }
    });
});

function reset_btn_classes(saveBtn, cancelBtn) {
    saveBtn.classList.add("btn-outline-success", "disabled");
    saveBtn.classList.remove("btn-success");

    cancelBtn.classList.add("btn-outline-secondary", "disabled");
    cancelBtn.classList.remove("btn-secondary");
}
function enable_btn_classes(saveBtn, cancelBtn) {
    saveBtn.classList.remove("btn-outline-success", "disabled");
    saveBtn.classList.add("btn-success");

    cancelBtn.classList.remove("btn-outline-secondary", "disabled");
    cancelBtn.classList.add("btn-secondary");
}
