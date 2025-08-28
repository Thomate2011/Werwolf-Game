document.addEventListener('DOMContentLoaded', async function() {
    const playersListDiv = document.getElementById('players-list-neustart');
    const restartBtn = document.getElementById('restart-game-btn');
    const diebBtn = document.getElementById('dieb-btn');
    const gauklerBtn = document.getElementById('gaukler-btn');
    const amorBtn = document.getElementById('amor-btn');
    const urwolfBtn = document.getElementById('urwolf-btn');
    const magdBtn = document.getElementById('magd-btn');

    const diebModal = document.getElementById('dieb-modal');
    const gauklerModal = document.getElementById('gaukler-modal');
    const amorModal = document.getElementById('amor-modal');
    const urwolfModal = document.getElementById('urwolf-modal');
    const magdModal = document.getElementById('magd-modal');

    const overlay = document.getElementById('overlay');
    
    let allPlayers = [];

    async function fetchPlayers() {
        try {
            const response = await fetch('/api/gamemaster/view');
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Spielerübersicht.');
            }
            const players = await response.json();
            allPlayers = players;
            displayPlayers(players);
            
            const specialRolesResponse = await fetch('/api/game/get_special_roles');
            const specialRolesData = await specialRolesResponse.json();
            
            diebBtn.style.display = specialRolesData.dieb_roles && specialRolesData.dieb_roles.length > 0 ? 'inline-block' : 'none';
            gauklerBtn.style.display = specialRolesData.gaukler_roles && specialRolesData.gaukler_roles.length > 0 ? 'inline-block' : 'none';
            amorBtn.style.display = players.some(p => p.role === 'Amor') ? 'inline-block' : 'none';
            urwolfBtn.style.display = players.some(p => p.role === 'Der Urwolf') ? 'inline-block' : 'none';
            magdBtn.style.display = players.some(p => p.role === 'Die ergebene Magd') ? 'inline-block' : 'none';

        } catch (error) {
            console.error('Fehler:', error);
            playersListDiv.textContent = 'Fehler beim Laden der Daten.';
        }
    }

    function displayPlayers(players) {
        playersListDiv.innerHTML = '';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-item ${player.status}`;
            playerDiv.dataset.name = player.name;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name-display';
            nameSpan.textContent = player.name;

            const roleSpan = document.createElement('span');
            roleSpan.className = 'player-role-display';
            roleSpan.textContent = player.role;

            const statusBtn = document.createElement('button');
            statusBtn.className = 'status-btn';
            statusBtn.textContent = player.status === 'alive' ? 'Lebt' : 'Tot';
            statusBtn.addEventListener('click', () => toggleStatus(player.name));

            playerDiv.appendChild(nameSpan);
            playerDiv.appendChild(roleSpan);
            playerDiv.appendChild(statusBtn);

            playersListDiv.appendChild(playerDiv);
        });
    }

    async function toggleStatus(playerName) {
        try {
            const response = await fetch(`/api/gamemaster/toggle_status/${playerName}`, {
                method: 'PUT'
            });
            if (response.ok) {
                fetchPlayers(); // Ansicht aktualisieren
            } else {
                console.error('Fehler beim Status-Update.');
            }
        } catch (error) {
            console.error('Fehler:', error);
        }
    }

    restartBtn.addEventListener('click', async function() {
        const confirmRestart = confirm('Möchten Sie das Spiel wirklich neustarten?');
        if (confirmRestart) {
            try {
                const response = await fetch('/api/game/restart', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Fehler beim Neustarten des Spiels.');
            }
        }
    });

    // Modal-Funktionalität
    function showModal(modal) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    function hideModal(modal) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }
    
    // Dieb-Modal
    diebBtn.addEventListener('click', async () => {
        const diebRolesList = document.getElementById('dieb-roles-list');
        const diebConfirmBtn = document.getElementById('dieb-confirm-btn');
        
        const response = await fetch('/api/game/get_special_roles');
        const data = await response.json();
        const diebRoles = data.dieb_roles;
        
        diebRolesList.innerHTML = '';
        diebRoles.forEach(role => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'dieb-role';
            radio.value = role;
            
            const label = document.createElement('label');
            label.textContent = role;
            label.prepend(radio);
            
            diebRolesList.appendChild(label);
            diebRolesList.appendChild(document.createElement('br'));
        });
        
        diebConfirmBtn.onclick = async () => {
            const selectedRole = document.querySelector('input[name="dieb-role"]:checked');
            if (selectedRole) {
                await fetch('/api/game/dieb/change_role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_role: selectedRole.value })
                });
                hideModal(diebModal);
                await fetchPlayers();
            }
        };
        showModal(diebModal);
    });
    
    // Gaukler-Modal
    gauklerBtn.addEventListener('click', async () => {
        const gauklerRolesList = document.getElementById('gaukler-roles-list');
        const gauklerConfirmBtn = document.getElementById('gaukler-confirm-btn');
        
        const response = await fetch('/api/game/get_special_roles');
        const data = await response.json();
        const gauklerRoles = data.gaukler_roles;
        
        gauklerRolesList.innerHTML = '';
        gauklerRoles.forEach(role => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'gaukler-role';
            radio.value = role;
            
            const label = document.createElement('label');
            label.textContent = role;
            label.prepend(radio);
            
            gauklerRolesList.appendChild(label);
            gauklerRolesList.appendChild(document.createElement('br'));
        });
        
        gauklerConfirmBtn.onclick = async () => {
            const selectedRole = document.querySelector('input[name="gaukler-role"]:checked');
            if (selectedRole) {
                await fetch('/api/game/gaukler/change_role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_role: selectedRole.value })
                });
                hideModal(gauklerModal);
                await fetchPlayers();
            }
        };
        showModal(gauklerModal);
    });

    // Amor-Modal
    amorBtn.addEventListener('click', () => {
        const amorPlayersList = document.getElementById('amor-player-list');
        const amorConfirmBtn = document.getElementById('amor-confirm-btn');
        let selected = [];

        amorPlayersList.innerHTML = '';
        allPlayers.filter(p => p.status === 'alive').forEach(player => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = player.name;
            checkbox.id = `amor-${player.name}`;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selected.push(player.name);
                } else {
                    selected = selected.filter(p => p !== player.name);
                }
            });
            const label = document.createElement('label');
            label.htmlFor = `amor-${player.name}`;
            label.textContent = player.name;
            amorPlayersList.appendChild(checkbox);
            amorPlayersList.appendChild(label);
            amorPlayersList.appendChild(document.createElement('br'));
        });

        amorConfirmBtn.onclick = async () => {
            if (selected.length === 2) {
                await fetch('/api/game/amor/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ players: selected })
                });
                hideModal(amorModal);
            } else {
                alert('Bitte wählen Sie genau zwei Spieler aus.');
            }
        };
        showModal(amorModal);
    });

    // Urwolf-Modal
    urwolfBtn.addEventListener('click', () => {
        const urwolfPlayersList = document.getElementById('urwolf-player-list');
        const urwolfConfirmBtn = document.getElementById('urwolf-confirm-btn');
        
        urwolfPlayersList.innerHTML = '';
        allPlayers.filter(p => p.status === 'alive' && p.role !== 'Werwölfe').forEach(player => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'urwolf-player';
            radio.value = player.name;
            
            const label = document.createElement('label');
            label.textContent = player.name;
            label.prepend(radio);
            
            urwolfPlayersList.appendChild(label);
            urwolfPlayersList.appendChild(document.createElement('br'));
        });
        
        urwolfConfirmBtn.onclick = async () => {
            const selectedPlayer = document.querySelector('input[name="urwolf-player"]:checked');
            if (selectedPlayer) {
                await fetch('/api/game/urwolf/transform', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player: selectedPlayer.value })
                });
                hideModal(urwolfModal);
                await fetchPlayers();
            }
        };
        showModal(urwolfModal);
    });

    // Magd-Modal
    magdBtn.addEventListener('click', () => {
        const magdPlayersList = document.getElementById('magd-player-list');
        const magdConfirmBtn = document.getElementById('magd-confirm-btn');
        
        magdPlayersList.innerHTML = '';
        allPlayers.filter(p => p.status === 'dead' && p.role !== 'Die ergebene Magd').forEach(player => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'magd-player';
            radio.value = player.name;
            
            const label = document.createElement('label');
            label.textContent = `${player.name} (${player.role})`;
            label.prepend(radio);
            
            magdPlayersList.appendChild(label);
            magdPlayersList.appendChild(document.createElement('br'));
        });
        
        magdConfirmBtn.onclick = async () => {
            const selectedPlayer = document.querySelector('input[name="magd-player"]:checked');
            if (selectedPlayer) {
                await fetch('/api/game/magd/takeover', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player: selectedPlayer.value })
                });
                hideModal(magdModal);
                await fetchPlayers();
            }
        };
        showModal(magdModal);
    });

    fetchPlayers();
});