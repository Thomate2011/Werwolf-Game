// Spezifisches JavaScript für die karten.html Seite
document.addEventListener('DOMContentLoaded', () => {
    const playerNameEl = document.getElementById("player-name");
    const roleNameEl = document.getElementById("role-name");
    const cardRevealBtn = document.getElementById("card-reveal-btn");
    const showDescriptionBtn = document.getElementById("show-description-btn");
    const nextPlayerBtn = document.getElementById("next-player-btn");
    const overviewBtn = document.getElementById("overview-btn");
    const overviewPopup = document.getElementById("final-popup");

    let currentRoleDescription = "";

    async function fetchNextCard() {
        try {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();

            if (response.ok) {
                playerNameEl.textContent = data.player_name;
                roleNameEl.textContent = "?";
                cardRevealBtn.style.display = 'block';
                showDescriptionBtn.style.display = 'none';
                nextPlayerBtn.style.display = 'none';
                overviewBtn.style.display = 'none';
            } else {
                overviewPopup.style.display = 'block';
                document.getElementById('overlay').style.display = 'block';
            }
        } catch (error) {
            console.error("Fehler beim Abrufen der nächsten Karte:", error);
            alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
    }

    cardRevealBtn.onclick = async () => {
        try {
            const response = await fetch('/api/game/reveal_and_next', {
                method: 'POST',
            });
            const data = await response.json();

            if (response.ok) {
                roleNameEl.textContent = data.role_name;
                currentRoleDescription = data.role_description;
                cardRevealBtn.style.display = 'none';
                showDescriptionBtn.style.display = 'block';
                if (data.is_last_card) {
                    overviewBtn.style.display = 'block';
                } else {
                    nextPlayerBtn.style.display = 'block';
                }
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Fehler beim Aufdecken der Karte:", error);
            alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
    };

    showDescriptionBtn.onclick = () => {
        window.showInfo(roleNameEl.textContent);
    };

    nextPlayerBtn.onclick = () => {
        fetchNextCard();
    };

    fetchNextCard();
});