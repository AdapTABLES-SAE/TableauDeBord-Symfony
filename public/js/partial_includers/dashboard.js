// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Find all pairs by their list container
    const listContainers = document.querySelectorAll('[data-partial-list]');

    listContainers.forEach(listContainer => {
        const pairName = listContainer.dataset.dashboardPair;
        if (!pairName) return;

        const detailContainer = document.querySelector(
            `[data-partial-detail][data-dashboard-pair="${pairName}"]`
        );
        if (!detailContainer) return;

        new DashboardPair(pairName, listContainer, detailContainer);
    });
});

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

            // Notify specific partial JS (classeDetails.js, trainingPartial.js, etc.)
            document.dispatchEvent(new CustomEvent('partial:loaded', {
                detail: {
                    pair: this.name,
                    container: this.detailContainer,
                    id: id
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
