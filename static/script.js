document.addEventListener('DOMContentLoaded', () => {

    // Globale Funktionen für alle Seiten, die Pop-ups benötigen
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

    // Logik für die Spieler-Anmeldeseite (spiel.html)
    if (document.body.classList.contains('spiel-page')) {
        document.getElementById('namenForm').addEventListener('submit', function(event) {
            const namenInput = document.getElementById('namenInput');
            const namenString = namenInput.value;
            const namenListe = namenString.split('\n').map(name => name.trim()).filter(name => name.length > 0);
            
            const nameErrorEl = document.getElementById('nameError');
            const playerCountErrorEl = document.getElementById('playerCountError');

            let hasDuplicates = false;
            let hasTooFewPlayers = false;

            if (namenListe.length < 4) {
                hasTooFewPlayers = true;
            }

            const seenNames = new Set();
            for (const name of namenListe) {
                if (seenNames.has(name.toLowerCase())) {
                    hasDuplicates = true;
                    break;
                }
                seenNames.add(name.toLowerCase());
            }

            if (hasTooFewPlayers || hasDuplicates) {
                event.preventDefault(); 
                if (hasTooFewPlayers) {
                    playerCountErrorEl.style.display = 'block';
                } else {
                    playerCountErrorEl.style.display = 'none';
                }
                if (hasDuplicates) {
                    nameErrorEl.style.display = 'block';
                } else {
                    nameErrorEl.style.display = 'none';
                }
            } else {
                nameErrorEl.style.display = 'none';
                playerCountErrorEl.style.display = 'none';
            }
        });
    }

    // Logik für die Rollen-Seite (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const rolesContainer = document.getElementById("roles-container");
        const rolesToGoEl = document.getElementById("roles-to-go");
        const startButton = document.getElementById("startGameButton");

        let rolesCount = {};
        let totalPlayers = 0;

        async function fetchData() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            rolesCount = data.saved_roles;
            totalPlayers = data.player_count;
            document.getElementById('player-count-display').textContent = totalPlayers;
            renderRoles(data.all_roles, rolesCount);
        }

        function renderRoles(allRoles, savedRolesData) {
            rolesContainer.innerHTML = '';
            
            const sortedRoles = Object.keys(allRoles).sort();
            
            for (const role of sortedRoles) {
                const count = savedRolesData[role] || 0;
                const div = document.createElement('div');
                div.className = 'role-list-item';
                div.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <span>${role}</span>
                        <button data-role="${role}" class="role-info-btn">i</button>
                    </div>
                    <div>
                        <button data-role="${role}" data-action="decrement" class="role-counter-btn">-</button>
                        <span id="${role}-count">${count}</span>
                        <button data-role="${role}" data-action="increment" class="role-counter-btn">+</button>
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
                startButton.disabled = false;
                document.getElementById('role-count-warning').style.display = 'none';
            } else {
                startButton.disabled = true;
                document.getElementById('role-count-warning').style.display = 'block';
                document.getElementById('role-count-warning').textContent = `Es müssen genau ${totalPlayers} Rollen vergeben werden.`;
            }
        }

        async function saveRoles() {
            await fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 'role_counts': rolesCount })
            });
        }

        // Event delegation for counter buttons and info buttons
        rolesContainer.addEventListener('click', async (event) => {
            const button = event.target;
            const role = button.dataset.role;
            const action = button.dataset.action;

            if (button.classList.contains('role-counter-btn') && role) {
                if (!rolesCount[role]) {
                    rolesCount[role] = 0;
                }

                if (action === 'increment') {
                    if (Object.values(rolesCount).reduce((a, b) => a + b, 0) < totalPlayers) {
                        rolesCount[role]++;
                    }
                } else if (action === 'decrement') {
                    if (rolesCount[role] > 0) {
                        rolesCount[role]--;
                    }
                }
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                await saveRoles();
            } else if (button.classList.contains('role-info-btn') && role) {
                showInfo(role);
            }
        });

        startButton.addEventListener('click', async () => {
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
        });

        fetchData();
    }

    // Logik für die Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        let currentRoleData = null;
        let isRevealed = false;
        const revealBtn = document.getElementById('reveal-role-btn');
        const showDescBtn = document.getElementById('show-description-btn');
        const nextPlayerBtn = document.getElementById('next-player-btn');
        const overviewBtn = document.getElementById('overview-btn');
        const playerCardEl = document.getElementById('player-card');

        const fetchCurrentPlayer = async () => {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();
            if (response.ok) {
                if (data.message) {
                    document.getElementById('final-popup').style.display = 'block';
                    document.getElementById('overlay').style.display = 'block';
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

        const revealCard = async () => {
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
        
        const showDescription = () => {
            if (currentRoleData && isRevealed) {
                document.getElementById('role-description').textContent = currentRoleData.role_description;
                document.getElementById('role-description').style.display = 'block';
                showDescBtn.style.display = 'none';
            }
        };
        
        const locationToOverview = () => {
            document.getElementById('final-popup').style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
        };

        const nextPlayer = () => {
            window.location.reload();
        };

        revealBtn.addEventListener('click', revealCard);
        showDescBtn.addEventListener('click', showDescription);
        nextPlayerBtn.addEventListener('click', nextPlayer);
        overviewBtn.addEventListener('click', locationToOverview);
        
        fetchCurrentPlayer();
    }

    // Logik für die Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        let allRolesDescriptions = {};

        async function fetchRoles() {
            const response = await fetch('/api/get_roles_and_players');
            const data = await response.json();
            allRolesDescriptions = data.all_roles;
        }

        const toggleStatus = async (playerName) => {
            const response = await fetch(`/api/gamemaster/toggle_status/${playerName}`, { method: 'PUT' });
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Fehler beim Ändern des Spielerstatus.');
            }
        };

        const restartGame = async () => {
            const response = await fetch('/api/game/restart', { method: 'POST' });
            const result = await response.json();
            window.location.href = '/rollen';
        };
        
        const showInfoNeustart = (role) => {
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            document.getElementById('popup-role-name').textContent = role;
            document.getElementById('popup-role-description').textContent = allRolesDescriptions[role] || "Keine Erklärung verfügbar.";
            popup.style.display = 'block';
            overlay.style.display = 'block';
        };

        const hideInfoNeustart = () => {
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            popup.style.display = 'none';
            overlay.style.display = 'none';
        };

        document.getElementById('neustart-button').addEventListener('click', restartGame);

        // Delegation für die Spielerliste
        document.getElementById('player-list').addEventListener('click', (event) => {
            const playerItem = event.target.closest('.player-list-item');
            if (playerItem) {
                const playerName = playerItem.dataset.name;
                toggleStatus(playerName);
            }
        });

        // Event delegation for info buttons within the player list
        document.getElementById('player-list').addEventListener('click', (event) => {
            const button = event.target.closest('.role-info-btn');
            if (button) {
                const role = button.dataset.role;
                showInfoNeustart(role);
            }
        });
        
        fetchRoles();
    }

    // Logik für die Erzähler-Seite (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        const narratorTextContainer = document.getElementById('narrator-text-container');
        const round1Btn = document.querySelector('.night-button[data-round="1"]');
        const round2Btn = document.querySelector('.night-button[data-round="2"]');
        let currentRound = 1;

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
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        round2Btn.addEventListener('click', () => {
            currentRound = 2;
            updateButtons(currentRound);
            loadNarratorText(currentRound);
        });

        loadNarratorText(currentRound);
    }
});