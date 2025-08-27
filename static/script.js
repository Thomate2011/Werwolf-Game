document.addEventListener('DOMContentLoaded', () => {

    // Global utility functions for all pages
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
    
    // Roles page (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const rolesList = document.getElementById('roles-list');
        const rolesCountSpan = document.getElementById('roles-count');
        const startGameButton = document.getElementById('start-game-button');
        const specialRolesPrompt = document.getElementById('special-roles-prompt');
        const promptText = document.getElementById('prompt-text');

        let allRoles = {};
        let playerCount = 0;
        let roleCounts = {};
        let specialRolesData = {
            "Dieb": [],
            "Der Gaukler": []
        };
        let specialRolesQueue = [];

        async function fetchData() {
            try {
                const response = await fetch('/api/get_roles_and_players');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                allRoles = data.all_roles;
                playerCount = data.player_count;
                roleCounts = data.saved_roles || {};
                renderRoles();
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }

        function renderRoles() {
            rolesList.innerHTML = '';
            for (const role in allRoles) {
                const roleItem = document.createElement('div');
                roleItem.className = 'role-item';
                roleItem.innerHTML = `
                    <h3>${role}</h3>
                    <div class="role-controls">
                        <span class="count-button minus-button" data-role="${role}">-</span>
                        <span class="role-count" data-role="${role}">${roleCounts[role] || 0}</span>
                        <span class="count-button plus-button" data-role="${role}">+</span>
                    </div>
                `;
                rolesList.appendChild(roleItem);
            }
            updateCounts();
        }

        function sumCounts(counts) {
            let total = 0;
            for (const role in counts) {
                total += counts[role];
            }
            return total;
        }

        function updateCounts() {
            const totalCount = sumCounts(roleCounts);
            rolesCountSpan.textContent = `Gewählte Rollen: ${totalCount} / ${playerCount}`;
            checkGameState();
        }

        function checkGameState() {
            const totalCount = sumCounts(roleCounts);
            
            if (totalCount === playerCount) {
                const diebCount = roleCounts["Dieb"] || 0;
                const gauklerCount = roleCounts["Der Gaukler"] || 0;
                
                if (diebCount > 0 && specialRolesData["Dieb"].length === 0 && !specialRolesQueue.includes("Dieb")) {
                    specialRolesQueue.push("Dieb");
                }
                if (gauklerCount > 0 && specialRolesData["Der Gaukler"].length === 0 && !specialRolesQueue.includes("Der Gaukler")) {
                    if (specialRolesQueue[0] !== "Dieb") specialRolesQueue.unshift("Der Gaukler");
                    else specialRolesQueue.push("Der Gaukler");
                }

                if (specialRolesQueue.length > 0) {
                    specialRolesPrompt.style.display = 'block';
                    const currentSpecialRole = specialRolesQueue[0];
                    if (currentSpecialRole === "Dieb") {
                        promptText.textContent = "Wähle zwei Rollen für den Dieb aus.";
                    } else if (currentSpecialRole === "Der Gaukler") {
                        promptText.textContent = "Wähle drei Rollen für den Gaukler aus.";
                    }
                    startGameButton.disabled = true;
                } else {
                    specialRolesPrompt.style.display = 'none';
                    startGameButton.disabled = false;
                }
            } else {
                specialRolesQueue = [];
                specialRolesPrompt.style.display = 'none';
                startGameButton.disabled = true;
            }
        }

        rolesList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('count-button')) {
                const role = target.dataset.role;
                const countSpan = document.querySelector(`.role-count[data-role="${role}"]`);
                let count = parseInt(countSpan.textContent);

                if (specialRolesQueue.length > 0) {
                    const currentSpecialRole = specialRolesQueue[0];
                    let extraRoles = specialRolesData[currentSpecialRole];
                    const maxRoles = (currentSpecialRole === "Dieb") ? 2 : 3;

                    if (target.classList.contains('plus-button')) {
                        if (extraRoles.length < maxRoles) {
                            extraRoles.push(role);
                            count++;
                        }
                    } else if (target.classList.contains('minus-button')) {
                        const index = extraRoles.indexOf(role);
                        if (index > -1) {
                            extraRoles.splice(index, 1);
                            count--;
                        }
                    }
                    countSpan.textContent = count;
                    if (extraRoles.length === maxRoles) {
                        specialRolesQueue.shift();
                        checkGameState();
                    }
                } else {
                    if (target.classList.contains('plus-button')) {
                        if (sumCounts(roleCounts) < playerCount) {
                            count++;
                            roleCounts[role] = count;
                        }
                    } else if (target.classList.contains('minus-button')) {
                        if (count > 0) {
                            count--;
                            roleCounts[role] = count;
                        }
                    }
                    countSpan.textContent = count;
                    updateCounts();
                }
            }
        });

        startGameButton.addEventListener('click', async () => {
            const totalCount = sumCounts(roleCounts);
            if (totalCount !== playerCount) {
                alert(`Die Anzahl der Rollen (${totalCount}) muss genau der Anzahl der Spieler (${playerCount}) entsprechen.`);
                return;
            }

            try {
                const response = await fetch('/api/game/roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_counts: roleCounts,
                        special_roles_data: specialRolesData
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    window.location.href = '/karten';
                } else {
                    alert(data.error);
                }
            } catch (error) {
                console.error('Fehler beim Starten des Spiels:', error);
                alert('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
            }
        });

        fetchData();
    }
    
    // Cards page (karten.html) - Existing functionality remains the same
    
    // Game Master Overview page (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        const playersList = document.getElementById('players-list');
        const infoModal = document.getElementById('info-modal');
        const infoModalRoleName = document.getElementById('info-modal-role-name');
        const infoModalRoleDescription = document.getElementById('info-modal-role-description');
        const specialModal = document.getElementById('special-modal');
        const specialModalContent = document.getElementById('special-modal-content');
        const infoCloseButton = infoModal.querySelector('.close-button');
        const specialCloseButton = specialModal.querySelector('.close-button');

        let allRoles = {};
        let specialRolesData = {};
        let selectedLovers = [];

        async function fetchRolesAndData() {
            try {
                const response = await fetch('/api/get_roles_and_players');
                if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok.');
                const data = await response.json();
                allRoles = data.all_roles;

                const specialResponse = await fetch('/api/special_roles/data');
                if (!specialResponse.ok) throw new Error('Spezialrollen-Daten konnten nicht geladen werden.');
                specialRolesData = await specialResponse.json();

                updatePlayersList();
            } catch (error) {
                console.error('Fehler beim Laden der Daten:', error);
                playersList.innerHTML = '<p>Konnte Spielerliste nicht laden. Bitte starte das Spiel neu.</p>';
            }
        }

        async function updatePlayersList() {
            try {
                const response = await fetch('/api/gamemaster/view');
                if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok.');
                const players = await response.json();
                
                playersList.innerHTML = '';
                
                players.forEach(player => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = `player-card ${player.status}`;
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'player-name';
                    nameSpan.textContent = player.name;

                    const roleSpan = document.createElement('span');
                    roleSpan.className = 'player-role';
                    roleSpan.textContent = player.role;

                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'player-actions';

                    if (player.emojis && player.emojis.length > 0) {
                        player.emojis.forEach(emoji => {
                            const emojiButton = document.createElement('button');
                            emojiButton.className = 'emoji-button';
                            emojiButton.innerHTML = `${emoji.icon}<br><span>${emoji.label}</span>`;
                            emojiButton.onclick = (e) => {
                                e.stopPropagation();
                                handleSpecialAction(emoji.type, player);
                            };
                            actionsDiv.appendChild(emojiButton);
                        });
                    }

                    const infoButton = document.createElement('button');
                    infoButton.textContent = 'i';
                    infoButton.className = 'info-button';
                    infoButton.onclick = (e) => {
                        e.stopPropagation();
                        const roleDescription = allRoles[player.role] || 'Keine Erklärung verfügbar.';
                        infoModalRoleName.textContent = player.role;
                        infoModalRoleDescription.textContent = roleDescription;
                        infoModal.style.display = 'block';
                    };

                    const statusButton = document.createElement('button');
                    statusButton.className = 'status-button';
                    statusButton.textContent = (player.status === 'alive') ? '☠️' : '❤️';
                    statusButton.onclick = (e) => {
                        e.stopPropagation();
                        togglePlayerStatus(player.name);
                    };
                    
                    actionsDiv.appendChild(infoButton);
                    actionsDiv.appendChild(statusButton);
                    
                    playerDiv.appendChild(nameSpan);
                    playerDiv.appendChild(roleSpan);
                    playerDiv.appendChild(actionsDiv);
                    
                    playersList.appendChild(playerDiv);
                });

            } catch (error) {
                console.error('Fehler beim Laden der Spieler:', error);
                playersList.innerHTML = '<p>Konnte Spielerliste nicht laden. Bitte starte das Spiel neu.</p>';
            }
        }

        function handleSpecialAction(type, player) {
            specialModalContent.innerHTML = '';
            specialModal.style.display = 'block';
            clearSelectionStyles();

            if (type === 'Dieb') {
                const prompt = document.createElement('p');
                prompt.className = 'special-prompt-text';
                prompt.textContent = 'Wähle eine der beiden Karten, um deine Rolle zu tauschen.';
                specialModalContent.appendChild(prompt);
                
                const cardContainer = document.createElement('div');
                cardContainer.className = 'card-container';
                
                specialRolesData.Dieb.extra_roles.forEach(roleName => {
                    const card = createRoleCard(roleName, allRoles[roleName]);
                    card.onclick = () => swapDiebRole(roleName, player.name);
                    cardContainer.appendChild(card);
                });
                specialModalContent.appendChild(cardContainer);
            
            } else if (type === 'Gaukler') {
                const prompt = document.createElement('p');
                prompt.className = 'special-prompt-text';
                prompt.textContent = 'Wähle eine der drei Rollen, die du für diese Nacht spielen möchtest.';
                specialModalContent.appendChild(prompt);

                const cardContainer = document.createElement('div');
                cardContainer.className = 'card-container';
                
                specialRolesData.Gaukler.extra_roles.forEach(roleName => {
                    const card = createRoleCard(roleName, allRoles[roleName]);
                    card.onclick = () => swapGauklerRole(roleName, player.name);
                    cardContainer.appendChild(card);
                });
                specialModalContent.appendChild(cardContainer);
            
            } else if (type === 'Amor') {
                const prompt = document.createElement('p');
                prompt.className = 'special-prompt-text';
                prompt.textContent = 'Wähle zwei Spieler, die sich verlieben sollen.';
                specialModalContent.appendChild(prompt);
                
                selectedLovers = [];
                const players = document.querySelectorAll('.player-card');
                players.forEach(p => {
                    p.onclick = () => selectLover(p.querySelector('.player-name').textContent);
                    p.style.cursor = 'pointer';
                    p.classList.add('selectable-player');
                });
                
            } else if (type === 'Ulwolf') {
                const prompt = document.createElement('p');
                prompt.className = 'special-prompt-text';
                prompt.textContent = 'Wähle einen Spieler, der zum Werwolf werden soll.';
                specialModalContent.appendChild(prompt);

                const players = document.querySelectorAll('.player-card');
                players.forEach(p => {
                    p.onclick = () => transformPlayerRole(p.querySelector('.player-name').textContent);
                    p.style.cursor = 'pointer';
                    p.classList.add('selectable-player');
                });
            }
        }

        function createRoleCard(roleName, description) {
            const card = document.createElement('div');
            card.className = 'role-card';
            card.innerHTML = `
                <h3 class="role-card-name">${roleName}</h3>
                <p class="role-card-description">${description}</p>
            `;
            return card;
        }

        async function swapDiebRole(newRole, playerName) {
            try {
                const response = await fetch('/api/dieb/swap_role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_role: newRole, player_name: playerName })
                });
                if (!response.ok) throw new Error('Rollen-Tausch fehlgeschlagen.');
                await updatePlayersList();
                specialModal.style.display = 'none';
            } catch (error) {
                console.error(error);
                alert('Ein Fehler ist aufgetreten. Tausch nicht möglich.');
            }
        }

        async function swapGauklerRole(newRole, playerName) {
            try {
                const response = await fetch('/api/gaukler/swap_role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_role: newRole, player_name: playerName })
                });
                if (!response.ok) throw new Error('Rollen-Tausch fehlgeschlagen.');
                await updatePlayersList();
                specialModal.style.display = 'none';
            } catch (error) {
                console.error(error);
                alert('Ein Fehler ist aufgetreten. Tausch nicht möglich.');
            }
        }

        function selectLover(playerName) {
            if (selectedLovers.length < 2) {
                if (!selectedLovers.includes(playerName)) {
                    selectedLovers.push(playerName);
                    const playerCard = document.querySelector(`.player-card .player-name[textContent="${playerName}"]`).closest('.player-card');
                    playerCard.classList.add('selected-lover');
                } else {
                    const index = selectedLovers.indexOf(playerName);
                    selectedLovers.splice(index, 1);
                    const playerCard = document.querySelector(`.player-card .player-name[textContent="${playerName}"]`).closest('.player-card');
                    playerCard.classList.remove('selected-lover');
                }
            }
            if (selectedLovers.length === 2) {
                setLovers(selectedLovers);
            }
        }

        async function setLovers(lovers) {
            try {
                const response = await fetch('/api/amor/set_lovers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lovers: lovers })
                });
                if (!response.ok) throw new Error('Verliebte konnten nicht gesetzt werden.');
                await updatePlayersList();
                specialModal.style.display = 'none';
                clearSelectionStyles();
            } catch (error) {
                console.error(error);
                alert('Ein Fehler ist aufgetreten.');
                clearSelectionStyles();
            }
        }

        async function transformPlayerRole(playerName) {
            try {
                const response = await fetch('/api/ulwolf/transform_player', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ player_name: playerName })
                });
                if (!response.ok) throw new Error('Transformation fehlgeschlagen.');
                await updatePlayersList();
                specialModal.style.display = 'none';
                clearSelectionStyles();
            } catch (error) {
                console.error(error);
                alert('Ein Fehler ist aufgetreten.');
                clearSelectionStyles();
            }
        }

        function clearSelectionStyles() {
            const players = document.querySelectorAll('.player-card');
            players.forEach(p => {
                p.classList.remove('selectable-player');
                p.classList.remove('selected-lover');
                p.onclick = null;
                p.style.cursor = 'default';
            });
        }
        
        infoCloseButton.onclick = function() { infoModal.style.display = 'none'; }
        specialCloseButton.onclick = function() { specialModal.style.display = 'none'; clearSelectionStyles(); }

        window.onclick = function(event) {
            if (event.target == infoModal) infoModal.style.display = 'none';
            if (event.target == specialModal) {
                specialModal.style.display = 'none';
                clearSelectionStyles();
            }
        }

        document.getElementById('restart-game-button').addEventListener('click', async () => {
            if (confirm("Möchtest du wirklich ein neues Spiel starten? Der aktuelle Spielstand geht verloren.")) {
                try {
                    const response = await fetch('/api/game/restart', { method: 'POST' });
                    if (response.ok) {
                        window.location.href = '/spiel';
                    } else {
                        alert("Fehler beim Zurücksetzen des Spiels.");
                    }
                } catch (error) {
                    alert("Netzwerkfehler beim Zurücksetzen des Spiels.");
                }
            }
        });

        fetchRolesAndData();
    }
    
    // Narrator page (erzaehler.html) - Existing functionality remains the same
});