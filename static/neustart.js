// Spezifisches JavaScript für die neustart.html Seite
document.addEventListener('DOMContentLoaded', () => {
    const playerList = document.getElementById('player-list');
    const restartBtn = document.getElementById('restart-btn');
    const infoPopup = document.getElementById('info-popup');
    const togglePopup = document.getElementById('toggle-popup');
    let selectedPlayer = null;
    let selectedPlayerEl = null;

    async function loadPlayers() {
        try {
            const response = await fetch('/api/gamemaster/view');
            if (!response.ok) throw new Error('Failed to fetch players view.');
            const players = await response.json();

            playerList.innerHTML = '';
            players.forEach(player => {
                const playerItem = document.createElement('li');
                playerItem.classList.add('player-item', player.status);
                playerItem.innerHTML = `
                    <span class="player-name">${player.name}</span>
                    <span class="player-role">${player.role}</span>
                    <div class="buttons">
                        <button class="toggle-status-btn" data-player-name="${player.name}">${player.status === 'alive' ? 'Töten' : 'Beleben'}</button>
                        <button class="info-btn" data-role="${player.role}">i</button>
                    </div>
                `;

                playerItem.querySelector('.toggle-status-btn').addEventListener('click', () => {
                    showTogglePopup(player.name, player.role, playerItem);
                });

                playerItem.querySelector('.info-btn').addEventListener('click', () => {
                    window.showInfo(player.role);
                });

                playerList.appendChild(playerItem);
            });
        } catch (error) {
            console.error("Fehler beim Laden der Spielerübersicht:", error);
            alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
    }

    function showTogglePopup(playerName, playerRole, playerEl) {
        selectedPlayer = playerName;
        selectedPlayerEl = playerEl;
        const popupTitle = document.getElementById('toggle-popup-title');
        const popupDescription = document.getElementById('toggle-popup-description');

        let statusAction = playerEl.classList.contains('alive') ? 'töten' : 'beleben';
        popupTitle.textContent = `Spieler ${statusAction}: ${playerName}`;
        popupDescription.textContent = `Möchtest du wirklich den Spieler ${playerName} mit der Rolle ${playerRole} ${statusAction}?`;

        window.showPopup('toggle-popup');
    }

    document.getElementById('confirm-toggle-btn').addEventListener('click', async () => {
        if (!selectedPlayer) return;
        try {
            const response = await fetch(`/api/gamemaster/toggle_status/${selectedPlayer}`, {
                method: 'PUT'
            });

            if (response.ok) {
                loadPlayers();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error("Fehler beim Statuswechsel:", error);
            alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
        window.hidePopup('toggle-popup');
    });

    document.getElementById('cancel-toggle-btn').addEventListener('click', () => {
        window.hidePopup('toggle-popup');
    });

    restartBtn.addEventListener('click', async () => {
        if (confirm("Möchtest du das Spiel wirklich neu starten? Alle aktuellen Rollenzuweisungen und Spielstände gehen verloren.")) {
            try {
                const response = await fetch('/api/game/restart', {
                    method: 'POST'
                });
                if (response.ok) {
                    window.location.href = '/spiel';
                } else {
                    const data = await response.json();
                    alert(data.error);
                }
            } catch (error) {
                console.error("Fehler beim Neustart des Spiels:", error);
                alert("Ein unerwarteter Fehler ist aufgetreten.");
            }
        }
    });

    loadPlayers();
});