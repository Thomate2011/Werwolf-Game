// Spezifisches JavaScript für die erzaehler.html Seite
document.addEventListener('DOMContentLoaded', () => {
    const roundSelect = document.getElementById('round-select');
    const textContainer = document.getElementById('narrator-text-container');
    const refreshBtn = document.getElementById('refresh-btn');

    async function loadNarratorText() {
        const round = roundSelect.value;
        if (!round) return;

        try {
            const response = await fetch(`/api/narrator_text/${round}`);
            const data = await response.json();

            if (response.ok) {
                textContainer.innerHTML = '';
                data.text_blocks.forEach(block => {
                    const blockDiv = document.createElement('div');
                    blockDiv.classList.add('text-block');
                    blockDiv.innerHTML = `<h3>${block.role}</h3><p>${block.text}</p>`;
                    textContainer.appendChild(blockDiv);
                });
            } else {
                textContainer.innerHTML = `<p class="error">${data.error}</p>`;
            }
        } catch (error) {
            console.error("Fehler beim Laden des Erzählertextes:", error);
            textContainer.innerHTML = `<p class="error">Ein unerwarteter Fehler ist aufgetreten.</p>`;
        }
    }

    roundSelect.addEventListener('change', loadNarratorText);
    refreshBtn.addEventListener('click', loadNarratorText);
    loadNarratorText();
});