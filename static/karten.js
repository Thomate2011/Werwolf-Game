document.addEventListener('DOMContentLoaded', () => {
    let currentPlayerIndex = 0;
    let isLastCard = false;
    
    const cardDisplay = document.getElementById('card-display');
    const playerNameEl = document.getElementById('player-name');
    const roleNameEl = document.getElementById('role-name');
    const roleDescriptionEl = document.getElementById('role-description');
    const startBtn = document.getElementById('start-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const showDescriptionBtn = document.getElementById('show-description-btn');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const overviewBtn = document.getElementById('overview-btn');
    const finalPopup = document.getElementById('final-popup');

    const showCardFront = (player) => {
        playerNameEl.textContent = player;
        roleNameEl.textContent = "???";
        roleDescriptionEl.textContent = "Drehe die Karte um, um deine Rolle zu sehen.";
        revealBtn.style.display = 'block';
        showDescriptionBtn.style.display = 'none';
        nextPlayerBtn.style.display = 'none';
        overviewBtn.style.display = 'none';
    };

    const showCardBack = (role, description) => {
        roleNameEl.textContent = role;
        roleDescriptionEl.textContent = description;
        revealBtn.style.display = 'none';
        showDescriptionBtn.style.display = 'block';
        nextPlayerBtn.style.display = 'block';
        if (isLastCard) {
            nextPlayerBtn.style.display = 'none';
            overviewBtn.style.display = 'block';
        }
    };

    const fetchNextPlayer = async () => {
        const response = await fetch('/api/game/next_card');
        const data = await response.json();
        if (data.message) {
            showPopup('final-popup', false);
        } else {
            showCardFront(data.player_name);
            currentPlayerIndex = data.current_player_index;
        }
    };

    const fetchAndReveal = async () => {
        const response = await fetch('/api/game/reveal_and_next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        showCardBack(data.role_name, data.role_description);
        isLastCard = data.is_last_card;
    };

    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        cardDisplay.style.display = 'block';
        fetchNextPlayer();
    });

    revealBtn.addEventListener('click', fetchAndReveal);
    nextPlayerBtn.addEventListener('click', fetchNextPlayer);
    showDescriptionBtn.addEventListener('click', () => {
        roleDescriptionEl.style.display = 'block';
    });
    overviewBtn.addEventListener('click', () => {
        window.location.href = '/neustart';
    });
});