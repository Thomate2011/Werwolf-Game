document.addEventListener('DOMContentLoaded', function() {
    const rolesListContainer = document.getElementById('roles-list-container');
    const rolesCountDisplay = document.getElementById('roles-count-display');
    const startBtn = document.getElementById('start-game-btn');
    const playerCount = parseInt(document.getElementById('player-count-display').textContent);

    let selectedRoles = {};
    let specialRoles = {};

    function updateRolesCount() {
        const count = Object.values(selectedRoles).reduce((sum, current) => sum + current, 0);
        rolesCountDisplay.textContent = count;
        startBtn.disabled = count !== playerCount;
    }

    // Funktion zum Abrufen der Rollen und Spieler von der API
    async function fetchRolesAndPlayers() {
        try {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            
            // Spieleranzahl und Rollen aktualisieren
            document.getElementById('player-count-display').textContent = data.player_count;
            
            // Gespeicherte Rollen laden
            selectedRoles = data.saved_roles;
            updateRolesCount();
            
            // Rollen-UI generieren
            generateRolesList(data.all_roles);
        } catch (error) {
            console.error('Fehler beim Abrufen der Rollen:', error);
        }
    }

    function generateRolesList(allRoles) {
        rolesListContainer.innerHTML = '';
        const sortedRoles = Object.keys(allRoles).sort();
        
        sortedRoles.forEach(role => {
            const roleContainer = document.createElement('div');
            roleContainer.className = 'role-item';
            
            const roleName = document.createElement('span');
            roleName.className = 'role-name';
            roleName.textContent = role;
            
            const roleCounter = document.createElement('div');
            roleCounter.className = 'role-counter-group';
            
            const minusBtn = document.createElement('button');
            minusBtn.textContent = '-';
            minusBtn.className = 'role-btn';
            minusBtn.addEventListener('click', () => {
                if (selectedRoles[role] > 0) {
                    selectedRoles[role]--;
                    if (selectedRoles[role] === 0) {
                        delete selectedRoles[role];
                    }
                    updateRolesCount();
                    saveRolesToSession();
                    updateCounterDisplay(role, selectedRoles[role] || 0);
                }
            });
            
            const countDisplay = document.createElement('span');
            countDisplay.className = 'role-count';
            countDisplay.id = `count-${role}`;
            countDisplay.textContent = selectedRoles[role] || 0;
            
            const plusBtn = document.createElement('button');
            plusBtn.textContent = '+';
            plusBtn.className = 'role-btn';
            plusBtn.addEventListener('click', () => {
                if (Object.values(selectedRoles).reduce((sum, current) => sum + current, 0) < playerCount) {
                    selectedRoles[role] = (selectedRoles[role] || 0) + 1;
                    updateRolesCount();
                    saveRolesToSession();
                    updateCounterDisplay(role, selectedRoles[role]);
                }
            });
            
            const infoBtn = document.createElement('button');
            infoBtn.textContent = 'i';
            infoBtn.className = 'role-info-btn';
            infoBtn.title = allRoles[role];

            roleCounter.appendChild(minusBtn);
            roleCounter.appendChild(countDisplay);
            roleCounter.appendChild(plusBtn);
            
            roleContainer.appendChild(roleName);
            roleContainer.appendChild(roleCounter);
            roleContainer.appendChild(infoBtn);
            
            rolesListContainer.appendChild(roleContainer);
        });
    }

    function updateCounterDisplay(role, count) {
        const display = document.getElementById(`count-${role}`);
        if (display) {
            display.textContent = count;
        }
    }

    // Funktion zum Speichern der Rollen in der Session
    async function saveRolesToSession() {
        try {
            await fetch('/api/game/save_roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role_counts: selectedRoles })
            });
        } catch (error) {
            console.error('Fehler beim Speichern der Rollen:', error);
        }
    }

    // Event-Listener für den "Spiel starten"-Button
    startBtn.addEventListener('click', async function() {
        try {
            // Spezielle Rollen für Dieb und Gaukler bestimmen, falls vorhanden
            if (selectedRoles['Dieb']) {
                const availableRoles = Object.keys(ALL_ROLES).filter(r => r !== 'Dieb');
                specialRoles['dieb_roles'] = availableRoles.slice(0, 2);
            }
            if (selectedRoles['Der Gaukler']) {
                const availableRoles = Object.keys(ALL_ROLES).filter(r => r !== 'Der Gaukler');
                specialRoles['gaukler_roles'] = availableRoles.slice(0, 3);
            }
            
            await fetch('/api/game/save_special_roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(specialRoles)
            });

            const response = await fetch('/api/game/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role_counts: selectedRoles, special_roles: specialRoles })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                window.location.href = '/karten';
            } else {
                alert('Fehler: ' + data.error);
            }
        } catch (error) {
            console.error('Fehler beim Starten des Spiels:', error);
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
    });

    fetchRolesAndPlayers();
});