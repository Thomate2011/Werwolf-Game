document.addEventListener('DOMContentLoaded', () => {
    // Funktionen, die auf allen Seiten benötigt werden
    window.showInfo = async (role) => {
        const popup = document.getElementById('info-popup');
        const overlay = document.getElementById('overlay');
        const response = await fetch('/api/get_roles_and_players');
        const data = await response.json();
        const roleDescription = data.all_roles[role] || "Keine Erklärung verfügbar.";
        document.getElementById('popup-role-name').textContent = role;
        document.getElementById('popup-role-description').textContent = roleDescription;
        popup.style.display = 'block';
        overlay.style.display = 'block';
    };
    window.hideInfo = () => {
        const popup = document.getElementById('info-popup');
        const overlay = document.getElementById('overlay');
        popup.style.display = 'none';
        overlay.style.display = 'none';
    };

    // Rollen-Seite (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const rolesContainer = document.getElementById("roles-container");
        const rolesToGoEl = document.getElementById("roles-to-go");
        const startButtons = document.querySelectorAll(".start-button");
        const playerCounterEl = document.getElementById("player-count");

        let rolesCount = {};
        let totalPlayers = 0;
        let allRolesDescriptions = {};
        
        async function fetchData() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            rolesCount = data.saved_roles;
            totalPlayers = data.player_count;
            allRolesDescriptions = data.all_roles;
            playerCounterEl.textContent = totalPlayers;
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
                        <button onclick="incrementRole('${role}')" class="role-counter-btn">+</button>
                        <span id="${role}-count">${count}</span>
                        <button onclick="decrementRole('${role}')" class="role-counter-btn">-</button>
                    </div>
                `;
                rolesContainer.appendChild(div);
            }
            updateRolesToGo();
        }

        function updateRolesToGo() {
            const totalRolesSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
            const remainingRoles = totalPlayers - totalRolesSelected;
            rolesToGoEl.textContent = `Noch ${remainingRoles} Rollen zu vergeben`;
            
            if (remainingRoles === 0) {
                startButtons.forEach(btn => btn.style.display = 'inline-block');
            } else {
                startButtons.forEach(btn => btn.style.display = 'none');
            }
        }

        window.incrementRole = (role) => {
            if (!rolesCount[role]) {
                rolesCount[role] = 0;
            }
            if (Object.values(rolesCount).reduce((a, b) => a + b, 0) < totalPlayers) {
                rolesCount[role]++;
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }
        };

        window.decrementRole = (role) => {
            if (rolesCount[role] > 0) {
                rolesCount[role]--;
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }
        };

        function saveRoles() {
            fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 'role_counts': rolesCount })
            });
        }

        window.startGame = async () => {
            const response = await fetch('/api/game/roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 'role_counts': rolesCount })
            });
            const result = await response.json();
            if (response.ok) {
                window.location.href = '/karten';
            } else {
                alert(result.error);
            }
        };
        
        startButtons.forEach(btn => btn.addEventListener('click', startGame));
        fetchData();
    }

    // Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        let currentRoleData = null;
        let isRevealed = false;
        const revealBtn = document.getElementById('reveal-role-btn');
        const showDescBtn = document.getElementById('show-description-btn');
        const nextBtn = document.getElementById('next-player-btn');
        
        window.fetchCurrentPlayer = async () => {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();
            if (response.ok) {
                if (data.message) {
                    // This is the trigger for the final pop-up
                    document.getElementById('final-popup').style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
                } else {
                    document.getElementById('player-name').textContent = data.player_name;
                    revealBtn.style.display = 'inline-block';
                    showDescBtn.style.display = 'none';
                    nextBtn.style.display = 'none';
                    document.getElementById('role-name').style.display = 'none';
                    document.getElementById('role-description').style.display = 'none';
                    isRevealed = false;
                }
            }
        };
        
        window.revealCard = async () => {
            const response = await fetch('/api/game/reveal_and_next', { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                currentRoleData = data;
                document.getElementById('role-name').textContent = data.role_name;
                document.getElementById('role-name').style.display = 'block';
                revealBtn.style.display = 'none';
                showDescBtn.style.display = 'inline-block';
                nextBtn.style.display = 'inline-block';
                isRevealed = true;
            } else {
                alert(data.error);
            }
        };
    
        window.showDescription = () => {
            if (currentRoleData && isRevealed) {
                document.getElementById('role-description').textContent = currentRoleData.role_description;
                document.getElementById('role-description').style.display = 'block';
                showDescBtn.style.display = 'none';
            }
        };
    
        window.nextPlayer = () => {
            window.location.reload();
        };
    
        revealBtn.addEventListener('click', revealCard);
        showDescBtn.addEventListener('click', showDescription);
        nextBtn.addEventListener('click', nextPlayer);
        
        fetchCurrentPlayer();
    }

    // Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        let allRolesDescriptions = {};

        async function fetchRoles() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            allRolesDescriptions = data.all_roles;
        }

        window.toggleStatus = async (playerName) => {
            const response = await fetch(`/api/gamemaster/toggle_status/` + playerName, { method: 'PUT' });
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Fehler beim Ändern des Spielerstatus.');
            }
        };

        window.restartGame = async () => {
            const response = await fetch('/api/game/restart', { method: 'POST' });
            const result = await response.json();
            window.location.href = '/rollen';
        };
        
        window.showInfoNeustart = (role) => {
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            document.getElementById('popup-role-name').textContent = role;
            document.getElementById('popup-role-description').textContent = allRolesDescriptions[role] || "Keine Erklärung verfügbar.";
            popup.style.display = 'block';
            overlay.style.display = 'block';
        };

        window.hideInfoNeustart = () => {
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            popup.style.display = 'none';
            overlay.style.display = 'none';
        };
        fetchRoles();
    }
});