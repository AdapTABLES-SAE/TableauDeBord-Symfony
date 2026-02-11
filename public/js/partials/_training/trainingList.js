import {showToast} from "../../toast/toast.js";

document.addEventListener("partial:list:loaded", (e) => {
    const { pair, container } = e.detail || {};
    if (pair !== "trainings" || !container) return;

    // ------------------------------------------------------------------------
    // 1. GESTION MODALE CRÉATION (Inchangé)
    // ------------------------------------------------------------------------
    const addBtn     = container.querySelector("#addTrainingBtn");
    const modalEl    = container.querySelector("#addTrainingModal");
    const confirmBtn = container.querySelector("#confirmAddTraining");
    const nameInput  = container.querySelector("#newTrainingName");

    if (addBtn && modalEl && confirmBtn && nameInput) {
        const modal = new bootstrap.Modal(modalEl);

        // Open modal
        addBtn.addEventListener("click", () => {
            nameInput.value = "";
            modal.show();
        });

        // Confirm creation
        confirmBtn.addEventListener("click", async () => {
            const name = nameInput.value.trim();
            if (!name) {
                window.showToast?.(false, "Erreur", "Le nom est requis.");
                return;
            }

            try {
                const response = await fetch(addBtn.dataset.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();

                if (result.success) {
                    modal.hide();
                    window.showToast?.(true, "Succès", "Entraînement créé.");
                    await window.reloadListOnly("trainings");
                } else {
                    window.showToast?.(false, "Erreur", "Impossible de créer l’entraînement.");
                }

            } catch (err) {
                console.error("Add training error:", err);
                window.showToast?.(false, "Erreur", "Erreur réseau lors de la création.");
            }
        });
    }

    // ========================================================================
    // 2. SÉLECTION AUTOMATIQUE (PARAMÈTRE 'OPEN' OU PREMIER ÉLÉMENT)
    // ========================================================================

    // const radios = container.querySelectorAll(
    //     'input[type="radio"][name="elementSelection_trainings"]'
    // );
    //
    // if (radios.length > 0) {
    //     const params = new URLSearchParams(window.location.search);
    //     const idToOpen = params.get("open"); // On cherche &open=123
    //
    //     let radioToSelect = null;
    //
    //     // A. PRIORITÉ 1 : On cherche l'entraînement demandé dans l'URL
    //     if (idToOpen) {
    //         const targetRadio = container.querySelector(`input[type="radio"][data-id="${idToOpen}"]`);
    //         if (targetRadio) {
    //             radioToSelect = targetRadio;
    //
    //             // Nettoyage de l'URL (on retire &open=... pour que ce soit propre)
    //             params.delete("open");
    //             const newUrl = window.location.pathname + "?" + params.toString();
    //             window.history.replaceState({}, "", newUrl);
    //         }
    //     }
    //
    //     // B. PRIORITÉ 2 : Si aucun 'open' (ou ID introuvable), on regarde si un est déjà coché
    //     if (!radioToSelect) {
    //         radioToSelect = [...radios].find(r => r.checked);
    //     }
    //
    //     // C. PRIORITÉ 3 : Sinon, on prend le tout premier de la liste
    //     if (!radioToSelect) {
    //         radioToSelect = radios[0];
    //     }
    //
    //     // --- APPLICATION DE LA SÉLECTION ---
    //     if (radioToSelect) {
    //         // 1. On coche visuellement le bouton radio
    //         radioToSelect.checked = true;
    //         const trainingId = radioToSelect.dataset.id;
    //
    //         // 2. On charge le panneau de détail à droite
    //         if (window.reloadDetailOnly && trainingId) {
    //             window.reloadDetailOnly("trainings", trainingId);
    //         }
    //
    //         // 3. On s'assure que l'URL contient bien target=trainings (au cas où)
    //         const currentUrl = new URL(window.location.href);
    //         if(currentUrl.searchParams.get("target") !== "trainings") {
    //             currentUrl.searchParams.set("target", "trainings");
    //             history.replaceState(null, "", currentUrl.toString());
    //         }
    //     }
    // }
});
