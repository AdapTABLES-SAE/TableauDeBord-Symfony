document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {

        tab.addEventListener("shown.bs.tab", (event) => {
            const targetPane = event.target.dataset.bsTarget;

            let pairName = null;
            let urlParam = null;

            if (targetPane === "#classes-pane") {
                pairName = "classes";
                urlParam = "classrooms";
            } else if (targetPane === "#trainings-pane") {
                pairName = "trainings";
                urlParam = "trainings";
            }

            if (!pairName || !urlParam) return;

            // 🔹 Update URL without navigation
            const url = new URL(window.location.href);
            url.searchParams.set("target", urlParam);
            history.pushState({ target: urlParam }, "", url.toString());

            // 🔹 Load the pair when switching tabs
            // window.reloadDashboardPair(pairName); //not used anymore cause first list item is selected on load
            window.reloadListOnly(pairName);
        });
    });
});
