// Allgemeine Funktionen für alle Seiten
async function showInfo(role) {
    const popup = document.getElementById('info-popup');
    const overlay = document.getElementById('overlay');
    const response = await fetch('/api/get_roles_and_players');
    const data = await response.json();
    const roleDescription = data.all_roles[role] || "Keine Erklärung verfügbar.";
    document.getElementById('popup-role-name').textContent = role;
    document.getElementById('popup-role-description').textContent = roleDescription;
    popup.style.display = 'block';
    overlay.style.display = 'block';
}

function hideInfo() {
    document.getElementById('info-popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// Funktionen für die Rollen-Seite (rollen.html)
if (document.body.classList.contains('rollen-page')) {
    let rolesCount = {};
    let totalPlayers = 0;
    let allRolesDescriptions = {};
    const rolesContainer = document.getElementById("roles-container");

    async function fetchData() {
        const response = await fetch('/api/get_roles_and_players');
        const data = await response.json();
        rolesCount = data.saved_roles;
        totalPlayers = data.player_count;
        allRolesDescriptions = data.all_roles;
        document.getElementById("player-count").textContent = totalPlayers;
        renderRoles();
    }

    function renderRoles() {
        rolesContainer.innerHTML = '';
        const allRoles = Object.keys(allRolesDescriptions);
        for (const role of allRoles) {
            const count = rolesCount[role] || 0;
            const div = document.createElement('div');
            div.className = 'role-list-item';
            div.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span>${role}</span>
                    <button onclick="showInfo('${role}')" class="role-info-btn">i</button>
                </div>
                <div>
                    <button onclick="decrementRole('${role}')" class="role-counter-btn">-</button>
                    <span id="${role}-count">${count}</span>
                    <button onclick="incrementRole('${role}')" class="role-counter-btn">+</button>
                </div>
            `;
            rolesContainer.appendChild(div);
        }
        updateRolesToGo();
    }

    function updateRolesToGo() {
        const totalRolesSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
        const remainingRoles = totalPlayers - totalRolesSelected;
        document.getElementById("roles-to-go").textContent = remainingRoles;
        if (remainingRoles === 0) {
            document.getElementById("start-button").style.display = 'inline-block';
        } else {
            document.getElementById("start-button").style.display = 'none';
        }
    }

    function incrementRole(role) {
        if (!rolesCount[role]) {
            rolesCount[role] = 0;
        }
        if (Object.values(rolesCount).reduce((a, b) => a + b, 0) < totalPlayers) {
            rolesCount[role]++;
            document.getElementById(role + '-count').textContent = rolesCount[role];
            updateRolesToGo();
            saveRoles();
        }
    }

    function decrementRole(role) {
        if (rolesCount[role] > 0) {
            rolesCount[role]--;
            document.getElementById(role + '-count').textContent = rolesCount[role];
            updateRolesToGo();
            saveRoles();
        }
    }

    function saveRoles() {
        fetch('/api/game/save_roles', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 'role_counts': rolesCount })
        });
    }

    async function startGame() {
        const response = await fetch('/api/game/roles', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 'role_counts': rolesCount })
        });
        const result = await response.json();
        if (response.ok) {
            window.location.href = 'karten.html';
        } else {
            alert(result.error);
        }
    }
    
    document.getElementById("start-button").addEventListener('click', startGame);

    document.addEventListener('DOMContentLoaded', fetchData);
}

// Funktionen für die Karten-Seite (karten.html)
if (document.body.classList.contains('karten-page')) {
    let currentRoleData = null;
    let isRevealed = false;

    async function fetchCurrentPlayer() {
        const response = await fetch('/api/game/next_card');
        const data = await response.json();
        if (response.ok) {
            if (data.message) {
                window.location.href = 'neustart.html';
            } else {
                document.getElementById('player-name').textContent = data.player_name;
                document.getElementById('reveal-role-btn').style.display = 'inline-block';
                isRevealed = false;
            }
        }
    }
    
    async function revealCard() {
        const response = await fetch('/api/game/reveal_and_next', { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            currentRoleData = data;
            document.getElementById('role-name').textContent = data.role_name;
            document.getElementById('role-name').style.display = 'block';
            document.getElementById('reveal-role-btn').style.display = 'none';
            document.getElementById('show-description-btn').style.display = 'inline-block';
            document.getElementById('next-player-btn').style.display = 'inline-block';
            isRevealed = true;
        } else {
            alert(data.error);
        }
    }

    function showDescription() {
        if (currentRoleData && isRevealed) {
            document.getElementById('role-description').textContent = currentRoleData.role_description;
            document.getElementById('role-description').style.display = 'block';
            document.getElementById('show-description-btn').style.display = 'none';
        }
    }

    function nextPlayer() {
        window.location.reload();
    }

    document.getElementById('reveal-role-btn').addEventListener('click', revealCard);
    document.getElementById('show-description-btn').addEventListener('click', showDescription);
    document.getElementById('next-player-btn').addEventListener('click', nextPlayer);

    window.onload = fetchCurrentPlayer;
}

// Funktionen für die Neustart-Seite (neustart.html)
if (document.body.classList.contains('neustart-page')) {
    let allRolesDescriptions = {};

    async function fetchPlayerList() {
        const response = await fetch('/api/get_player_list');
        const data = await response.json();
        if (response.ok) {
            const playerListDiv = document.getElementById('player-list');
            playerListDiv.innerHTML = '';
            allRolesDescriptions = data.ALL_ROLES;
            data.players.forEach(player => {
                const div = document.createElement('div');
                div.className = `player-list-item ${player.status}`;
                div.innerHTML = `
                    <span onclick="killPlayer('${player.name}')">
                        <b>${player.role}</b> | ${player.name}
                    </span>
                    <button onclick="showInfoNeustart('${player.role}')" class="role-info-btn">i</button>
                `;
                playerListDiv.appendChild(div);
            });
        }
    }

    async function killPlayer(playerName) {
        const confirmKill = confirm(`Spieler '${playerName}' als 'tot' markieren?`);
        if (confirmKill) {
            const killResponse = await fetch(`/api/gamemaster/kill/` + playerName, { method: 'PUT' });
            if (killResponse.ok) {
                window.location.reload();
            } else {
                alert('Fehler beim Markieren des Spielers.');
            }
        }
    }

    async function restartGame() {
        const response = await fetch('/api/game/restart', { method: 'POST' });
        const result = await response.json();
        alert(result.message);
        window.location.href = 'rollen.html';
    }

    function showInfoNeustart(role) {
        const popup = document.getElementById('info-popup');
        const overlay = document.getElementById('overlay');
        document.getElementById('popup-role-name').textContent = role;
        document.getElementById('popup-role-description').textContent = allRolesDescriptions[role] || "Keine Erklärung verfügbar.";
        popup.style.display = 'block';
        overlay.style.display = 'block';
    }

    function hideInfoNeustart() {
        document.getElementById('info-popup').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }

    window.onload = fetchPlayerList;
}