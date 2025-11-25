// ============================================================================
//  PARTIAL MANAGER — Reload BOTH (default behaviour)
//  • If no radio selected → reload ONLY list
// ============================================================================

window.reloadDashboardPair = async function (pairName) {
    const list = document.querySelector(
        `[data-partial-list][data-dashboard-pair="${pairName}"]`
    );
    const detail = document.querySelector(
        `[data-partial-detail][data-dashboard-pair="${pairName}"]`
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

    const url = template.replace("__ID__", encodeURIComponent(id));

    detail.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3">Chargement…</p>
        </div>
    `;

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

async function reloadListOnly(pairName, id = null) {
    const list = document.querySelector(
        `[data-partial-list][data-dashboard-pair="${pairName}"]`
    );
    if (!list) return;

    const urlList = list.dataset.listUrl;
    if (!urlList) return;

    try {
        const res = await fetch(urlList);
        if (!res.ok) throw new Error("HTTP " + res.status);

        list.innerHTML = await res.text();

        // Restore selection
        if (id) {
            const newSelected = list.querySelector(
                `input[type="radio"][data-id="${id}"]`
            );
            if (newSelected) {
                newSelected.checked = true;
                newSelected.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }

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



// ============================================================================
//  MAKE THEM GLOBAL (optional but consistent with your pattern)
// ============================================================================
window.reloadListOnly = reloadListOnly;
window.reloadDetailOnly = reloadDetailOnly;


class DashboardPair {
    constructor(name, listContainer, detailContainer) {
        this.name = name;
        this.listContainer = listContainer;
        this.detailContainer = detailContainer;

        this.listUrl = listContainer.dataset.listUrl;
        this.detailUrlTemplate = detailContainer.dataset.detailUrlTemplate;

        this.currentId = null;

        this.init();
    }

    init() {
        if (this.listUrl) {
            this.loadList();
        }
    }

    // -------------------------------
    // Load LIST partial
    // -------------------------------
    async loadList() {
        this.listContainer.innerHTML = this._renderLoader("Chargement de la liste...");

        try {
            const response = await fetch(this.listUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            this.listContainer.innerHTML = await response.text();

            // Dispatch event in case some JS wants to hook on list load
            document.dispatchEvent(new CustomEvent('partial:list:loaded', {
                detail: {
                    pair: this.name,
                    container: this.listContainer
                }
            }));

            this._bindListEvents();

        } catch (err) {
            console.error(`Erreur chargement liste [${this.name}]`, err);
            this.listContainer.innerHTML = `
                <div class="text-danger p-3">
                    Erreur lors du chargement de la liste.
                </div>
            `;
        }
    }

    _bindListEvents() {
        const radios = this.listContainer.querySelectorAll('input[type="radio"][data-id]');
        if (!radios.length) return;

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                const id = radio.dataset.id;
                this.currentId = id;
                this.loadDetail(id);
            });
        });
    }

    // -------------------------------
    // Load DETAIL partial
    // -------------------------------
    async loadDetail(id) {
        if (!id) return;
        if (!this.detailUrlTemplate) return;

        const url = this.detailUrlTemplate.replace('__ID__', encodeURIComponent(id));

        this.detailContainer.innerHTML = this._renderLoader("Chargement du détail...");

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            this.detailContainer.innerHTML = await response.text();

            // Notify specific partial JS (classDetails.js, trainingPartial.js, etc.)
            document.dispatchEvent(new CustomEvent('partial:loaded', {
                detail: {
                    pair: this.name,
                    container: this.detailContainer
                }
            }));

        } catch (err) {
            console.error(`Erreur chargement détail [${this.name}]`, err);
            this.detailContainer.innerHTML = `
                <div class="text-danger p-3">
                    Erreur lors du chargement du détail.
                </div>
            `;
        }
    }

    // Reuse from elsewhere if needed
    reloadCurrentDetail() {
        if (this.currentId) {
            this.loadDetail(this.currentId);
        }
    }

    _renderLoader(text) {
        return `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-3">${text}</p>
            </div>
        `;
    }
}


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

// Globals
window.resetButtons = resetButtons;
window.enableButtons = enableButtons;
