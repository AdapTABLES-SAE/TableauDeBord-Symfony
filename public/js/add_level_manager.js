document.addEventListener("DOMContentLoaded", () => {
    initDedicatedAddLevel();
});

function initDedicatedAddLevel() {
    const addBtn = document.getElementById("add-level-btn");
    const confirmBtn = document.getElementById("btn-confirm-add-level-final");

    if (!addBtn) return;

    // --- FONCTION DE CRÉATION RÉELLE ---
    const executeAddLevel = async () => {
        const config = window.OBJECTIVE_CONFIG || {};
        const url = config.createLevelUrl || config.addLevelUrl;

        if (!url) {
            alert("Erreur config : URL de création manquante");
            return;
        }

        // UI Loading
        const activeBtn = (confirmBtn && confirmBtn.offsetParent !== null) ? confirmBtn : addBtn;
        const originalText = activeBtn.innerHTML;
        activeBtn.disabled = true;
        activeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Création...';

        // -------------------------------------------------------------
        // RÉCUPÉRATION DES TABLES (Version Boutons .table-pill)
        // -------------------------------------------------------------
        let selectedTables = [];

        // On cherche tous les boutons qui ont la classe "table-pill" ET "active"
        const activeButtons = document.querySelectorAll('.table-pill.active');

        activeButtons.forEach(btn => {
            const valStr = btn.getAttribute('data-value');
            const val = parseInt(valStr, 10);

            // Sécurité : on vérifie que c'est bien un nombre
            if (!isNaN(val)) {
                selectedTables.push(valStr);
            }
        });
        // -------------------------------------------------------------

        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ tables: selectedTables })
            });

            const data = await resp.json();

            if (data.success) {
                if (data.levelId) {
                    sessionStorage.setItem("REFRESH_REOPEN_LEVEL_ID", data.levelId);
                }
                window.location.reload();
            } else {
                alert("Erreur : " + (data.message || "Impossible de créer le niveau"));
                activeBtn.disabled = false;
                activeBtn.innerHTML = originalText;
            }

        } catch (err) {
            console.error(err);
            alert("Erreur serveur lors de la création.");
            activeBtn.disabled = false;
            activeBtn.innerHTML = originalText;
        }
    };

    // --- CLIC PRINCIPAL ---
    addBtn.onclick = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (window.HAS_STUDENTS === true) {
            const modalEl = document.getElementById("modal-add-level-confirm");
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        } else {
            executeAddLevel();
        }
    };

    // --- CLIC CONFIRMATION ---
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const modalEl = document.getElementById("modal-add-level-confirm");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();

            executeAddLevel();
        };
    }
}
