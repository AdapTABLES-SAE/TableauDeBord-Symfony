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
