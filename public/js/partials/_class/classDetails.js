// ============================================================================
//  CLASS DETAIL PARTIAL — Activated when partial:loaded fires
// ============================================================================

import {showToast} from "../../toast/toast.js";

document.addEventListener("partial:loaded", (e) => {
    const { pair, container } = e.detail || {};

    if (pair !== "classes") return;

    if (!container) return;

    // ------------------------------------------------------------------------
    // LOOKUP HELPERS
    // ------------------------------------------------------------------------
    const q = (sel) => container.querySelector(sel);
    const qAll = (sel) => container.querySelectorAll(sel);

    // ------------------------------------------------------------------------
    // UI ELEMENTS
    // ------------------------------------------------------------------------
    const selectModeSwitch = q("#select-mode-switch");
    const selectModeLabel  = q('label[for="select-mode-switch"]');

    const saveBtn   = q("#input_save_button");
    const cancelBtn = q("#input_cancel_button");
    const form      = q("#save_form");

    const studentList = q("#studentList");

    // Modal UI
    const applyBtn = q("#trainingApplyConfirm");
    const trainingApplySelect = q("#trainingApplySelect");

    // ========================================================================
    //  STATE
    // ========================================================================
    let selectionMode = false;
    const selectedRows = new Set();

    const selected = document.querySelector(
        `[data-partial-list][data-dashboard-pair="classes"] input[type="radio"]:checked`
    );

    const currentId = selected ? selected.dataset.id : null;


    // ========================================================================
    // 1. DEFAULT ROW CLICK TO OPEN STUDENT PAGE
    // ========================================================================
    studentList?.querySelectorAll("tbody tr").forEach(row => {
        row.onclick = () => {
            location.href = row.dataset.originalOnclick;
        };
    });

    // ========================================================================
    // 2. SWITCH — ENABLE/DISABLE MULTI-SELECTION MODE
    // ========================================================================
    if (selectModeSwitch && studentList) {
        selectModeSwitch.addEventListener("change", () => {
            selectionMode = selectModeSwitch.checked;
            selectModeLabel.textContent = selectionMode ? "Activé" : "Désactivé";

            const rows = studentList.querySelectorAll("tbody tr");

            selectedRows.clear();

            rows.forEach(row => {
                row.classList.remove("selected-row", "selectable");

                if (selectionMode) {
                    row.classList.add("selectable");
                    row.onclick = () => {};
                } else {
                    row.onclick = () => {
                        location.href = row.dataset.originalOnclick;
                    };
                }
            });
        });
    }

    // ========================================================================
    // 3. SELECT ROWS WHEN IN SELECTION MODE
    // ========================================================================
    container.addEventListener("click", (e) => {
        const row = e.target.closest("tbody tr");
        if (!row) return;

        if (!selectionMode) return;

        const id = row.dataset.dbId;

        if (selectedRows.has(id)) {
            selectedRows.delete(id);
            row.classList.remove("selected-row");
        } else {
            selectedRows.add(id);
            row.classList.add("selected-row");
        }
    });

    // ========================================================================
    // 4. DO NOT LET <select> TRIGGER ROW CLICK
    // ========================================================================
    qAll(".ignore-row-click").forEach(el =>
        ["mousedown", "click", "change"].forEach(evt =>
            el.addEventListener(evt, e => e.stopPropagation())
        )
    );

    // ========================================================================
    // 5. FIELD CHANGE DETECTION (enables Save + Cancel)
    // ========================================================================
    qAll(".save-able-field").forEach(element => {
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
    // 6. CANCEL BUTTON — RELOAD PARTIAL
    // ========================================================================
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            window.reloadDashboardPair("classes");
        });
    }

    // ========================================================================
    // 7. SAVE FORM (POST updates)
    // ========================================================================
    if (form && saveBtn) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const editedRows = [...qAll('[data-row-edited="true"]')];
            const classTitle = q("#classTitle");

            const data = new FormData();

            if (classTitle && classTitle.value !== classTitle.defaultValue) {
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
                    data.append(`students[${dbId}][trainingPathId]`, select.value);
                }
            });

            try {
                const response = await fetch(form.action, { method: "POST", body: data });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();

                if (result.success) {
                    showToast(
                        true,
                        "Succès",
                        "Modifications enregistrées !"
                    );
                    setTimeout(() => window.reloadDashboardPair("classes"), 200);
                } else {
                    showToast(
                        false,
                        "Erreur",
                        "Une erreur est survenue lors de la sauvegarde."
                    );
                }

                resetButtons(saveBtn, cancelBtn);

            } catch (error) {
                console.error("POST error:", error);
                showToast(
                    false,
                    "Erreur.",
                    "Erreur de communication avec le serveur."
                );
            }
        });
    }

    // ========================================================================
    // 8. DROPDOWN ACTIONS (DELETE / APPLY TRAINING)
    // ========================================================================
    qAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            if (!selectionMode) return;

            const actionName = item.textContent.trim();
            const ids = [...selectedRows];

            if (ids.length === 0) return showToast(
                false,
                "Erreur",
                "Aucun élève selectioné."
            );

            // DELETE
            if (actionName === "Supprimer les élèves") {
                ids.forEach(id => {
                    const row = q(`tr[data-db-id="${id}"]`);
                    if (!row) return;

                    row.classList.add("mark-delete");
                    row.dataset.rowDeleted = "true";
                    row.dataset.rowEdited = "true";
                });

                showToast(
                    true,
                    "Succès",
                    `${ids.length} élèves marqués pour suppression.`
                );
                selectModeSwitch.checked = false;
                selectModeSwitch.dispatchEvent(new Event("change"));
                enableButtons(saveBtn, cancelBtn);
                return;
            }

            // APPLY TRAINING
            if (actionName === "Appliquer un entrainement") {
                const modal = new bootstrap.Modal(q("#trainingApplyModal"));
                modal.show();

                applyBtn.onclick = () => {
                    const trainingId = trainingApplySelect.value;

                    ids.forEach(id => {
                        const row = q(`tr[data-db-id="${id}"]`);
                        if (!row) return;

                        const selectEl = row.querySelector("select");
                        if (selectEl) {
                            selectEl.value = trainingId;
                            selectEl.dispatchEvent(new Event("change"));
                        }
                    });

                    modal.hide();
                    selectModeSwitch.checked = false;
                    selectModeSwitch.dispatchEvent(new Event("change"));
                    showToast(
                        true,
                        "Succès",
                        "Entrainement appliqué."
                    );
                };
            }
        });
    });

    // ========================================================================
    // 9. ADD STUDENT
    // ========================================================================
    const addStudentModalElement = q("#addStudentModal");
    const addStudentForm        = q("#addStudentForm");
    const addStudentBtnOpen     = q("#openAddStudentModal");
    const addStudentBtnConfirm  = q("#addStudentConfirm");

    const lastNameInput  = q("#studentLastName");
    const firstNameInput = q("#studentFirstName");
    const studentIdInput = q("#studentId");

    if (addStudentModalElement && addStudentForm && lastNameInput && firstNameInput && studentIdInput) {
        const addStudentModal = new bootstrap.Modal(addStudentModalElement);

        // --------------------------------------------------------------------
        // Auto-ID generation
        // --------------------------------------------------------------------
        function genId(n, p) {
            n = n.trim().toLowerCase();
            p = p.trim().toLowerCase();
            return (n ? n.substring(0, 7) : "") + (p ? p.charAt(0) : "");
        }

        function updatePlaceholderId() {
            studentIdInput.placeholder = genId(lastNameInput.value, firstNameInput.value);
            if (!studentIdInput.value.trim()) studentIdInput.value = "";
        }

        [lastNameInput, firstNameInput].forEach(input =>
            input.addEventListener("input", updatePlaceholderId)
        );

        // --------------------------------------------------------------------
        // Open modal
        // --------------------------------------------------------------------
        addStudentBtnOpen?.addEventListener("click", () => {
            addStudentForm.reset();
            studentIdInput.placeholder = "dupontm";
            studentIdInput.value = "";
            addStudentModal.show();
        });

        // --------------------------------------------------------------------
        // Submit
        // --------------------------------------------------------------------
        addStudentBtnConfirm?.addEventListener("click", async () => {
            const nom    = lastNameInput.value.trim();
            const prenom = firstNameInput.value.trim();
            let identifiant = studentIdInput.value.trim() || studentIdInput.placeholder;

            if (!nom || !prenom) {
                showToast(
                    false,
                    "Erreur",
                    "Veuillez remplir nom et prénom."
                );
                return;
            }

            const formData = new FormData();
            formData.append("lname", nom);
            formData.append("fname", prenom);
            formData.append("studentId", identifiant);
            console.log(identifiant);

            try {
                const response = await fetch(addStudentForm.action, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                console.log(result);
                if (result.fatal){
                    showToast(
                        false,
                        "Erreur",
                        "L'élève n'a pas pu être ajouté."
                    );
                } else if (!result.success && !result.fatal) {
                    showToast(
                        false,
                        "Erreur",
                        "Cet identifiant existe déjà."
                    );
                } else if (result.success && !result.fatal) {
                    addStudentModal.hide();
                    await window.reloadDetailOnly("classes", currentId);
                    // not active because it blocks the add button
                    // showToast(
                    //     true,
                    //     "Succès",
                    //     "Elève ajouté."
                    // );
                }

            } catch (err) {
                console.error("Erreur ajout élève:", err);
                showToast(
                    false,
                    "Erreur",
                    "Erreur réseau lors de l'ajout de l'élève."
                );
            }
        });
    }
    // ========================================================================
    // 10. DELETE CLASS
    // ========================================================================

    const deleteBtn = q("#deleteClassBtn");
    const deleteModalEl = q("#deleteClassModal");
    const confirmDeleteBtn = q("#confirmDeleteClass");

    if (deleteBtn && deleteModalEl && confirmDeleteBtn) {
        const deleteModal = new bootstrap.Modal(deleteModalEl);
        const classId = deleteBtn.dataset.classId;

        deleteBtn.addEventListener("click", () => {
            deleteModal.show();
        });

        confirmDeleteBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(`/dashboard/classroom/delete/${classId}`, {
                    method: "DELETE",
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();

                if (result.success) {
                    deleteModal.hide();

                    // Recharger uniquement la liste des classes
                    await window.reloadListOnly("classes");

                    // Puis vider le détail
                    container.innerHTML = `
                    <h2 class="fw-bold mb-3">Ma classe</h2>
                    <p class="text-primary fs-5">
                        Sélectionner une classe pour voir le détail.
                    </p>
                `;
                } else {
                    showToast(
                        false,
                        "Impossible de supprimer la classe",
                        "."
                    );
                }

            } catch (err) {
                console.error("Delete error:", err);
                showToast(
                    false,
                    "Erreur réseau lors de la suppression de la classe.",
                    "."
                );
            }
        });
    }
});
