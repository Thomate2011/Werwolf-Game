document.addEventListener('DOMContentLoaded', function() {
    const showRoleBtn = document.getElementById('show-role-btn');
    const showDescriptionBtn = document.getElementById('show-description-btn');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const overviewBtn = document.getElementById('overview-btn');
    const coverCard = document.getElementById('cover-card');
    const roleInfo = document.getElementById('role-info');
    const playerNameDisplay = document.getElementById('player-name');
    const roleNameDisplay = document.getElementById('role-name');
    const roleDescriptionDisplay = document.getElementById('role-description');
    const finalPopup = document.getElementById('final-popup');
    const overlay = document.getElementById('overlay');

    let isDescriptionShown = false;

    async function fetchNextCard() {
        try {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();

            if (data.message) {
                // Alle Karten wurden gezeigt
                showFinalPopup();
            } else {
                playerNameDisplay.textContent = data.player_name;
                resetCardView();
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der nächsten Karte:', error);
        }
    }

    async function revealRole() {
        try {
            const response = await fetch('/api/game/reveal_and_next', { method: 'POST' });
            const data = await response.json();

            if (data.error) {
                console.error(data.error);
                return;
            }

            roleNameDisplay.textContent = data.role_name;
            roleDescriptionDisplay.textContent = data.role_description;

            // Karte umdrehen
            coverCard.style.transform = 'rotateY(180deg)';
            roleInfo.style.transform = 'rotateY(0deg)';

            // Button-Sichtbarkeit anpassen
            showRoleBtn.style.display = 'none';
            showDescriptionBtn.style.display = 'inline-block';
            nextPlayerBtn.style.display = data.is_last_card ? 'none' : 'inline-block';
            overviewBtn.style.display = data.is_last_card ? 'inline-block' : 'none';

        } catch (error) {
            console.error('Fehler beim Aufdecken der Rolle:', error);
        }
    }

    function resetCardView() {
        coverCard.style.transform = 'rotateY(0deg)';
        roleInfo.style.transform = 'rotateY(-180deg)';
        showRoleBtn.style.display = 'inline-block';
        showDescriptionBtn.style.display = 'none';
        nextPlayerBtn.style.display = 'none';
        overviewBtn.style.display = 'none';
        isDescriptionShown = false;
    }
    
    function showFinalPopup() {
        finalPopup.style.display = 'block';
        overlay.style.display = 'block';
    }

    showRoleBtn.addEventListener('click', revealRole);

    showDescriptionBtn.addEventListener('click', function() {
        isDescriptionShown = !isDescriptionShown;
        if (isDescriptionShown) {
            roleInfo.style.transform = 'rotateY(0deg)';
            coverCard.style.transform = 'rotateY(180deg)';
        } else {
            roleInfo.style.transform = 'rotateY(-180deg)';
            coverCard.style.transform = 'rotateY(0deg)';
        }
    });

    nextPlayerBtn.addEventListener('click', fetchNextCard);
    overviewBtn.addEventListener('click', function() {
        window.location.href = '/neustart';
    });

    // Startet den Prozess, indem die erste Karte geladen wird
    fetchNextCard();
});