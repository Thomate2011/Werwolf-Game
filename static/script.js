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
        const startButtons = document.querySelectorAll(".start-button");
        const playerCounterEl = document.getElementById("player-count");
        const specialRolesSection = document.getElementById("special-roles-selection");

        let rolesCount = {};
        let totalPlayers = 0;
        let specialRoles = { dieb: [], gaukler: [] };
        let specialRoleToSelect = null;
        let selectedSpecialRolesCount = 0;
        let totalSpecialRolesToSelect = 0;
        
        async function fetchData() {
            const rolesResponse = await fetch('/api/get_roles_list');
            const orderedRoles = await rolesResponse.json();

            const playersResponse = await fetch('/api/get_roles_and_players');
            const playersData = await playersResponse.json();
            rolesCount = playersData.saved_roles;
            totalPlayers = playersData.player_count;
            playerCounterEl.textContent = totalPlayers;
            
            const specialRolesResponse = await fetch('/api/game/get_special_roles');
            const specialRolesData = await specialRolesResponse.json();
            if (specialRolesData.dieb_roles) {
                specialRoles.dieb = specialRolesData.dieb_roles;
            }
            if (specialRolesData.gaukler_roles) {
                specialRoles.gaukler = specialRolesData.gaukler_roles;
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
            
            if (remainingRoles === 0) {
                checkSpecialRolesStatus();
            } else {
                startButtons.forEach(btn => btn.style.display = 'none');
                specialRolesSection.style.display = 'none';
                rolesContainer.style.display = 'block';
            }
        }

        function checkSpecialRolesStatus() {
            const hasDieb = (rolesCount.Dieb && rolesCount.Dieb > 0);
            const hasGaukler = (rolesCount.Gaukler && rolesCount.Gaukler > 0);
            
            if (hasDieb && specialRoles.dieb.length < 2) {
                specialRoleToSelect = 'dieb';
                totalSpecialRolesToSelect = 2;
                selectedSpecialRolesCount = specialRoles.dieb.length;
                showSpecialRolesSelection();
            } else if (hasGaukler && specialRoles.gaukler.length < 3) {
                specialRoleToSelect = 'gaukler';
                totalSpecialRolesToSelect = 3;
                selectedSpecialRolesCount = specialRoles.gaukler.length;
                showSpecialRolesSelection();
            } else {
                specialRolesSection.style.display = 'none';
                rolesContainer.style.display = 'block';
                startButtons.forEach(btn => btn.style.display = 'inline-block');
            }
        }

        function showSpecialRolesSelection() {
            rolesContainer.style.display = 'none';
            specialRolesSection.style.display = 'block';
            specialRolesSection.innerHTML = `
                <p>Wähle ${totalSpecialRolesToSelect - selectedSpecialRolesCount} Rollen für den ${specialRoleToSelect === 'dieb' ? 'Dieb' : 'Gaukler'} aus</p>
                <div id="special-roles-container"></div>
            `;
            
            fetch('/api/get_roles_list').then(res => res.json()).then(orderedRoles => {
                const specialRolesContainer = document.getElementById("special-roles-container");
                orderedRoles.forEach(role => {
                    const count = specialRoles[specialRoleToSelect].filter(r => r === role).length;
                    const div = document.createElement('div');
                    div.className = 'role-list-item';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            <span>${role}</span>
                            <button onclick="showInfo('${role}')" class="role-info-btn">i</button>
                        </div>
                        <div>
                            <button onclick="incrementSpecialRole('${role}')" class="role-counter-btn">+</button>
                            <span id="special-${role}-count">${count}</span>
                            <button onclick="decrementSpecialRole('${role}')" class="role-counter-btn">-</button>
                        </div>
                    `;
                    specialRolesContainer.appendChild(div);
                });
            });
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
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }
        };

        window.incrementSpecialRole = (role) => {
            if (selectedSpecialRolesCount < totalSpecialRolesToSelect) {
                specialRoles[specialRoleToSelect].push(role);
                selectedSpecialRolesCount++;
                document.getElementById(`special-${role}-count`).textContent = specialRoles[specialRoleToSelect].filter(r => r === role).length;
                updateSpecialRolesSelectionDisplay();
            }
        };

        window.decrementSpecialRole = (role) => {
            const index = specialRoles[specialRoleToSelect].indexOf(role);
            if (index > -1) {
                specialRoles[specialRoleToSelect].splice(index, 1);
                selectedSpecialRolesCount--;
                document.getElementById(`special-${role}-count`).textContent = specialRoles[specialRoleToSelect].filter(r => r === role).length;
                updateSpecialRolesSelectionDisplay();
            }
        };

        function updateSpecialRolesSelectionDisplay() {
            const remainingToSelect = totalSpecialRolesToSelect - specialRoles[specialRoleToSelect].length;
            specialRolesSection.querySelector('p').textContent = `Wähle ${remainingToSelect} Rollen für den ${specialRoleToSelect === 'dieb' ? 'Dieb' : 'Gaukler'} aus`;

            if (remainingToSelect === 0) {
                saveSpecialRoles();
                const hasDieb = (rolesCount.Dieb && rolesCount.Dieb > 0);
                const hasGaukler = (rolesCount.Gaukler && rolesCount.Gaukler > 0);

                if (specialRoleToSelect === 'dieb' && hasGaukler && specialRoles.gaukler.length < 3) {
                    specialRoleToSelect = 'gaukler';
                    totalSpecialRolesToSelect = 3;
                    selectedSpecialRolesCount = specialRoles.gaukler.length;
                    showSpecialRolesSelection();
                } else {
                    rolesContainer.style.display = 'block';
                    specialRolesSection.style.display = 'none';
                    startButtons.forEach(btn => btn.style.display = 'inline-block');
                }
            }
        }
        
        function saveRoles() {
            fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 'role_counts': rolesCount })
            });
        }
        
        function saveSpecialRoles() {
            fetch('/api/game/save_special_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ [specialRoleToSelect]: specialRoles[specialRoleToSelect] })
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
        
        startButtons.forEach(btn => btn.addEventListener('click', startGame));
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

        revealBtn.addEventListener('click', revealCard);
        showDescBtn.addEventListener('click', showDescription);
        nextPlayerBtn.addEventListener('click', nextPlayer);
        overviewBtn.addEventListener('click', locationToOverview);
        
        fetchCurrentPlayer();
    }

    // Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        let allRolesDescriptions = {};
        let selectedPlayers = [];
        let currentSpecialAction = null;
        const specialActionText = document.getElementById('special-action-text');

        async function fetchRoles() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            allRolesDescriptions = data.all_roles;
        }

        window.toggleStatus = async (playerName) => {
            if (currentSpecialAction) {
                handleSpecialAction(playerName);
            } else {
                const response = await fetch(`/api/gamemaster/toggle_status/` + playerName, { method: 'PUT' });
                if (response.ok) {
                    window.location.reload();
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
        
        window.showInfoNeustart = (role) => {
            const popup = document.getElementById('info-popup');
            document.getElementById('popup-role-name').textContent = role;
            document.getElementById('popup-role-description').textContent = allRolesDescriptions[role] || "Keine Erklärung verfügbar.";
            showPopup('info-popup');
        };

        window.hideInfoNeustart = () => hidePopup('info-popup');

        window.activateSpecialAction = (action) => {
            currentSpecialAction = action;
            selectedPlayers = [];
            switch (action) {
                case 'dieb':
                    showDiebPopup();
                    break;
                case 'gaukler':
                    showGauklerPopup();
                    break;
                case 'amor':
                    specialActionText.textContent = "Wähle zwei Spieler, die sich verlieben.";
                    break;
                case 'urwolf':
                    specialActionText.textContent = "Wähle einen Spieler, den du in einen Werwolf verwandeln möchtest.";
                    break;
                case 'magd':
                    specialActionText.textContent = "Wähle eine Person deren Rolle du übernehmen möchtest.";
                    break;
            }
        };

        const showDiebPopup = async () => {
            const response = await fetch('/api/game/get_special_roles');
            const data = await response.json();
            const diebRoles = data.dieb_roles || [];
            
            const popup = document.getElementById('special-role-popup');
            popup.innerHTML = `
                <button onclick="hideSpecialPopup()" class="popup-close-btn">&times;</button>
                <h2>Rolle für den Dieb wählen</h2>
                <div style="display: flex; justify-content: center; flex-wrap: wrap;">
                    ${diebRoles.map(role => `
                        <div class="special-role-card" onclick="selectSpecialRole('${role}', 'dieb')">
                            <h3 class="special-role-card-name">${role}</h3>
                            <p class="special-role-card-description">${allRolesDescriptions[role]}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            showPopup('special-role-popup', true);
        };

        const showGauklerPopup = async () => {
            const response = await fetch('/api/game/get_special_roles');
            const data = await response.json();
            const gauklerRoles = data.gaukler_roles || [];
            
            const popup = document.getElementById('special-role-popup');
            popup.innerHTML = `
                <button onclick="hideSpecialPopup()" class="popup-close-btn">&times;</button>
                <h2>Rolle für den Gaukler wählen</h2>
                <div style="display: flex; justify-content: center; flex-wrap: wrap;">
                    ${gauklerRoles.map(role => `
                        <div class="special-role-card" onclick="selectSpecialRole('${role}', 'gaukler')">
                            <h3 class="special-role-card-name">${role}</h3>
                            <p class="special-role-card-description">${allRolesDescriptions[role]}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            showPopup('special-role-popup', true);
        };

        window.selectSpecialRole = async (roleName, roleType) => {
            const response = await fetch(`/api/game/${roleType}/change_role`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ new_role: roleName })
            });
            const data = await response.json();
            if (response.ok) {
                window.location.reload();
            } else {
                alert(data.error);
            }
        };

        window.hideSpecialPopup = () => {
            hidePopup('special-role-popup');
            currentSpecialAction = null;
        };

        const handleSpecialAction = async (playerName) => {
            if (currentSpecialAction === 'amor') {
                selectedPlayers.push(playerName);
                if (selectedPlayers.length === 2) {
                    const response = await fetch('/api/game/amor/pair', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ players: selectedPlayers })
                    });
                    currentSpecialAction = null;
                    specialActionText.textContent = "";
                    window.location.reload();
                }
            } else if (currentSpecialAction === 'urwolf') {
                const response = await fetch(`/api/game/urwolf/transform`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ player: playerName })
                });
                if (response.ok) {
                    currentSpecialAction = null;
                    specialActionText.textContent = "";
                    window.location.reload();
                }
            } else if (currentSpecialAction === 'magd') {
                const response = await fetch(`/api/game/magd/takeover`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ player: playerName })
                });
                if (response.ok) {
                    currentSpecialAction = null;
                    specialActionText.textContent = "";
                    window.location.reload();
                } else {
                    alert('Fehler: Konnte Rolle nicht übernehmen.');
                }
            }
        };

        fetchRoles();
    }

    // NEUE ERZÄHLER-SEITE (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        const narratorTextContainer = document.getElementById('narrator-text-container');
        const round1Btn = document.getElementById('round-1-btn');
        const round2Btn = document.getElementById('round-2-btn');
        let currentRound = localStorage.getItem('narratorRound') || 1;

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
            localStorage.setItem('narratorRound', 1);
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        round2Btn.addEventListener('click', () => {
            currentRound = 2;
            localStorage.setItem('narratorRound', 2);
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        updateButtons(currentRound);
        loadNarratorText(currentRound);
    }
});