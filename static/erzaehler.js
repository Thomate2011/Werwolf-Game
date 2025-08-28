document.addEventListener('DOMContentLoaded', () => {
    const round1Btn = document.getElementById('round-1-btn');
    const round2Btn = document.getElementById('round-2-btn');
    const narratorTextContainer = document.getElementById('narrator-text');

    const fetchNarratorText = async (roundNumber) => {
        const response = await fetch(`/api/narrator_text/${roundNumber}`);
        const data = await response.json();

        if (data.error) {
            narratorTextContainer.innerHTML = `<p class="error-message">${data.error}</p>`;
            return;
        }

        narratorTextContainer.innerHTML = '';
        data.text_blocks.forEach(block => {
            const div = document.createElement('div');
            div.classList.add('text-block');
            div.innerHTML = `
                <div class="narrator-role">${block.role}</div>
                <div class="narrator-text-content">${block.text}</div>
            `;
            narratorTextContainer.appendChild(div);
        });
    };

    round1Btn.addEventListener('click', () => fetchNarratorText(1));
    round2Btn.addEventListener('click', () => fetchNarratorText(2));

    // Optional: Fetch round 1 text on page load
    fetchNarratorText(1);
});