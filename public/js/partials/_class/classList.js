document.addEventListener('partial:list:loaded', (e) => {
    const { pair, container } = e.detail || {};
    if (pair !== "classes") return;
    if (!container) return;

    const modal = container.querySelector('#addClassModal');
    const btn = container.querySelector('#addClassConfirm');
    const form = container.querySelector('#addClassForm');

    if (!modal || !btn || !form) return;

    const modalInstance = bootstrap.Modal.getOrCreateInstance(modal);

    btn.addEventListener('click', async () => {
        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success) {
                modalInstance.hide();
                await window.reloadDashboardPair("classes");
            } else {
                alert("Erreur lors de l'ajout de la classe.");
            }
        } catch (err) {
            console.error("Erreur ajout classe:", err);
            alert("Erreur réseau lors de l'ajout de la classe.");
        }
    });
});
