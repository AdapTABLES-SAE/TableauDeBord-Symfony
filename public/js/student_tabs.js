document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tab-button');
    const tabs = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
});
