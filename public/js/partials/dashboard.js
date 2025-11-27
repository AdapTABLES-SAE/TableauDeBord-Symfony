document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {

        tab.addEventListener("shown.bs.tab", (event) => {
            const targetPane = event.target.dataset.bsTarget;

            let pairName = null;

            if (targetPane === "#classes-pane") {
                pairName = "classes";
            } else if (targetPane === "#trainings-pane") {
                pairName = "trainings";
            }

            if (!pairName) return;

            // Load the pair when switching tabs
            window.reloadDashboardPair(pairName);
        });
    });

});
