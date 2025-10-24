
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
                const fetchURL = `${fetchURL_1}${elementId}${fetchURL_2}`;
                const response = await fetch(fetchURL);
                if (!response.ok) throw new Error('Erreur réseau');
                const html = await response.text();

                detailContainer.innerHTML = html;
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
