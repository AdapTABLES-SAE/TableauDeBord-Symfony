export function showToast(success = true, title = '', message = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const closeBtn = toast.querySelector('.close-btn');

    // Récupère les textes par défaut depuis les data-attributes
    const defaultSuccessTitle = toast.dataset.successTitle;
    const defaultSuccessMessage = toast.dataset.successMessage;
    const defaultErrorTitle = toast.dataset.errorTitle;
    const defaultErrorMessage = toast.dataset.errorMessage;

    const isError = !success;
    toast.classList.toggle('error', isError);

    // Applique les textes (priorité : arguments > data-* > valeurs par défaut)
    toastTitle.textContent = title || (isError ? defaultErrorTitle : defaultSuccessTitle);
    toastMessage.textContent = message || (isError ? defaultErrorMessage : defaultSuccessMessage);

    toast.style.display = 'block';
    setTimeout(() => (toast.style.display = 'none'), 4000);

    closeBtn.addEventListener('click', () => (toast.style.display = 'none'));
}
