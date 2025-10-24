
document.addEventListener('DOMContentLoaded', () => {
    const radios = document.querySelectorAll('.element-list input[type="radio"]');
    const detailContainer = document.getElementById('element-detail');

    if (!radios.length || !detailContainer) return;

    radios.forEach(radio => {
        radio.addEventListener('change', async () => {
            const elementId = radio.dataset.id;

            // Show a loading spinner
            detailContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-3">Chargement...</p>
                </div>
            `;

            try {
                // Given in twig (ex):
                // // const fetchUrlTemplate = '/api/student/{id}/edit';

                const fetchURL = interpolate(fetchUrlTemplate, {"id": elementId});
                const response = await fetch(fetchURL);
                if (!response.ok) throw new Error('Erreur réseau');
                detailContainer.innerHTML = await response.text();

                // Custom event
                document.dispatchEvent(new CustomEvent('partial:loaded', {
                    detail: { target: detailContainer }
                }));
            } catch (error) {
                detailContainer.innerHTML = `
                    <div class="text-danger p-3">Erreur lors du chargement de l’élément.</div>
                `;
                console.error('Erreur AJAX:', error);
            }
        });
    });
});

function interpolate(template, vars) {
    return template.replace(/\{([^}]+)}/g, (_, key) => {
        const value = vars[key.trim()];
        return value !== undefined ? value : `{${key}}`; // garde {clé} si manquant
    });
}
