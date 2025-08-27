document.addEventListener('DOMContentLoaded', () => {

    // Logik für die Spieler-Anmeldeseite (spiel.html)
    if (document.body.classList.contains('spiel-page')) {
        document.getElementById('namenForm').addEventListener('submit', function(event) {
            const namenInput = document.getElementById('namenInput');
            const namenString = namenInput.value;
            const namenListe = namenString.split('\n').map(name => name.trim()).filter(name => name.length > 0);
            
            const seenNames = new Set();
            let hasDuplicates = false;
        
            for (const name of namenListe) {
                if (seenNames.has(name.toLowerCase())) {
                    hasDuplicates = true;
                    break;
                }
                seenNames.add(name.toLowerCase());
            }
        
            if (hasDuplicates) {
                document.getElementById('nameError').style.display = 'block';
                event.preventDefault(); // Verhindert das Absenden des Formulars
            } else {
                document.getElementById('nameError').style.display = 'none';
            }
        });
    }

    // Rollen-Seite (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const totalPlayers = {{ player_count }};
        const savedRoles = {{ saved_roles | tojson }};
        const allRoles = {{ all_roles | tojson }};
        let currentRoleCount = 0;
        
        document.getElementById('player-count').textContent = totalPlayers;
        document.getElementById('player-count-display').textContent = totalPlayers;

        function updateRoleCount(role, change) {
            if (!savedRoles[role]) {
                savedRoles[role] = 0;
            }
            savedRoles[role] += change;
            currentRoleCount += change;
            document.getElementById(`count-${role}`).textContent = savedRoles[role];
            updateStartButton();
        }

        function updateStartButton() {
            const warningEl = document.getElementById('role-count-warning');
            if (currentRoleCount === totalPlayers) {
                document.getElementById('startGameButton').disabled = false;
                warningEl.style.display = 'none';
            } else {
                document.getElementById('startGameButton').disabled = true;
                warningEl.style.display = 'block';
            }
        }
        
        // Initiales Laden der Rollen und Zähler
        document.addEventListener('DOMContentLoaded', () => {
            const rolesContainer = document.getElementById('roles-container');
            const sortedRoles = Object.keys(allRoles).sort();
            
            sortedRoles.forEach(roleName => {
                const count = savedRoles[roleName] || 0;
                currentRoleCount += count;
                const roleItem = document.createElement('div');
                roleItem.className = 'role-list-item';
                roleItem.innerHTML = `
                    <span>${roleName}</span>
                    <div>
                        <button class="role-counter-btn minus" onclick="updateRoleCount('${roleName}', -1)">-</button>
                        <span id="count-${roleName}">${count}</span>
                        <button class="role-counter-btn plus" onclick="updateRoleCount('${roleName}', 1)">+</button>
                    </div>
                `;
                rolesContainer.appendChild(roleItem);
            });
            updateStartButton();
        });

        // Event-Listener für den Start-Button
        document.getElementById('startGameButton').addEventListener('click', () => {
            fetch('/api/game/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role_counts: savedRoles
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    // Redirect, wenn die Rollenzuweisung erfolgreich war
                    window.location.href = '{{ url_for("karten_seite") }}';
                } else {
                    // Zeige Fehler an, wenn es welche gibt
                    document.getElementById('role-count-warning').textContent = data.error;
                    document.getElementById('role-count-warning').style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
        
        // Speichern der Rollenauswahl bei Änderung
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('role-counter-btn')) {
                fetch('/api/game/save_roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role_counts: savedRoles })
                })
                .then(response => response.json())
                .then(data => {
                    // Optional: Erfolgsmeldung anzeigen
                })
                .catch(error => console.error('Error saving roles:', error));
            }
        });
    }

    // Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        const playerNameEl = document.getElementById('player-name');
        const roleNameEl = document.getElementById('role-name');
        const roleDescriptionEl = document.getElementById('role-description');
        const nextButton = document.getElementById('next-button');
        const finishButton = document.getElementById('finish-button');
        const playerCardEl = document.getElementById('player-card');

        let currentPlayerIndex = 0;
        let playersData = [];

        // Funktion, um die nächste Karte anzuzeigen
        function showNextCard() {
            if (currentPlayerIndex < playersData.length) {
                const player = playersData[currentPlayerIndex];
                playerNameEl.textContent = player.name;
                roleNameEl.textContent = 'Rolle aufdecken';
                roleDescriptionEl.textContent = 'Klicke auf die Karte, um die Rolle zu sehen.';
                playerCardEl.onclick = () => revealRole(player.role);
                nextButton.textContent = `Nächste Karte (${currentPlayerIndex + 1}/${playersData.length})`;
                currentPlayerIndex++;
            } else {
                playerNameEl.textContent = 'Spieler bereit!';
                roleNameEl.textContent = 'Alle Rollen aufgedeckt.';
                roleDescriptionEl.textContent = 'Das Spiel kann jetzt beginnen!';
                nextButton.style.display = 'none';
                finishButton.style.display = 'inline-block';
                playerCardEl.onclick = null;
            }
        }

        // Funktion, um die Rolle zu enthüllen
        function revealRole(role) {
            // API-Aufruf, um Rollen-Infos zu bekommen
            fetch('/api/game/reveal_and_next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_name: playerNameEl.textContent })
            })
            .then(response => response.json())
            .then(data => {
                roleNameEl.textContent = data.role_name;
                roleDescriptionEl.innerHTML = data.role_description.replace(/\n/g, '<br>'); // Zeilenumbrüche für HTML
                playerCardEl.onclick = null; // Klick-Handler entfernen, um Mehrfach-Klicks zu verhindern
            })
            .catch(error => console.error('Error revealing role:', error));
        }

        // Initiales Laden der Spielerdaten
        fetch('/api/gamemaster/view')
            .then(response => response.json())
            .then(data => {
                playersData = data;
                showNextCard();
            })
            .catch(error => console.error('Error fetching player data:', error));

        nextButton.addEventListener('click', showNextCard);
    }

    // Neustart-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        const allRoles = {{ all_roles | tojson }};

        function showPopup(roleName) {
            const roleDescription = allRoles[roleName];
            if (roleDescription) {
                document.getElementById('popup-role-name').textContent = roleName;
                document.getElementById('popup-role-description').innerHTML = roleDescription.replace(/\n/g, '<br>');
                document.getElementById('role-popup').style.display = 'block';
                document.getElementById('overlay').style.display = 'block';
            }
        }

        function hidePopup() {
            document.getElementById('role-popup').style.display = 'none';
            document.getElementById('overlay').style.display = 'none';
        }

        function updatePlayerList() {
            fetch('/api/gamemaster/view')
                .then(response => response.json())
                .then(players => {
                    const playerListEl = document.getElementById('player-list');
                    playerListEl.innerHTML = '';
                    players.forEach(player => {
                        const playerItem = document.createElement('div');
                        playerItem.className = `player-list-item ${player.status}`;
                        playerItem.innerHTML = `
                            <span>${player.name} (${player.role})</span>
                            <span style="font-size: 1.2em;">${player.status === 'alive' ? '❤️' : '💀'}</span>
                        `;
                        playerItem.onclick = () => {
                            togglePlayerStatus(player.name);
                        };
                        playerListEl.appendChild(playerItem);
                    });
                })
                .catch(error => console.error('Error fetching player list:', error));
        }

        function togglePlayerStatus(playerName) {
            fetch(`/api/gamemaster/toggle_status/${playerName}`, {
                method: 'PUT'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    updatePlayerList();
                }
            })
            .catch(error => console.error('Error toggling status:', error));
        }
        
        function updateRolesList() {
            fetch('/api/get_roles_list')
                .then(response => response.json())
                .then(roles => {
                    const rolesListEl = document.getElementById('roles-list');
                    rolesListEl.innerHTML = '';
                    roles.forEach(roleName => {
                        const roleItem = document.createElement('div');
                        roleItem.className = 'role-list-item';
                        roleItem.innerHTML = `
                            <span>${roleName}</span>
                            <button class="role-info-btn" onclick="showPopup('${roleName}')">i</button>
                        `;
                        rolesListEl.appendChild(roleItem);
                    });
                })
                .catch(error => console.error('Error fetching roles list:', error));
        }
        
        document.getElementById('neustart-button').addEventListener('click', () => {
            fetch('/api/game/restart', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        window.location.href = "{{ url_for('spiel_seite') }}";
                    }
                })
                .catch(error => console.error('Error restarting game:', error));
        });

        document.addEventListener('DOMContentLoaded', () => {
            updatePlayerList();
            updateRolesList();
        });
    }

    // Erzähler-Seite (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        function loadNarratorText(roundNumber) {
            const container = document.getElementById('narrator-text-container');
            container.innerHTML = 'Lade...';

            document.querySelectorAll('.night-button').forEach(btn => btn.classList.remove('active'));
            document.querySelector(`.night-button[data-round="${roundNumber}"]`).classList.add('active');

            fetch(`/api/narrator_text/${roundNumber}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        container.innerHTML = `<p style="color:red;">${data.error}</p>`;
                        return;
                    }

                    container.innerHTML = '';
                    data.text_blocks.forEach(block => {
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>${block.role}:</strong> ${block.text}`;
                        container.appendChild(p);
                    });
                })
                .catch(error => {
                    console.error('Error fetching narrator text:', error);
                    container.innerHTML = '<p style="color:red;">Ein Fehler ist aufgetreten.</p>';
                });
        }

        document.addEventListener('DOMContentLoaded', () => {
            loadNarratorText(1);

            document.querySelectorAll('.night-button').forEach(button => {
                button.addEventListener('click', () => {
                    const round = button.dataset.round;
                    loadNarratorText(round);
                });
            });
        });
    }

});