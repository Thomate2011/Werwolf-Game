document.addEventListener('DOMContentLoaded', () => {
    const playerList = document.getElementById('player-list');
    const gamemasterView = document.getElementById('gamemaster-view');

    const fetchPlayers = async () => {
        const response = await fetch('/api/gamemaster/view');
        const players = await response.json();
        renderPlayers(players);
    };

    const renderPlayers = (players) => {
        playerList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.classList.add('player-item');
            if (player.status === 'dead') {
                li.classList.add('dead');
            }
            li.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-role">${player.role}</span>
                    <div class="status-toggle" data-player-name="${player.name}" data-status="${player.status}">
                        <div class="status-indicator ${player.status}"></div>
                    </div>
                </div>
            `;
            playerList.appendChild(li);
        });
        setupStatusToggles();
    };

    const setupStatusToggles = () => {
        document.querySelectorAll('.status-toggle').forEach(toggle => {
            toggle.addEventListener('click', async (event) => {
                event.stopPropagation();
                const playerName = toggle.dataset.playerName;
                const response = await fetch(`/api/gamemaster/toggle_status/${playerName}`, {
                    method: 'PUT'
                });
                if (response.ok) {
                    fetchPlayers();
                } else {
                    alert("Fehler beim Umschalten des Status.");
                }
            });
        });
    };

    const restartGame = async () => {
        const confirmed = confirm("Möchten Sie das Spiel wirklich neu starten? Alle aktuellen Daten gehen verloren.");
        if (confirmed) {
            const response = await fetch('/api/game/restart', {
                method: 'POST'
            });
            if (response.ok) {
                window.location.href = '/spiel';
            } else {
                alert("Fehler beim Neustarten des Spiels.");
            }
        }
    };

    document.getElementById('restart-btn').addEventListener('click', restartGame);

    fetchPlayers();
});