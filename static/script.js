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
            const rolesResponse = await fetch('/api/get_roles_list');
            const orderedRoles = await rolesResponse.json();
            const playersResponse = await fetch('/api/get_roles_and_players');
            const playersData = await playersResponse.json();
            rolesCount = playersData.saved_roles;
            totalPlayers = playersData.player_count;
            allRolesDescriptions = playersData.all_roles;
            playerCounterEl.textContent = totalPlayers;
            renderRoles(orderedRoles);
        }

        function renderRoles(orderedRoles) {
            rolesContainer.innerHTML = '';
            for (const role of orderedRoles) {
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
            updateStartButtonState(remainingRoles);
        }

        function updateStartButtonState(remainingRoles) {
            startButtons.forEach(button => {
                if (remainingRoles === 0) {
                    button.disabled = false;
                    button.classList.remove('disabled');
                } else {
                    button.disabled = true;
                    button.classList.add('disabled');
                }
            });
        }

        window.incrementRole = (role) => {
            const totalRolesSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
            if (totalRolesSelected < totalPlayers) {
                rolesCount[role] = (rolesCount[role] || 0) + 1;
                document.getElementById(`${role}-count`).textContent = rolesCount[role];
                updateRolesToGo();
            }
        };

        window.decrementRole = (role) => {
            if (rolesCount[role] && rolesCount[role] > 0) {
                rolesCount[role] -= 1;
                document.getElementById(`${role}-count`).textContent = rolesCount[role];
                updateRolesToGo();
            }
        };

        window.startGame = async () => {
            const response = await fetch('/api/game/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role_counts: rolesCount })
            });

            const result = await response.json();
            if (response.ok) {
                window.location.href = '/karten';
            } else {
                alert("Fehler: " + result.error);
            }
        };

        window.saveRoles = async () => {
            const response = await fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role_counts: rolesCount })
            });

            const result = await response.json();
            if (response.ok) {
                alert("Rollen wurden gespeichert.");
            } else {
                alert("Fehler beim Speichern der Rollen.");
            }
        };

        fetchData();
    }

    // Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        const cardContainer = document.getElementById("card-container");
        const nextCardBtn = document.getElementById("next-card-btn");
        const revealBtn = document.getElementById("reveal-btn");

        let currentCard = {};

        async function fetchNextCard() {
            const response = await fetch('/api/game/next_card');
            const data = await response.json();
            if (response.ok) {
                if (data.message) {
                    // Alle Karten wurden aufgedeckt, Spiel kann beginnen
                    window.location.href = '/neustart';
                } else {
                    currentCard = data;
                    cardContainer.innerHTML = `
                        <p class="card-title">Dein Name ist:</p>
                        <h2 class="card-player-name">${currentCard.player_name}</h2>
                        <button id="reveal-btn" class="primary-button">Karte aufdecken</button>
                    `;
                    document.getElementById("reveal-btn").addEventListener('click', revealRole);
                }
            } else {
                alert(data.error);
            }
        }

        async function revealRole() {
            const response = await fetch('/api/game/reveal_and_next', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ player_name: currentCard.player_name })
            });
            const data = await response.json();
            if (response.ok) {
                cardContainer.innerHTML = `
                    <p class="card-title">Deine Rolle ist:</p>
                    <h2 class="card-role">${data.role_name}</h2>
                    <p class="card-description">${data.role_description}</p>
                    <button id="next-card-btn" class="primary-button">Nächster Spieler</button>
                `;
                document.getElementById("next-card-btn").addEventListener('click', fetchNextCard);
            } else {
                alert(data.error);
            }
        }
        
        fetchNextCard();
    }

    // Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        const playerListContainer = document.getElementById("player-list-container");
        
        async function fetchPlayerList() {
            const response = await fetch('/api/gamemaster/view');
            const players = await response.json();
            
            playerListContainer.innerHTML = '';
            players.forEach(player => {
                const div = document.createElement('div');
                div.className = `player-list-item ${player.status}`;
                div.innerHTML = `
                    <span><strong>${player.name}</strong> (${player.role})</span>
                    <button class="toggle-status-btn" data-player-name="${player.name}" data-current-status="${player.status}">
                        ${player.status === 'alive' ? 'Als tot markieren' : 'Als lebendig markieren'}
                    </button>
                `;
                playerListContainer.appendChild(div);
            });
            
            document.querySelectorAll('.toggle-status-btn').forEach(button => {
                button.addEventListener('click', toggleStatus);
            });
        }
        
        async function toggleStatus(event) {
            const playerName = event.target.dataset.playerName;
            const response = await fetch(`/api/gamemaster/toggle_status/${playerName}`, {
                method: 'PUT'
            });
            if (response.ok) {
                fetchPlayerList();
            } else {
                alert("Fehler beim Ändern des Status.");
            }
        }

        window.showInfoNeustart = (role) => {
            window.showInfo(role);
        };
        
        window.hideInfoNeustart = () => {
            window.hideInfo();
        };

        document.getElementById('restart-btn').addEventListener('click', async () => {
            const response = await fetch('/api/game/restart', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/spiel';
            } else {
                alert('Fehler beim Zurücksetzen des Spiels.');
            }
        });

        fetchPlayerList();
    }

    // Erzähler-Seite (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        const roundButtons = document.querySelectorAll('.night-buttons .button-link');
        const narratorTextContainer = document.getElementById('narrator-text-container');
        let currentRound = '1';

        async function fetchNarratorText(roundNumber) {
            const response = await fetch(`/api/narrator_text/${roundNumber}`);
            const data = await response.json();
            
            if (response.ok) {
                renderNarratorText(data.text_blocks);
            } else {
                narratorTextContainer.innerHTML = `<p class="error-message">${data.error}</p>`;
            }
        }
        
        function renderNarratorText(textBlocks) {
            narratorTextContainer.innerHTML = '';
            textBlocks.forEach(block => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <p>
                        <strong>${block.role}:</strong><br>
                        ${block.text}
                    </p>
                `;
                narratorTextContainer.appendChild(div);
            });
        }
        
        roundButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                roundButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                currentRound = event.target.id.split('-')[1];
                fetchNarratorText(currentRound);
            });
        });
        
        // Initialer Ladevorgang für Runde 1
        fetchNarratorText(currentRound);
    }
});