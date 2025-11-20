// ============================================================================
//  INITIALIZATION
// ============================================================================
document.addEventListener("partial:loaded", () => {
    const container = document.getElementById("includedPartial");
    if (!container) return;

    // ---- UI ELEMENTS ----
    const selectModeSwitch = document.getElementById("select-mode-switch");
    const selectModeLabel  = document.querySelector('label[for="select-mode-switch"]');
    const selectModeActionsBtn = document.getElementById("select-mode-actions-dropdown");

    const saveBtn   = document.getElementById("input_save_button");
    const cancelBtn = document.getElementById("input_cancel_button");
    const form      = document.getElementById("save_form");


    // Modal UI
    const applyBtn = document.getElementById("trainingApplyConfirm");
    const select = document.getElementById("trainingApplySelect");

    // ---- STATE ----
    let selectionMode = false;
    const selectedRows = new Set();

    // ========================================================================
    // 1. SWITCH BEHAVIOR — SELECTION MODE ON/OFF
    // ========================================================================
    selectModeSwitch.addEventListener("change", () => {
        selectionMode = selectModeSwitch.checked;

        // Update label text
        selectModeLabel.textContent = selectionMode ? "Activé" : "Désactivé";

        const rows = container.querySelectorAll("tbody tr");

        // Clear selection when mode changes
        selectedRows.clear();

        rows.forEach(row => {
            row.classList.remove("selected-row", "selectable");

            if (selectionMode) {
                // Enable selection mode
                row.classList.add("selectable");

                // Save & remove redirect onclick
                row.dataset.originalOnclick = row.getAttribute("onclick");
                row.removeAttribute("onclick");

            } else {
                // Restore redirect onclick
                if (row.dataset.originalOnclick) {
                    row.setAttribute("onclick", row.dataset.originalOnclick);
                }
            }
        });
    });

    // ========================================================================
    // 2. ROW CLICK BEHAVIOR (EVENT DELEGATION) — WORKS 100% ALWAYS
    // ========================================================================
    container.addEventListener("click", (e) => {
        const row = e.target.closest("tbody tr");
        if (!row) return;

        // Normal mode? Let redirect happen.
        if (!selectionMode) return;

        // Selection mode: toggle blue highlight
        const id = row.dataset.dbId;

        if (selectedRows.has(id)) {
            selectedRows.delete(id);
            row.classList.remove("selected-row");
        } else {
            selectedRows.add(id);
            row.classList.add("selected-row");
        }

        // console.log("Rows selected:", [...selectedRows]);
    });

    // ========================================================================
    // 3. PREVENT SELECT ELEMENTS FROM FIRING ROW CLICKS
    // ========================================================================
    document.querySelectorAll(".ignore-row-click").forEach(el => {
        ["mousedown", "click", "change"].forEach(evt =>
            el.addEventListener(evt, e => e.stopPropagation())
        );
    });

    // ========================================================================
    // 4. FIELD CHANGE DETECTION — HIGHLIGHT + ENABLE SAVE/CANCEL
    // ========================================================================
    container.querySelectorAll(".save-able-field").forEach(element => {
        // Avoid toggles and action buttons

        const eventType = element.tagName.toLowerCase() === "select" ? "change" : "input";

        element.addEventListener(eventType, () => {
            const changed = element.value !== element.defaultValue;

            if (changed) {
                const tr = element.closest("tr");
                if (tr) tr.dataset.rowEdited = "true";

                element.style.backgroundColor = "#dcdca7";

                enableButtons(saveBtn, cancelBtn);
            }
        });
    });

    // ========================================================================
    // 5. CANCEL BUTTON — HARD RELOAD
    // ========================================================================
    cancelBtn.addEventListener("click", () => {
        reloadCurrentPartial();
    });

    // ========================================================================
    // 6. SAVE BUTTON — COLLECT FORM DATA AND SEND AJAX REQUEST
    // ========================================================================
    if (form && saveBtn) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const editedRows = [...container.querySelectorAll('[data-row-edited="true"]')];
            const classTitle = document.getElementById("classTitle");

            const data = new FormData();

            if (classTitle.value !== classTitle.defaultValue) {
                data.append(`class[title]`, classTitle.value);
            }

            editedRows.forEach(row => {
                const dbId = row.dataset.dbId;
                const select = row.querySelector("td select");

                if (row.dataset.rowDeleted === "true") {
                    data.append(`students[${dbId}][delete]`, "1");
                    return;
                }

                if (select) {
                    const trainingValue = select.value;
                    if (trainingValue && trainingValue !== "") {
                        data.append(`students[${dbId}][trainingPathId]`, trainingValue);
                    }
                }
            });

            const obj = {};
            data.forEach((value, key) => {
                if (obj[key]) {
                    if (!Array.isArray(obj[key])) {
                        obj[key] = [obj[key]];
                    }
                    obj[key].push(value);
                } else {
                    obj[key] = value;
                }
            });

            // console.log(JSON.stringify(obj, null, 2));

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: data
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    alert("Modifications enregistrées !");
                    setTimeout(() => reloadCurrentPartial(), 300);
                } else {
                    alert("Une erreur est survenue lors de la sauvegarde.");
                }

                resetButtons(saveBtn, cancelBtn);

            } catch (error) {
                console.error("POST error:", error);
                alert("Erreur de communication avec le serveur.");
            }
        });
    }

    // ========================================================================
    // 7. DROPDOWN ACTIONS — DELETE + APPLY TRAINING
    // ========================================================================
    document.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", e => {
            e.preventDefault();
            if (!selectionMode) return;

            const actionName = item.textContent.trim();
            const ids = [...selectedRows];

            if (ids.length === 0) return alert("Aucun élève sélectionné.");

            // DELETE
            if (actionName === "Supprimer les élèves") {
                ids.forEach(id => {
                    const row = container.querySelector(`tr[data-db-id="${id}"]`);
                    if (!row) return;

                    row.classList.add("mark-delete");
                    row.dataset.rowDeleted = "true";
                    row.dataset.rowEdited = "true"; // so save button activates
                });

                alert(`${ids.length} élèves marqués pour suppression.`);
                selectModeSwitch.checked = false;
                selectModeSwitch.dispatchEvent(new Event("change"));
                enableButtons(saveBtn, cancelBtn);
                return;
            }

            // APPLY TRAINING
            if (actionName === "Appliquer un entrainement") {
                // Open modal
                const modal = new bootstrap.Modal(document.getElementById("trainingApplyModal"));
                modal.show();

                // Ensure each open attaches only once
                applyBtn.onclick = () => {
                    const trainingId = select.value;
                    const trainingName = select.options[select.selectedIndex].text;

                    ids.forEach(id => {
                        const row = container.querySelector(`tr[data-db-id="${id}"]`);
                        if (!row) return;

                        const selectEl = row.querySelector("select");
                        if (selectEl) {
                            selectEl.value = trainingId
                            selectEl.dispatchEvent(new Event("change"));
                        }
                    });

                    modal.hide();
                    selectModeSwitch.checked = false;
                    selectModeSwitch.dispatchEvent(new Event("change"));
                    alert("Entraînement appliqué !");
                };
            }

        });
    });
// ========================================================================
// 8. MODALE D’AJOUT D’ÉLÈVE (améliorée + min 5 chars ID)
// ========================================================================
    const addStudentModalElement = document.getElementById("addStudentModal");
    const addStudentForm        = document.getElementById("addStudentForm");
    const addStudentBtnOpen     = document.getElementById("openAddStudentModal");
    const addStudentBtnConfirm  = document.getElementById("addStudentConfirm");

    const lastNameInput  = document.getElementById("studentLastName");
    const firstNameInput = document.getElementById("studentFirstName");
    const studentIdInput = document.getElementById("studentId");

    if (
        addStudentModalElement &&
        addStudentForm &&
        addStudentBtnOpen &&
        addStudentBtnConfirm &&
        lastNameInput &&
        firstNameInput &&
        studentIdInput
    ) {
        const addStudentModal = new bootstrap.Modal(addStudentModalElement);

        function generateStudentId(nom, prenom) {
            const n = nom.trim().toLowerCase();
            const p = prenom.trim().toLowerCase();
            if (!n || !p) return "";
            return n.substring(0, 7) + p.charAt(0);
        }

        function updatePlaceholderId() {
            studentIdInput.placeholder = generateStudentId(
                lastNameInput.value,
                firstNameInput.value
            );

            if (!studentIdInput.value.trim()) {
                studentIdInput.value = "";
            }
        }

        [lastNameInput, firstNameInput].forEach(input => {
            input.addEventListener("input", updatePlaceholderId);
        });

        addStudentBtnOpen.addEventListener("click", () => {
            addStudentForm.reset();
            studentIdInput.placeholder = "dupontm";
            studentIdInput.value = "";
            addStudentModal.show();
        });

        addStudentBtnConfirm.addEventListener("click", async () => {
            const nom    = lastNameInput.value.trim();
            const prenom = firstNameInput.value.trim();
            let identifiant = studentIdInput.value.trim();

            if (!identifiant) {
                identifiant = studentIdInput.placeholder;
            }

            if (!nom || !prenom) {
                alert("Veuillez remplir nom et prénom.");
                return;
            }

            const formData = new FormData();

            formData.append("lname", nom);
            formData.append("fname", prenom);
            formData.append("studentId", identifiant);

            try {
                const response = await fetch(addStudentForm.action, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    addStudentModal.hide();
                    await reloadCurrentPartial();
                } else {
                    alert("Erreur lors de l'ajout de l'élève.");
                }

            } catch (err) {
                console.error("Erreur ajout élève:", err);
                alert("Erreur réseau lors de l'ajout de l'élève.");
            }
        });
    }

});

// ============================================================================
//  BUTTON STATE HELPERS
// ============================================================================
function resetButtons(saveBtn, cancelBtn) {
    saveBtn.classList.add("btn-outline-success", "disabled");
    saveBtn.classList.remove("btn-success");

    cancelBtn.classList.add("btn-outline-secondary", "disabled");
    cancelBtn.classList.remove("btn-secondary");
}

function enableButtons(saveBtn, cancelBtn) {
    saveBtn.classList.remove("btn-outline-success", "disabled");
    saveBtn.classList.add("btn-success");

    cancelBtn.classList.remove("btn-outline-secondary", "disabled");
    cancelBtn.classList.add("btn-secondary");
}
