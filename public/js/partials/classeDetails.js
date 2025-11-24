// ============================================================================
//  CLASSE PARTIAL — Works with new DashboardPair system
// ============================================================================

window.reloadDashboardPair = async function (pairName) {
    // Get list + detail containers for this pair
    const list = document.querySelector(
        `[data-partial-list][data-dashboard-pair="${pairName}"]`
    );
    const detail = document.querySelector(
        `[data-partial-detail][data-dashboard-pair="${pairName}"]`
    );

    if (!list || !detail) return;

    // Find currently selected element
    const selected = list.querySelector('input[type="radio"]:checked');
    if (!selected) return;

    const id = selected.dataset.id;
    if (!id) return;

    // Build URL for the detail partial
    const template = detail.dataset.detailUrlTemplate;
    const url = template.replace("__ID__", encodeURIComponent(id));

    // Loader
    detail.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3">Chargement…</p>
        </div>
    `;

    // Fetch + inject
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        detail.innerHTML = await res.text();

        // Rebind the partial’s JS
        document.dispatchEvent(
            new CustomEvent("partial:loaded", {
                detail: { pair: pairName, container: detail }
            })
        );

    } catch (err) {
        console.error("Detail reload error:", err);
        detail.innerHTML = `<div class="text-danger p-3">Erreur lors du chargement</div>`;
    }
};


document.addEventListener("partial:loaded", (e) => {
    const { pair, container } = e.detail || {};

    // Only run for the "classes" dashboard pair
    if (pair !== "classes") return;
    if (!container) return;

    // ------------------------------------------------------------------------
    // LOOKUP HELPERS (always search inside the partial container)
    // ------------------------------------------------------------------------
    const q = (sel) => container.querySelector(sel);
    const qAll = (sel) => container.querySelectorAll(sel);

    // ---- UI ELEMENTS ----
    const selectModeSwitch = q("#select-mode-switch");
    const selectModeLabel  = q('label[for="select-mode-switch"]');
    const selectModeActionsBtn = q("#select-mode-actions-dropdown");

    const saveBtn   = q("#input_save_button");
    const cancelBtn = q("#input_cancel_button");
    const form      = q("#save_form");

    // Modal UI
    const applyBtn = q("#trainingApplyConfirm");
    const trainingApplySelect = q("#trainingApplySelect");

    // ========================================================================
    //  STATE
    // ========================================================================
    let selectionMode = false;
    const selectedRows = new Set();


    // ========================================================================
    // 1. SWITCH BEHAVIOR — SELECTION MODE ON/OFF
    // ========================================================================
    if (selectModeSwitch) {
        selectModeSwitch.addEventListener("change", () => {
            selectionMode = selectModeSwitch.checked;
            selectModeLabel.textContent = selectionMode ? "Activé" : "Désactivé";

            const rows = qAll("tbody tr");

            selectedRows.clear();

            rows.forEach(row => {
                row.classList.remove("selected-row", "selectable");

                if (selectionMode) {
                    row.classList.add("selectable");
                    row.removeAttribute("onclick");
                    delete row.dataset.originalOnclick;
                }
            });
        });
    }


    // ========================================================================
    // 2. ROW CLICK BEHAVIOR
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
    // 3. PREVENT SELECT ELEMENTS FROM FIRING ROW EVENTS
    // ========================================================================
    qAll(".ignore-row-click").forEach(el =>
        ["mousedown", "click", "change"].forEach(evt =>
            el.addEventListener(evt, e => e.stopPropagation())
        )
    );


    // ========================================================================
    // 4. FIELD CHANGE DETECTION
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
    // 5. CANCEL BUTTON — reload pair
    // ========================================================================
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            window.reloadDashboardPair("classes");
        });
    }


    // ========================================================================
    // 6. SAVE FORM
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
                    alert("Modifications enregistrées !");
                    setTimeout(() => window.reloadDashboardPair("classes"), 200);
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
    // 7. DROPDOWN ACTIONS
    // ========================================================================
    qAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            if (!selectionMode) return;

            const actionName = item.textContent.trim();
            const ids = [...selectedRows];

            if (ids.length === 0) return alert("Aucun élève sélectionné.");

            // DELETE
            if (actionName === "Supprimer les élèves") {
                ids.forEach(id => {
                    const row = q(`tr[data-db-id="${id}"]`);
                    if (!row) return;

                    row.classList.add("mark-delete");
                    row.dataset.rowDeleted = "true";
                    row.dataset.rowEdited = "true";
                });

                alert(`${ids.length} élèves marqués pour suppression.`);
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
                    alert("Entraînement appliqué !");
                };
            }
        });
    });


    // ========================================================================
    // 8. ADD STUDENT MODAL
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

        addStudentBtnOpen?.addEventListener("click", () => {
            addStudentForm.reset();
            studentIdInput.placeholder = "dupontm";
            studentIdInput.value = "";
            addStudentModal.show();
        });

        addStudentBtnConfirm?.addEventListener("click", async () => {
            const nom    = lastNameInput.value.trim();
            const prenom = firstNameInput.value.trim();
            let identifiant = studentIdInput.value.trim() || studentIdInput.placeholder;

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
                    await window.reloadDashboardPair("classes");
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
// BUTTON HELPERS
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
