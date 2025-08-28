document.addEventListener('DOMContentLoaded', async function() {
    const textContainer = document.getElementById('narrator-text-container');
    const prevBtn = document.getElementById('previous-text-btn');
    const nextBtn = document.getElementById('next-text-btn');
    const round1Btn = document.getElementById('round-1-btn');
    const round2Btn = document.getElementById('round-2-btn');

    let narratorText = [];
    let currentTextIndex = 0;
    let currentRound = 1;

    async function fetchNarratorText(round) {
        try {
            const response = await fetch(`/api/narrator_text/${round}`);
            const data = await response.json();
            if (response.ok) {
                narratorText = data.text_blocks;
                currentTextIndex = 0;
                displayCurrentText();
                updateNavigationButtons();
            } else {
                textContainer.innerHTML = `<p>${data.error}</p>`;
            }
        } catch (error) {
            textContainer.innerHTML = '<p>Fehler beim Laden der Erzählertexte.</p>';
        }
    }

    function displayCurrentText() {
        if (narratorText.length > 0) {
            const currentBlock = narratorText[currentTextIndex];
            textContainer.innerHTML = `
                <h3>${currentBlock.role}</h3>
                <p>${currentBlock.text}</p>
            `;
        }
    }

    function updateNavigationButtons() {
        prevBtn.style.display = currentTextIndex > 0 ? 'inline-block' : 'none';
        nextBtn.textContent = currentTextIndex < narratorText.length - 1 ? 'Nächster Text' : 'Zur Übersicht';
    }

    nextBtn.addEventListener('click', function() {
        if (currentTextIndex < narratorText.length - 1) {
            currentTextIndex++;
            displayCurrentText();
            updateNavigationButtons();
        } else {
            window.location.href = '/neustart';
        }
    });

    prevBtn.addEventListener('click', function() {
        if (currentTextIndex > 0) {
            currentTextIndex--;
            displayCurrentText();
            updateNavigationButtons();
        }
    });
    
    round1Btn.addEventListener('click', () => {
        currentRound = 1;
        round1Btn.classList.remove('secondary-button');
        round1Btn.classList.add('primary-button');
        round2Btn.classList.remove('primary-button');
        round2Btn.classList.add('secondary-button');
        fetchNarratorText(currentRound);
    });
    
    round2Btn.addEventListener('click', () => {
        currentRound = 2;
        round2Btn.classList.remove('secondary-button');
        round2Btn.classList.add('primary-button');
        round1Btn.classList.remove('primary-button');
        round1Btn.classList.add('secondary-button');
        fetchNarratorText(currentRound);
    });

    // Startet die Anzeige mit der ersten Runde
    fetchNarratorText(currentRound);
});