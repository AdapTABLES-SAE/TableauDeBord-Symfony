// ============================================================================
//  PARTIAL MANAGER — Reload BOTH (default behaviour)
//  • If no radio selected → reload ONLY list
// ============================================================================

window.reloadDashboardPair = async function (pairName) {
    const list = document.querySelector(
        `[data-partial-list][data-dashboard-pair="${pairName}"]`
    );

    if (!list) return;

    const selected = list.querySelector('input[type="radio"]:checked');

    if (!selected) {
        return reloadListOnly(pairName);
    }

    const id = selected.dataset.id;
    if (!id) return reloadListOnly(pairName);

    await reloadDetailOnly(pairName, id);
    await reloadListOnly(pairName, id);
};

// ============================================================================
//  RELOAD ONLY DETAIL PARTIAL
// ============================================================================

async function reloadDetailOnly(pairName, id) {
    const detail = document.querySelector(
        `[data-partial-detail][data-dashboard-pair="${pairName}"]`
    );
    if (!detail) return;

    const template = detail.dataset.detailUrlTemplate;
    if (!template) return;

    detail.innerHTML = _renderLoader("Chargement du détail...")

    const url = template.replace("__ID__", encodeURIComponent(id));

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        detail.innerHTML = await res.text();

        document.dispatchEvent(
            new CustomEvent("partial:loaded", {
                detail: { pair: pairName, container: detail }
            })
        );

    } catch (err) {
        console.error("Detail reload error:", err);
        detail.innerHTML = `<div class="text-danger p-3">Erreur lors du chargement</div>`;
    }
}

// ============================================================================
//  RELOAD ONLY LIST PARTIAL
//  • If id is provided → auto re-check radio
// ============================================================================

async function reloadListOnly(pairName, checkedID = null) {
    const list = document.querySelector(
        `[data-partial-list][data-dashboard-pair="${pairName}"]`
    );
    if (!list) return;

    const urlList = list.dataset.listUrl;
    if (!urlList) return;

    list.innerHTML = _renderLoader("Chargement de la liste...")
    try {
        const res = await fetch(urlList);
        if (!res.ok) throw new Error("HTTP " + res.status);

        list.innerHTML = await res.text();

        // --- CORRECTION ICI ---
        // On récupère les radios
        const radios = list.querySelectorAll('input[type="radio"][data-id]');

        // Si on a des radios (liste non vide), on attache les événements
        if (radios.length > 0) {

            // 1. Restore change event
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    reloadDetailOnly(pairName, radio.dataset.id);
                });
            });

            // 2. Restore selection (si un ID était coché avant)
            if (checkedID) {
                const newSelected = list.querySelector(
                    `input[type="radio"][data-id="${checkedID}"]`
                );
                if (newSelected) {
                    newSelected.checked = true;
                    // On ne déclenche l'événement change que si on veut recharger le détail
                    // newSelected.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
        }

        // --- IMPORTANT ---
        // On ne fait PLUS de "return" si la liste est vide.
        // On continue l'exécution pour envoyer l'événement ci-dessous.
        // C'est ce qui permet d'initialiser le bouton "Ajouter" même si la liste est vide.

        document.dispatchEvent(
            new CustomEvent("partial:list:loaded", {
                detail: { pair: pairName, container: list }
            })
        );

    } catch (err) {
        console.error("List reload error:", err);
        list.innerHTML = `<div class="text-danger p-3">Erreur lors du chargement</div>`;
    }
}

function _renderLoader(text) {
    return `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3">${text}</p>
        </div>
    `;
}


// ============================================================================
//  MAKE THEM GLOBAL (optional but consistent with your pattern)
// ============================================================================
window.reloadListOnly = reloadListOnly;
window.reloadDetailOnly = reloadDetailOnly;
window._renderLoader = _renderLoader;

// ============================================================================
// BUTTON HELPERS
// ============================================================================
function resetButtons(saveBtn, cancelBtn) {
    if(!saveBtn || !cancelBtn) return;
    saveBtn.classList.add("btn-outline-success", "disabled");
    saveBtn.classList.remove("btn-success");

    cancelBtn.classList.add("btn-outline-secondary", "disabled");
    cancelBtn.classList.remove("btn-secondary");
}

function enableButtons(saveBtn, cancelBtn) {
    if(!saveBtn || !cancelBtn) return;
    saveBtn.classList.remove("btn-outline-success", "disabled");
    saveBtn.classList.add("btn-success");

    cancelBtn.classList.remove("btn-outline-secondary", "disabled");
    cancelBtn.classList.add("btn-secondary");
}

// Globals
window.resetButtons = resetButtons;
window.enableButtons = enableButtons;
