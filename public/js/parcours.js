// ---------- TABLES MODAL ----------
let currentObjectifId = null;

window.openTablesModal = function (objectifId, selectedTables) {
    currentObjectifId = objectifId;

    // Sécurise la valeur reçue depuis Twig
    if (!Array.isArray(selectedTables)) {
        selectedTables = [];
    }

    const modal = document.getElementById('tablesModal');
    const form  = document.getElementById('tablesForm');

    // Action = route POST de l'objectif ciblé
    form.setAttribute('action', `/objectif/${objectifId}/edit-tables`);

    // (Re)cocher selon l’état actuel
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const v = parseInt(cb.value, 10);
        cb.checked = selectedTables.includes(v);
    });

    modal.classList.remove('hidden'); // afficher
};

window.closeTablesModal = function () {
    document.getElementById('tablesModal').classList.add('hidden');
};


// ---------- TACHES MODAL ----------
window.openTasksModal = function (niveauId) {
    currentNiveauId = niveauId;

    // Cacher toutes les listes de tâches
    document.querySelectorAll('.tasks-container').forEach(c => c.classList.add('hidden'));

    // Afficher uniquement celle du bon niveau
    const container = document.querySelector(`.tasks-container[data-list-for="${niveauId}"]`);
    if (container) container.classList.remove('hidden');

    // Afficher la modal
    const modal = document.getElementById('tasksModal');
    modal.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    const btnCloseTasks = document.getElementById('btnCloseTasks');
    if (btnCloseTasks) {
        btnCloseTasks.addEventListener('click', () => {
            document.getElementById('tasksModal').classList.add('hidden');
        });
    }
});
