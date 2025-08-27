document.addEventListener('DOMContentLoaded', () => {

    // Helper functions to show/hide popups
    const showPopup = (id, overlay = true) => {
        document.getElementById(id).style.display = 'block';
        if (overlay) document.getElementById('overlay').style.display = 'block';
    };

    const hidePopup = (id) => {
        document.getElementById(id).style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    };

    // Global info popup for all pages
    window.showInfo = async (role) => {
        const popup = document.getElementById('info-popup');
        const response = await fetch('/api/get_roles_and_players');
        const data = await response.json();
        const roleDescription = data.all_roles[role] || "Keine Erklärung verfügbar.";
        document.getElementById('popup-role-name').textContent = role;
        document.getElementById('popup-role-description').textContent = roleDescription;
        showPopup('info-popup');
    };
    window.hideInfo = () => hidePopup('info-popup');

    // Spiel-Seite (spiel.html)
    if (document.body.classList.contains('spiel-page')) {
        document.getElementById('namenForm').addEventListener('submit', function(event) {
            const namenInput = document.getElementById('namenInput');
            const namenString = namenInput.value;
            const namenListe = namenString.split('\n').map(name => name.trim()).filter(name => name.length > 0);

            const seenNames = new Set();
            let hasDuplicates = false;
            let hasTooFewPlayers = false;

            for (const name of namenListe) {
                if (seenNames.has(name.toLowerCase())) {
                    hasDuplicates = true;
                    break;
                }
                seenNames.add(name.toLowerCase());
            }

            if (namenListe.length < 4) {
                hasTooFewPlayers = true;
            }

            if (hasDuplicates || hasTooFewPlayers) {
                event.preventDefault();

                document.getElementById('nameError').style.display = hasDuplicates ? 'block' : 'none';
                document.getElementById('playerCountError').style.display = hasTooFewPlayers ? 'block' : 'none';
            }
        });
    }

    // Rollen-Seite (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const rolesContainer = document.getElementById("roles-container");
        const rolesToGoEl = document.getElementById("roles-to-go");
        const startButton = document.getElementById("start-button");
        const specialRoleButton = document.getElementById("special-role-button");
        const specialRolePopup = document.getElementById("special-role-popup");
        const roleSelectionPopup = document.getElementById("role-selection-popup");
        
        let rolesCount = {};
        let totalPlayers = 0;
        let specialRoles = { dieb_roles: [], gaukler_roles: [] };
        let specialRolePhase = null;

        async function fetchData() {
            const rolesResponse = await fetch('/api/get_roles_list');
            const orderedRoles = await rolesResponse.json();

            const playersResponse = await fetch('/api/get_roles_and_players');
            const playersData = await playersResponse.json();
            rolesCount = playersData.saved_roles;
            totalPlayers = playersData.player_count;
            
            const specialRolesResponse = await fetch('/api/game/get_special_roles');
            const specialRolesData = await specialRolesResponse.json();
            if (specialRolesData.dieb_roles) {
                specialRoles.dieb_roles = specialRolesData.dieb_roles;
            }
            if (specialRolesData.gaukler_roles) {
                specialRoles.gaukler_roles = specialRolesData.gaukler_roles;
            }

            renderRoles(orderedRoles);
        }

        function renderRoles(orderedRoles) {
            rolesContainer.innerHTML = '';
            orderedRoles.forEach(role => {
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
            });
            updateRolesToGo();
        }

        function updateRolesToGo() {
            const totalRolesSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
            const remainingRoles = totalPlayers - totalRolesSelected;
            rolesToGoEl.textContent = `Noch ${remainingRoles} Rollen zu vergeben`;
            
            startButton.classList.add('disabled-button');
            startButton.disabled = true;

            specialRoleButton.style.display = 'none';

            if (remainingRoles === 0) {
                checkSpecialRolesStatus();
            } else if (remainingRoles < 0) {
                 rolesToGoEl.textContent = `Zu viele Rollen! ${-remainingRoles} Rollen zu viel.`;
            }
        }

        async function checkSpecialRolesStatus() {
            const hasDieb = (rolesCount.Dieb && rolesCount.Dieb > 0);
            const hasGaukler = (rolesCount["Der Gaukler"] && rolesCount["Der Gaukler"] > 0);

            if (hasDieb && specialRoles.dieb_roles.length < 2) {
                specialRolePhase = 'dieb';
                showRoleSelectionPopup(
                    'Für den Dieb wählen',
                    'Wähle zwei Rollen aus dem Stapel aus, die der Dieb nehmen kann.',
                    () => showSpecialRolesSelection(specialRolePhase),
                    'dieb'
                );
            } else if (hasGaukler && specialRoles.gaukler_roles.length < 3) {
                specialRolePhase = 'gaukler';
                showRoleSelectionPopup(
                    'Für den Gaukler wählen',
                    'Wähle drei Rollen aus dem Stapel aus, die der Gaukler nehmen kann.',
                    () => showSpecialRolesSelection(specialRolePhase),
                    'gaukler'
                );
            } else {
                specialRoleButton.style.display = 'none';
                startButton.classList.remove('disabled-button');
                startButton.disabled = false;
            }
        }

        function showRoleSelectionPopup(title, description, onProceed, roleType) {
            document.getElementById('selection-popup-title').textContent = title;
            document.getElementById('selection-popup-description').textContent = description;
            
            const actionButton = document.getElementById('selection-popup-action-btn');
            actionButton.textContent = `Zum ${roleType === 'dieb' ? 'Dieb' : 'Gaukler'}`;
            actionButton.onclick = () => {
                hidePopup('role-selection-popup');
                onProceed();
            };

            const changeButton = document.getElementById('selection-popup-change-btn');
            changeButton.onclick = () => {
                hidePopup('role-selection-popup');
                specialRoleButton.textContent = `Zum ${roleType === 'dieb' ? 'Dieb' : 'Gaukler'}`;
                specialRoleButton.onclick = onProceed;
                specialRoleButton.style.display = 'inline-block';
            };
            
            showPopup('role-selection-popup');
        }

        async function showSpecialRolesSelection(roleType) {
            const rolesResponse = await fetch('/api/get_roles_list');
            const orderedRoles = await rolesResponse.json();
            
            const rolesToSelect = roleType === 'dieb' ? 2 : 3;
            const currentSelectedCount = specialRoles[roleType + '_roles'].length;

            specialRolePopup.innerHTML = `
                <button onclick="hideSpecialRolePopup('${roleType}')" class="popup-close-btn">&times;</button>
                <h2>Rollen für den ${roleType === 'dieb' ? 'Dieb' : 'Gaukler'}</h2>
                <p id="special-roles-counter-text">Wähle ${rolesToSelect - currentSelectedCount} Rollen aus</p>
                <div id="special-roles-selection-list"></div>
            `;
            
            const listContainer = document.getElementById("special-roles-selection-list");
            orderedRoles.forEach(role => {
                const count = specialRoles[roleType + '_roles'].filter(r => r === role).length;
                const div = document.createElement('div');
                div.className = 'role-list-item';
                div.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <span>${role}</span>
                        <button onclick="showInfo('${role}')" class="role-info-btn">i</button>
                    </div>
                    <div>
                        <button onclick="incrementSpecialRole('${roleType}', '${role}')" class="role-counter-btn">+</button>
                        <span id="special-${role}-count">${count}</span>
                        <button onclick="decrementSpecialRole('${roleType}', '${role}')" class="role-counter-btn">-</button>
                    </div>
                `;
                listContainer.appendChild(div);
            });
            showPopup('special-role-popup');
        }
        
        window.incrementRole = (role) => {
            if (!rolesCount[role]) rolesCount[role] = 0;
            const totalSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
            if (totalSelected < totalPlayers) {
                rolesCount[role]++;
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }
        };

        window.decrementRole = (role) => {
            if (rolesCount[role] > 0) {
                rolesCount[role]--;
                if (role === 'Dieb') specialRoles.dieb_roles = [];
                if (role === 'Der Gaukler') specialRoles.gaukler_roles = [];
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }
        };

        window.incrementSpecialRole = (roleType, role) => {
            const rolesToSelect = roleType === 'dieb' ? 2 : 3;
            if (specialRoles[roleType + '_roles'].length < rolesToSelect) {
                specialRoles[roleType + '_roles'].push(role);
                document.getElementById(`special-${role}-count`).textContent = specialRoles[roleType + '_roles'].filter(r => r === role).length;
                updateSpecialRolesDisplay(roleType);
            }
        };

        window.decrementSpecialRole = (roleType, role) => {
            const index = specialRoles[roleType + '_roles'].indexOf(role);
            if (index > -1) {
                specialRoles[roleType + '_roles'].splice(index, 1);
                document.getElementById(`special-${role}-count`).textContent = specialRoles[roleType + '_roles'].filter(r => r === role).length;
                updateSpecialRolesDisplay(roleType);
            }
        };

        function updateSpecialRolesDisplay(roleType) {
            const rolesToSelect = roleType === 'dieb' ? 2 : 3;
            const remainingToSelect = rolesToSelect - specialRoles[roleType + '_roles'].length;
            document.getElementById('special-roles-counter-text').textContent = `Wähle ${remainingToSelect} Rollen aus`;

            if (remainingToSelect === 0) {
                saveSpecialRoles(roleType, specialRoles[roleType + '_roles']);
                hideSpecialRolePopup(roleType);
                checkSpecialRolesStatus();
            }
        }

        window.hideSpecialRolePopup = () => {
            hidePopup('special-role-popup');
        };
        
        function saveRoles() {
            fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 'role_counts': rolesCount })
            });
        }
        
        function saveSpecialRoles(roleType, roles) {
            fetch('/api/game/save_special_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ [roleType + '_roles']: roles })
            });
        }

        window.startGame = async () => {
            const response = await fetch('/api/game/roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    'role_counts': rolesCount,
                    'special_roles': specialRoles
                })
            });
            const result = await response.json();
            if (response.ok) {
                window.location.href = '/karten';
            } else {
                alert(result.error);
            }
        };
        
        fetchData();
    }

    // Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        let currentRoleData = null;
        let isRevealed = false;
        const revealBtn = document.getElementById('reveal-role-btn');
        const showDescBtn = document.getElementById('show-description-btn');
        const nextPlayerBtn = document.getElementById('next-player-btn');
        const overviewBtn = document.getElementById('overview-btn');

        window.fetchCurrentPlayer = async () => {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();
            if (response.ok) {
                if (data.message) {
                    showPopup('final-popup');
                } else {
                    document.getElementById('player-name').textContent = data.player_name;
                    revealBtn.style.display = 'inline-block';
                    showDescBtn.style.display = 'none';
                    nextPlayerBtn.style.display = 'none';
                    overviewBtn.style.display = 'none';
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
                isRevealed = true;

                if (data.is_last_card) {
                    nextPlayerBtn.style.display = 'none';
                    overviewBtn.style.display = 'inline-block';
                } else {
                    nextPlayerBtn.style.display = 'inline-block';
                    overviewBtn.style.display = 'none';
                }
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
        
        window.locationToOverview = () => {
            showPopup('final-popup');
        };

        window.nextPlayer = () => {
            window.location.reload();
        };

        fetchCurrentPlayer();
    }

    // Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        let allRolesDescriptions = {};
        let selectedPlayers = [];
        let currentSpecialAction = null;
        let specialActionTargets = { dieb: null, gaukler: null, amor: [], urwolf: null, magd: null };

        async function fetchRoles() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            allRolesDescriptions = data.all_roles;
            renderPlayers(data.players_list, data.couples);
        }

        const renderPlayers = (players, couples) => {
            const playerList = document.getElementById('player-list');
            playerList.innerHTML = '';
            players.forEach(player => {
                const li = document.createElement('li');
                li.className = `player-list-item ${player.status === 'dead' ? 'dead' : ''}`;
                li.dataset.playerName = player.name;
                li.onclick = () => window.toggleStatus(player.name);

                const playerInfo = document.createElement('span');
                playerInfo.textContent = player.name;

                const roleAndStatus = document.createElement('span');
                const emojiSpan = document.createElement('span');

                if (player.role_is_special) {
                    emojiSpan.textContent = getEmojiForRole(player.role);
                    emojiSpan.className = 'special-action-emoji';
                    emojiSpan.onclick = (e) => {
                        e.stopPropagation();
                        activateSpecialAction(player.role, player.name);
                    };
                }

                if (couples && couples.flat().includes(player.name)) {
                    emojiSpan.innerHTML += ' ❤️';
                }

                roleAndStatus.appendChild(emojiSpan);
                
                const infoBtn = document.createElement('button');
                infoBtn.className = 'role-info-btn';
                infoBtn.textContent = 'i';
                infoBtn.onclick = (e) => {
                    e.stopPropagation();
                    showInfo(player.role);
                };
                roleAndStatus.appendChild(infoBtn);
                
                playerInfo.appendChild(roleAndStatus);
                li.appendChild(playerInfo);

                playerList.appendChild(li);
            });
        };

        const getEmojiForRole = (role) => {
            switch (role) {
                case 'Dieb': return '🕵️';
                case 'Der Gaukler': return '🃏';
                case 'Amor': return '💘';
                case 'Der Urwolf': return '🐺';
                case 'Die ergebene Magd': return '👸';
                default: return '';
            }
        };

        window.toggleStatus = async (playerName) => {
            if (currentSpecialAction) {
                handleSpecialAction(playerName);
            } else {
                const response = await fetch(`/api/gamemaster/toggle_status/` + playerName, { method: 'PUT' });
                if (response.ok) {
                    fetchRoles();
                } else {
                    alert('Fehler beim Ändern des Spielerstatus.');
                }
            }
        };

        window.restartGame = async () => {
            const response = await fetch('/api/game/restart', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/rollen';
            } else {
                alert('Fehler beim Neustart des Spiels.');
            }
        };
        
        window.activateSpecialAction = (role, playerName) => {
            currentSpecialAction = role;
            selectedPlayers = [];
            document.querySelectorAll('.player-list-item').forEach(el => el.classList.remove('selection-mode'));
            document.getElementById('special-action-title').textContent = role;
            
            let description = '';
            let action = () => {};

            switch (role) {
                case 'Dieb':
                    showDiebGauklerPopup('Dieb');
                    return;
                case 'Der Gaukler':
                    showDiebGauklerPopup('Gaukler');
                    return;
                case 'Amor':
                    description = "Wähle zwei Spieler aus, die sich verlieben.";
                    document.querySelectorAll('.player-list-item').forEach(el => el.classList.add('selection-mode'));
                    action = handleAmor;
                    break;
                case 'Der Urwolf':
                    description = "Wähle einen Spieler, den du in einen Werwolf verwandeln möchtest.";
                    document.querySelectorAll('.player-list-item').forEach(el => el.classList.add('selection-mode'));
                    action = handleUrwolf;
                    break;
                case 'Die ergebene Magd':
                    description = "Wähle eine Person, deren Rolle du übernehmen möchtest.";
                    document.querySelectorAll('.player-list-item').forEach(el => el.classList.add('selection-mode'));
                    action = handleMagd;
                    break;
            }

            document.getElementById('special-action-description').textContent = description;
            document.getElementById('special-action-proceed-btn').onclick = action;
            showPopup('special-action-popup');
        };

        window.hideSpecialActionPopup = () => {
            hidePopup('special-action-popup');
            currentSpecialAction = null;
            document.querySelectorAll('.player-list-item').forEach(el => el.classList.remove('selection-mode', 'selected'));
        };

        const showDiebGauklerPopup = async (roleType) => {
            const response = await fetch(`/api/game/get_special_roles`);
            const data = await response.json();
            const roles = roleType === 'Dieb' ? data.dieb_roles : data.gaukler_roles;
            
            const listContainer = document.getElementById('special-role-list-container');
            listContainer.innerHTML = '';
            
            roles.forEach(role => {
                const card = document.createElement('div');
                card.className = 'special-role-card';
                card.onclick = () => window.selectSpecialRole(role, roleType.toLowerCase());
                card.innerHTML = `
                    <h3 class="special-role-card-name">${role}</h3>
                    <p class="special-role-card-description">${allRolesDescriptions[role] || ''}</p>
                `;
                listContainer.appendChild(card);
            });

            document.getElementById('special-role-select-title').textContent = `Rolle für den ${roleType} wählen`;
            showPopup('special-role-select-popup');
        };

        window.selectSpecialRole = async (roleName, roleType) => {
            const response = await fetch(`/api/game/${roleType}/change_role`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ new_role: roleName })
            });
            if (response.ok) {
                hidePopup('special-role-select-popup');
                fetchRoles();
            } else {
                alert('Fehler beim Ändern der Rolle.');
            }
        };

        const handleAmor = () => {
            document.getElementById('special-action-description').textContent = "Wähle zwei Spieler aus...";
            document.querySelectorAll('.player-list-item').forEach(el => {
                el.onclick = () => {
                    if (selectedPlayers.length < 2 && !selectedPlayers.includes(el.dataset.playerName)) {
                        selectedPlayers.push(el.dataset.playerName);
                        el.classList.add('selected');
                        if (selectedPlayers.length === 2) {
                            fetch('/api/game/amor/pair', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ players: selectedPlayers })
                            }).then(() => {
                                hideSpecialActionPopup();
                                fetchRoles();
                            });
                        }
                    } else if (selectedPlayers.includes(el.dataset.playerName)) {
                         selectedPlayers = selectedPlayers.filter(name => name !== el.dataset.playerName);
                         el.classList.remove('selected');
                    }
                };
            });
        };

        const handleUrwolf = () => {
            document.getElementById('special-action-description').textContent = "Wähle einen Spieler zum Verwandeln.";
            document.querySelectorAll('.player-list-item').forEach(el => {
                el.onclick = () => {
                    const playerName = el.dataset.playerName;
                    fetch(`/api/game/urwolf/transform`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ player: playerName })
                    }).then(() => {
                        hideSpecialActionPopup();
                        fetchRoles();
                    });
                };
            });
        };

        const handleMagd = () => {
            document.getElementById('special-action-description').textContent = "Wähle die Rolle der verstorbenen Person aus.";
            document.querySelectorAll('.player-list-item.dead').forEach(el => {
                el.onclick = () => {
                    const playerName = el.dataset.playerName;
                    fetch(`/api/game/magd/takeover`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ player: playerName })
                    }).then(() => {
                        hideSpecialActionPopup();
                        fetchRoles();
                    });
                };
            });
        };

        fetchRoles();
    }

    // Erzähler-Seite (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        const narratorTextContainer = document.getElementById('narrator-text-container');
        const round1Btn = document.getElementById('round-1-btn');
        const round2Btn = document.getElementById('round-2-btn');
        
        const storedRound = sessionStorage.getItem('narratorRound');
        let currentRound = storedRound ? parseInt(storedRound) : 1;

        const loadNarratorText = async (round) => {
            narratorTextContainer.innerHTML = 'Lade Text...';
            try {
                const response = await fetch(`/api/narrator_text/${round}`);
                const data = await response.json();
                if (response.ok) {
                    narratorTextContainer.innerHTML = '';
                    data.text_blocks.forEach(block => {
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>${block.role}:</strong> ${block.text}`;
                        narratorTextContainer.appendChild(p);
                    });
                } else {
                    narratorTextContainer.innerHTML = `<p style="color: red;">Fehler: ${data.error}</p>`;
                }
            } catch (error) {
                narratorTextContainer.innerHTML = `<p style="color: red;">Netzwerkfehler: ${error.message}</p>`;
            }
        };

        const updateButtons = (activeRound) => {
            round1Btn.classList.remove('active');
            round2Btn.classList.remove('active');
            if (activeRound === 1) {
                round1Btn.classList.add('active');
            } else {
                round2Btn.classList.add('active');
            }
        };

        round1Btn.addEventListener('click', () => {
            currentRound = 1;
            sessionStorage.setItem('narratorRound', 1);
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        round2Btn.addEventListener('click', () => {
            currentRound = 2;
            sessionStorage.setItem('narratorRound', 2);
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        updateButtons(currentRound);
        loadNarratorText(currentRound);
    }
});