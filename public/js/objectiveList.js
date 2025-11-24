let available = [];
let selected = [];
let selectedItem = null;

// Activer la sélection visuelle
function enableSelection() {
    document.querySelectorAll('.selectable-level').forEach(el => {
        el.onclick = () => {
            document.querySelectorAll('.selectable-level')
                .forEach(x => x.classList.remove('level-selected'));

            el.classList.add('level-selected');

            selectedItem = {
                id: el.dataset.id,
                name: el.innerText
            };
        };
    });
}

// Rafraîchir l'affichage
function render() {
    const left = document.getElementById('available-levels');
    const right = document.getElementById('selected-levels');

    left.innerHTML = '';
    right.innerHTML = '';

    available.forEach(item => {
        left.innerHTML += `
            <div class="selectable-level" data-id="${item.id}">
                ${item.name}
            </div>`;
    });

    selected.forEach(item => {
        right.innerHTML += `
            <div class="selectable-level" data-id="${item.id}">
                ${item.name}
            </div>`;
    });

    enableSelection();
}

// Initialisation
function initializeObjectiveList() {
    document.querySelectorAll('#available-levels .selectable-level').forEach(el => {
        available.push({
            id: el.dataset.id,
            name: el.innerText
        });
    });

    enableSelection();
}

// Ajouter →
function addLevel() {
    if (!selectedItem) return;

    available = available.filter(x => x.id !== selectedItem.id);
    if (!selected.some(x => x.id === selectedItem.id)) {
        selected.push(selectedItem);
    }
    selectedItem = null;

    render();
}

// Retirer ←
function removeLevel() {
    if (!selectedItem) return;

    selected = selected.filter(x => x.id !== selectedItem.id);
    if (!available.some(x => x.id === selectedItem.id)) {
        available.push(selectedItem);
    }
    selectedItem = null;

    render();
}

// Envoi du formulaire
function attachSubmit() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', () => {
        const input = document.getElementById('selected-levels-input');
        input.value = JSON.stringify(selected.map(x => x.id));
    });
}

function filterAvailableLevels(query) {
    const leftColumn = document.getElementById('available-levels');
    leftColumn.innerHTML = '';

    const normalized = query.trim().toLowerCase();

    const filtered = available.filter(item =>
        item.name.toLowerCase().includes(normalized)
    );

    filtered.forEach(item => {
        leftColumn.innerHTML += `
            <div class="selectable-level" data-id="${item.id}">
                ${item.name}
            </div>
        `;
    });

    enableSelection();
}

// Au chargement
document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('level-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterAvailableLevels(searchInput.value);
        });
    }

    initializeObjectiveList();

    document.getElementById('add-level').onclick = addLevel;
    document.getElementById('remove-level').onclick = removeLevel;

    attachSubmit();
});
