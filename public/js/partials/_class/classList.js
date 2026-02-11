import { showToast } from '../../toast/toast.js';

document.addEventListener('partial:list:loaded', async (e) => {
    const { pair, container } = e.detail || {};
    if (pair !== "classes") return;
    if (!container) return;

    await Promise.resolve();

    const modalElement = container.querySelector('#addClassModal');
    const btn = container.querySelector('#addClassConfirm');
    const form = container.querySelector('#addClassForm');

    const nameInput = container.querySelector('#className');
    const idInput   = container.querySelector('#classID');

    if (!modalElement || !btn || !form || !nameInput || !idInput) return;

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    const MAX_ID_LENGTH = 10;

    // ---------------------------------------------------------------------
    // AUTO-PREVIEW IDENTIFIANT + LIMIT 10 CHARS
    // ---------------------------------------------------------------------
    function autoGenerateId() {
        if (idInput.dataset.userEdited !== "true") {
            const raw = nameInput.value.trim();

            let generated = raw
                .replace(/\s+/g, "_")
                .toUpperCase()
                .slice(0, MAX_ID_LENGTH);  // 🔥 max 10 chars

            idInput.value = generated;
        }
    }

    // ---------------------------------------------------------------------
    // USER EDIT DETECTION + LIMIT
    // ---------------------------------------------------------------------
    idInput.addEventListener("input", () => {
        let value = idInput.value.trim();

        if (value.length > MAX_ID_LENGTH) {
            value = value.slice(0, MAX_ID_LENGTH);
            idInput.value = value; // impose la limite
        }

        if (value !== "") {
            idInput.dataset.userEdited = "true";
        } else {
            idInput.dataset.userEdited = "false";
            autoGenerateId();
        }
    });

    // Mise à jour auto lors de la saisie du nom
    nameInput.addEventListener("input", autoGenerateId);

    // ---------------------------------------------------------------------
    // SUBMIT
    // ---------------------------------------------------------------------
    btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
            const formData = new FormData(form);

            const response = await fetch(form.action, {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.fatal) {
                showToast(false, "Erreur", "Erreur lors de l'ajout de la classe.");
            }
            else if (!result.success && !result.fatal) {
                showToast(false, "Erreur", "Cet identifiant existe déjà.");
            }
            else if (result.success) {
                modal.hide();

                showToast(true, "Succès", "Classe ajoutée.");
                await window.reloadListOnly("classes");
            }

        } catch (err) {
            console.error("Erreur ajout classe:", err);
            showToast(false,
                "Erreur réseau lors de l'ajout de la classe.",
                "Erreur de communication avec l'API."
            );
        }
    });

    // ========================================================================
    // AUTO-SELECT FIRST CLASS (RADIO-BASED LIST)
    // ========================================================================

    // // Find all class radios
    // const radios = container.querySelectorAll(
    //     'input[type="radio"][name="elementSelection_classes"]'
    // );
    //
    // if (radios.length > 0) {
    //     // Is one already checked?
    //     const alreadyChecked = [...radios].some(radio => radio.checked);
    //
    //     if (!alreadyChecked) {
    //         const firstRadio = radios[0];
    //         const classId = firstRadio.dataset.id;
    //
    //         // 1. Check the radio (updates visual state)
    //         firstRadio.checked = true;
    //
    //         // 2. Load its detail panel
    //         if (classId) {
    //             window.reloadDetailOnly("classes", classId);
    //         }
    //
    //         // 3. Update URL visually (no navigation)
    //         const url = new URL(window.location.href);
    //         url.searchParams.set("target", "classrooms");
    //         history.replaceState({ classId }, "", url.toString());
    //     }
    // }
});
