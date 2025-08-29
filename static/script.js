document.addEventListener('DOMContentLoaded', () => {
    // ---- GLOBALE VARIABLEN & HILFSFUNKTIONEN ----
    const API_URL = '/api';

    const fetchPlayers = async () => {
        try {
            const response = await fetch(`${API_URL}/gamemaster/view`);
            if (!response.ok) throw new Error('Fehler beim Abrufen der Spielerdaten.');
            return response.json();
        } catch (error) {
            console.error('Fehler:', error);
            return [];
        }
    };
    
    // Ruft Rollen-Daten vom Backend ab
    const fetchAllRoles = async () => {
        try {
            const response = await fetch(`${API_URL}/get_roles_and_players`);
            if (!response.ok) throw new Error('Fehler beim Abrufen der Rollen.');
            const data = await response.json();
            sessionStorage.setItem('all_roles', JSON.stringify(data.all_roles));
            return data.all_roles;
        } catch (error) {
            console.error('Fehler:', error);
            return {};
        }
    };

    // --- FUNKTIONEN FÜR DIE ROLLEN-POP-UPS ---
    function showInfo(roleName, roleDescription, parentClass = 'neustart-page') {
        const popup = document.getElementById('info-popup');
        const overlay = document.getElementById('overlay');
        const roleNameEl = document.getElementById('popup-role-name');
        const roleDescEl = document.getElementById('popup-role-description');

        roleNameEl.textContent = roleName;
        roleDescEl.innerHTML = roleDescription;

        // Reset classes
        popup.classList.remove('neustart-page-info');
        popup.classList.remove('special-role-card');

        // Apply new classes based on context
        if (parentClass === 'neustart-page') {
            popup.classList.add('neustart-page-info');
        } else if (parentClass === 'special-role-card') {
            popup.classList.add('special-role-card');
        }

        popup.style.display = 'block';
        overlay.style.display = 'block';
    }

    function hideInfo() {
        const popup = document.getElementById('info-popup');
        const overlay = document.getElementById('overlay');
        popup.style.display = 'none';
        overlay.style.display = 'none';
    }

    // ---- SEITEN-SPEZIFISCHE LOGIK ----

    // Logik für die Rollenauswahl-Seite (rollen.html)
    if (document.body.classList.contains('rollen-page')) {
        const rolesContainer = document.getElementById('roles-container');
        const playerCountSpan = document.getElementById('player-count');
        const rolesToGoSpan = document.getElementById('roles-to-go');
        const mixButton = document.getElementById('mix-button');
        const player_count = parseInt(playerCountSpan.textContent);
        let role_counts = JSON.parse(sessionStorage.getItem('role_counts') || '{}');
        let total_roles = 0;

        const renderRoles = async () => {
            const allRoles = await fetchAllRoles();
            
            rolesContainer.innerHTML = '';
            let currentTotalRoles = 0;
            for (const [role, description] of Object.entries(allRoles)) {
                const count = role_counts[role] || 0;
                currentTotalRoles += count;

                const roleDiv = document.createElement('div');
                roleDiv.className = 'role-list-item';
                roleDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span>${role}</span>
                        <button class="role-info-btn" data-role="${role}">i</button>
                    </div>
                    <div>
                        <button class="role-counter-btn minus-btn" data-role="${role}">-</button>
                        <span class="role-count">${count}</span>
                        <button class="role-counter-btn plus-btn" data-role="${role}">+</button>
                    </div>
                `;
                rolesContainer.appendChild(roleDiv);
            }
            total_roles = currentTotalRoles;
            updateRolesToGo();
        };

        const updateRolesToGo = () => {
            const rolesLeft = player_count - total_roles;
            if (rolesLeft > 0) {
                rolesToGoSpan.textContent = `Wähle noch ${rolesLeft} Rollen aus.`;
                rolesToGoSpan.style.color = 'red';
                mixButton.style.display = 'none';
            } else if (rolesLeft < 0) {
                rolesToGoSpan.textContent = `Du hast ${-rolesLeft} Rollen zu viel ausgewählt.`;
                rolesToGoSpan.style.color = 'red';
                mixButton.style.display = 'none';
            } else {
                rolesToGoSpan.textContent = `Alle ${player_count} Rollen ausgewählt.`;
                rolesToGoSpan.style.color = 'green';
                mixButton.style.display = 'block';
            }
            sessionStorage.setItem('role_counts', JSON.stringify(role_counts));
        };
        
        const showSpecialRolePopup = (roleType, count, textCount) => {
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            const roleNameEl = document.getElementById('popup-role-name');
            const roleDescEl = document.getElementById('popup-role-description');
            
            roleNameEl.textContent = `Rollen für den ${roleType} auswählen`;
            roleDescEl.innerHTML = `Du musst ${textCount} Rollen auswählen, die der ${roleType} dann in der Übersichtsseite tauschen kann.`;
            
            popup.style.display = 'block';
            overlay.style.display = 'block';
            
            const btnContainer = document.createElement('div');
            btnContainer.className = 'popup-buttons';
            btnContainer.innerHTML = `
                <button class="secondary-button" id="change-roles-btn">Rollen verändern</button>
                <a class="button-link primary-button" href="/special-roles-selection?type=${roleType}&count=${count}">Zum ${roleType}</a>
            `;
            popup.appendChild(btnContainer);
            
            document.getElementById('change-roles-btn').onclick = () => {
                popup.style.display = 'none';
                overlay.style.display = 'none';
                btnContainer.remove();
            };
        };

        const checkSpecialRoles = () => {
            const diebSelected = role_counts['Dieb'] > 0;
            const gauklerSelected = role_counts['Gaukler'] > 0;
            const diebExtraRoles = JSON.parse(sessionStorage.getItem('dieb_extra_roles') || '[]').length;
            const gauklerExtraRoles = JSON.parse(sessionStorage.getItem('gaukler_extra_roles') || '[]').length;

            if (diebSelected && diebExtraRoles < 2) {
                showSpecialRolePopup('Dieb', 2, 'zwei');
                return false;
            }
            if (gauklerSelected && gauklerExtraRoles < 3) {
                showSpecialRolePopup('Gaukler', 3, 'drei');
                return false;
            }
            return true;
        };

        rolesContainer.addEventListener('click', (e) => {
            const roleName = e.target.dataset.role;
            if (!roleName) return;

            const roleCountElement = e.target.closest('.role-list-item').querySelector('.role-count');
            
            if (e.target.classList.contains('plus-btn')) {
                if (total_roles < player_count) {
                    role_counts[roleName] = (role_counts[roleName] || 0) + 1;
                    roleCountElement.textContent = role_counts[roleName];
                    total_roles++;
                }
            } else if (e.target.classList.contains('minus-btn')) {
                if (role_counts[roleName] && role_counts[roleName] > 0) {
                    role_counts[roleName]--;
                    roleCountElement.textContent = role_counts[roleName];
                    total_roles--;
                }
                // NEU: Zusätzliche Rollen löschen, wenn Hauptrolle abgewählt wird
                if (roleName === 'Dieb' && role_counts[roleName] === 0) {
                    sessionStorage.removeItem('dieb_extra_roles');
                }
                if (roleName === 'Gaukler' && role_counts[roleName] === 0) {
                    sessionStorage.removeItem('gaukler_extra_roles');
                }
            } else if (e.target.classList.contains('role-info-btn')) {
                const allRoles = JSON.parse(sessionStorage.getItem('all_roles'));
                showInfo(roleName, allRoles[roleName], 'neustart-page');
            }
            updateRolesToGo();
        });

        mixButton.addEventListener('click', async () => {
            if (checkSpecialRoles()) {
                const extra_roles = {
                    Dieb: JSON.parse(sessionStorage.getItem('dieb_extra_roles') || '[]'),
                    Gaukler: JSON.parse(sessionStorage.getItem('gaukler_extra_roles') || '[]')
                };

                const response = await fetch(`${API_URL}/game/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role_counts: role_counts, extra_roles: extra_roles })
                });

                const data = await response.json();
                if (response.ok) {
                    window.location.href = '/karten';
                } else {
                    alert('Fehler: ' + data.error);
                }
            }
        });

        renderRoles();
    }

    // NEU: Logik für die Rollen-Auswahl-Seite (special-roles-selection.html)
    if (document.body.classList.contains('special-roles-selection-page')) {
        const rolesContainer = document.getElementById('roles-container');
        const saveBtn = document.getElementById('save-selection-btn');
        const roleType = saveBtn.dataset.roleType;
        const count = parseInt(saveBtn.dataset.count);
        let selectedRoles = new Set(JSON.parse(sessionStorage.getItem(`${roleType.toLowerCase()}_extra_roles`) || '[]'));

        const renderRoles = async () => {
            const allRolesResponse = await fetch(`${API_URL}/get_roles_list`);
            const allRoles = await allRolesResponse.json();
            
            rolesContainer.innerHTML = '';
            allRoles.forEach(role => {
                const isSelected = selectedRoles.has(role);
                const roleDiv = document.createElement('div');
                roleDiv.className = `role-list-item ${isSelected ? 'selected' : ''}`;
                roleDiv.dataset.role = role;
                roleDiv.innerHTML = `<span>${role}</span>`;
                rolesContainer.appendChild(roleDiv);
            });
        };

        rolesContainer.addEventListener('click', (e) => {
            const roleDiv = e.target.closest('.role-list-item');
            if (!roleDiv) return;

            const role = roleDiv.dataset.role;
            if (selectedRoles.has(role)) {
                selectedRoles.delete(role);
                roleDiv.classList.remove('selected');
            } else {
                if (selectedRoles.size < count) {
                    selectedRoles.add(role);
                    roleDiv.classList.add('selected');
                } else {
                    alert(`Du kannst nur ${count} Rollen auswählen.`);
                }
            }
        });

        saveBtn.addEventListener('click', async () => {
            if (selectedRoles.size !== count) {
                alert(`Bitte wähle genau ${count} Rollen aus.`);
                return;
            }
            await fetch(`${API_URL}/game/save_extra_roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role_type: roleType, selected_roles: Array.from(selectedRoles) })
            });
            window.location.href = '/rollen';
        });

        renderRoles();
    }

    // Logik für die Karten-Seite (karten.html)
    if (document.body.classList.contains('karten-page')) {
        const playerNameEl = document.getElementById('player-name');
        const roleNameEl = document.getElementById('role-name');
        const roleDescriptionEl = document.getElementById('role-description');
        const revealBtn = document.getElementById('reveal-role-btn');
        const showDescBtn = document.getElementById('show-description-btn');
        const nextPlayerBtn = document.getElementById('next-player-btn');
        const overviewBtn = document.getElementById('overview-btn');
        const finalPopup = document.getElementById('final-popup');

        const fetchNextCard = async () => {
            try {
                const response = await fetch(`${API_URL}/game/next_card`);
                const data = await response.json();
                if (response.ok) {
                    if (data.message) {
                        finalPopup.style.display = 'block';
                    } else {
                        playerNameEl.textContent = data.player_name;
                        roleNameEl.style.display = 'none';
                        roleDescriptionEl.style.display = 'none';
                        revealBtn.style.display = 'block';
                        showDescBtn.style.display = 'none';
                        nextPlayerBtn.style.display = 'none';
                        overviewBtn.style.display = 'none';
                    }
                } else {
                    alert(data.error);
                    window.location.href = '/spiel';
                }
            } catch (error) {
                console.error('Fehler:', error);
                alert('Ein Fehler ist aufgetreten. Bitte starten Sie neu.');
                window.location.href = '/spiel';
            }
        };

        revealBtn.addEventListener('click', async () => {
            const response = await fetch(`${API_URL}/game/reveal_and_next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                playerNameEl.textContent = data.player_name;
                roleNameEl.textContent = data.role_name;
                roleDescriptionEl.textContent = data.role_description;
                
                roleNameEl.style.display = 'block';
                revealBtn.style.display = 'none';
                showDescBtn.style.display = 'inline-block';
                
                if (data.is_last_card) {
                    overviewBtn.style.display = 'inline-block';
                } else {
                    nextPlayerBtn.style.display = 'inline-block';
                }
            } else {
                alert(data.error);
            }
        });

        nextPlayerBtn.addEventListener('click', fetchNextCard);
        overviewBtn.addEventListener('click', () => {
            window.location.href = '/neustart';
        });

        fetchNextCard();
    }

    // Logik für die Spielübersicht-Seite (neustart.html)
    if (document.body.classList.contains('neustart-page')) {
        const playerListEl = document.getElementById('player-list');
        const restartBtn = document.querySelector('.danger-button');
        const infoPopup = document.getElementById('info-popup');
        const genericPopup = document.getElementById('generic-popup');
        const overlay = document.getElementById('overlay');
        const specialEmojis = {
            'Dieb': '💰',
            'Gaukler': '🎭',
            'Amor': '❤️',
            'Der Urwolf': '🐺',
            'Die ergebene Magd': '👩🏼'
        };

        const renderPlayerList = async () => {
            const players = await fetchPlayers();
            const allRoles = await fetchAllRoles();
            playerListEl.innerHTML = '';
            
            players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = `player-list-item ${player.status}`;
                playerDiv.innerHTML = `
                    <span onclick="toggleStatus('${player.name}')">
                        <b>${player.role}</b> | ${player.name}
                        ${specialEmojis[player.role] && player.status === 'alive' ? `<span class="special-emoji" data-role="${player.role}" data-player-name="${player.name}">${specialEmojis[player.role]}</span>` : ''}
                    </span>
                    <button onclick="showInfoNeustart('${player.role}')" class="role-info-btn">i</button>
                `;
                playerListEl.appendChild(playerDiv);
            });
        };

        window.toggleStatus = async (playerName) => {
            await fetch(`${API_URL}/gamemaster/toggle_status/${playerName}`, { method: 'PUT' });
            renderPlayerList();
        };

        window.showInfoNeustart = async (roleName) => {
            const allRoles = await fetchAllRoles();
            const roleDescription = allRoles[roleName];
            showInfo(roleName, roleDescription, 'neustart-page');
        };

        restartBtn.addEventListener('click', async () => {
            const response = await fetch(`${API_URL}/game/restart`, { method: 'POST' });
            if (response.ok) {
                sessionStorage.clear();
                window.location.href = '/';
            }
        });

        playerListEl.addEventListener('click', async (e) => {
            if (e.target.classList.contains('special-emoji')) {
                const role = e.target.dataset.role;
                const playerName = e.target.dataset.playerName;
                let players = await fetchPlayers();
                const allRoles = await fetchAllRoles();
                
                let popupContent = '';

                switch (role) {
                    case 'Dieb':
                        const diebRoles = JSON.parse(sessionStorage.getItem('dieb_extra_roles') || '[]');
                        const diebPlayer = players.find(p => p.name === playerName);
                        const diebCurrentRole = diebPlayer.role;

                        popupContent = `
                            <h2>Dieb-Aktion</h2>
                            <p>Wähle eine Rolle, mit der du tauschen möchtest.</p>
                            <div class="special-role-cards-container">
                                ${diebRoles.map(r => `
                                    <div class="special-role-card" data-role="${r}">
                                        <h3 style="font-size: 6em;">${r}</h3>
                                        <p style="font-size: 1em;">${allRoles[r]}</p>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="popup-close-btn">&times;</button>
                        `;
                        genericPopup.innerHTML = popupContent;
                        genericPopup.style.display = 'block';
                        overlay.style.display = 'block';

                        genericPopup.querySelectorAll('.special-role-card').forEach(card => {
                            card.addEventListener('click', async () => {
                                const newRole = card.dataset.role;
                                await fetch(`${API_URL}/perform_action`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'swap_roles_dieb', params: { player_name: playerName, target_role: newRole } })
                                });
                                renderPlayerList();
                                genericPopup.style.display = 'none';
                                overlay.style.display = 'none';
                            });
                        });
                        break;
                    case 'Gaukler':
                        const gauklerRoles = JSON.parse(sessionStorage.getItem('gaukler_extra_roles') || '[]');
                        popupContent = `
                            <h2>Gaukler-Aktion</h2>
                            <p>Wähle eine Rolle für diese Nacht.</p>
                            <div class="special-role-cards-container">
                                ${gauklerRoles.map(r => `
                                    <div class="special-role-card" data-role="${r}">
                                        <h3 style="font-size: 6em;">${r}</h3>
                                        <p style="font-size: 1em;">${allRoles[r]}</p>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="popup-close-btn">&times;</button>
                        `;
                        genericPopup.innerHTML = popupContent;
                        genericPopup.style.display = 'block';
                        overlay.style.display = 'block';

                        genericPopup.querySelectorAll('.special-role-card').forEach(card => {
                            card.addEventListener('click', async () => {
                                const newRole = card.dataset.role;
                                await fetch(`${API_URL}/perform_action`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'swap_roles_gaukler', params: { player_name: playerName, target_role: newRole } })
                                });
                                renderPlayerList();
                                genericPopup.style.display = 'none';
                                overlay.style.display = 'none';
                            });
                        });
                        break;
                    case 'Amor':
                        let selectedPlayersAmor = [];
                        popupContent = `
                            <h2>Amor-Aktion</h2>
                            <p>Wähle zwei Spieler zum Verlieben.</p>
                            <div class="player-list-selection">
                                ${players.filter(p => p.status === 'alive').map(p => `<span data-player-name="${p.name}" class="player-selectable">${p.name}</span>`).join('')}
                            </div>
                            <button class="primary-button" id="perform-action-btn">Zur Handlung</button>
                            <button class="popup-close-btn">&times;</button>
                        `;
                        genericPopup.innerHTML = popupContent;
                        genericPopup.style.display = 'block';
                        overlay.style.display = 'block';

                        genericPopup.querySelectorAll('.player-selectable').forEach(span => {
                            span.addEventListener('click', () => {
                                const player = span.dataset.playerName;
                                if (selectedPlayersAmor.includes(player)) {
                                    selectedPlayersAmor = selectedPlayersAmor.filter(p => p !== player);
                                    span.classList.remove('selected');
                                } else if (selectedPlayersAmor.length < 2) {
                                    selectedPlayersAmor.push(player);
                                    span.classList.add('selected');
                                }
                            });
                        });
                        document.getElementById('perform-action-btn').addEventListener('click', async () => {
                            if (selectedPlayersAmor.length === 2) {
                                await fetch(`${API_URL}/perform_action`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'verlieben_amor', params: { selected_players: selectedPlayersAmor } })
                                });
                                renderPlayerList();
                                genericPopup.style.display = 'none';
                                overlay.style.display = 'none';
                            } else {
                                alert("Bitte wähle genau 2 Spieler aus.");
                            }
                        });
                        break;
                    case 'Der Urwolf':
                        let selectedPlayerUlwolf = null;
                        popupContent = `
                            <h2>Ulwolf-Aktion</h2>
                            <p>Wähle eine Person, die zum Werwolf werden soll.</p>
                            <div class="player-list-selection">
                                ${players.filter(p => p.status === 'alive' && p.role !== 'Werwölfe').map(p => `<span data-player-name="${p.name}" class="player-selectable">${p.name}</span>`).join('')}
                            </div>
                            <button class="primary-button" id="perform-action-btn">Zur Handlung</button>
                            <button class="popup-close-btn">&times;</button>
                        `;
                        genericPopup.innerHTML = popupContent;
                        genericPopup.style.display = 'block';
                        overlay.style.display = 'block';

                        genericPopup.querySelectorAll('.player-selectable').forEach(span => {
                            span.addEventListener('click', () => {
                                if (selectedPlayerUlwolf) {
                                    genericPopup.querySelector(`[data-player-name="${selectedPlayerUlwolf}"]`).classList.remove('selected');
                                }
                                selectedPlayerUlwolf = span.dataset.playerName;
                                span.classList.add('selected');
                            });
                        });
                        document.getElementById('perform-action-btn').addEventListener('click', async () => {
                            if (selectedPlayerUlwolf) {
                                await fetch(`${API_URL}/perform_action`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'verwandeln_urwolf', params: { player_name: selectedPlayerUlwolf } })
                                });
                                renderPlayerList();
                                genericPopup.style.display = 'none';
                                overlay.style.display = 'none';
                            } else {
                                alert("Bitte wähle eine Person aus.");
                            }
                        });
                        break;
                    case 'Die ergebene Magd':
                        let selectedPlayerMagd = null;
                        popupContent = `
                            <h2>Ergebene Magd-Aktion</h2>
                            <p>Wähle eine Person, deren Rolle du übernehmen möchtest.</p>
                            <div class="player-list-selection">
                                ${players.filter(p => p.status === 'dead').map(p => `<span data-player-name="${p.name}" class="player-selectable">${p.name}</span>`).join('')}
                            </div>
                            <button class="primary-button" id="perform-action-btn">Zur Handlung</button>
                            <button class="popup-close-btn">&times;</button>
                        `;
                        genericPopup.innerHTML = popupContent;
                        genericPopup.style.display = 'block';
                        overlay.style.display = 'block';

                        genericPopup.querySelectorAll('.player-selectable').forEach(span => {
                            span.addEventListener('click', () => {
                                if (selectedPlayerMagd) {
                                    genericPopup.querySelector(`[data-player-name="${selectedPlayerMagd}"]`).classList.remove('selected');
                                }
                                selectedPlayerMagd = span.dataset.playerName;
                                span.classList.add('selected');
                            });
                        });
                        document.getElementById('perform-action-btn').addEventListener('click', async () => {
                            if (selectedPlayerMagd) {
                                await fetch(`${API_URL}/perform_action`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'tauschen_magd', params: { magd_name: playerName, target_name: selectedPlayerMagd } })
                                });
                                renderPlayerList();
                                genericPopup.style.display = 'none';
                                overlay.style.display = 'none';
                            } else {
                                alert("Bitte wähle eine Person aus.");
                            }
                        });
                        break;
                }

                const closeBtn = genericPopup.querySelector('.popup-close-btn');
                if (closeBtn) closeBtn.onclick = () => { genericPopup.style.display = 'none'; overlay.style.display = 'none'; };
                overlay.onclick = () => { genericPopup.style.display = 'none'; overlay.style.display = 'none'; };
            }
        });
        
        renderPlayerList();
    }

    // Logik für die Erzähler-Seite (erzaehler.html)
    if (document.body.classList.contains('erzaehler-page')) {
        const narratorTextContainer = document.getElementById('narrator-text-container');
        const round1Btn = document.getElementById('round-1-btn');
        const round2Btn = document.getElementById('round-2-btn');
        let currentRound = sessionStorage.getItem('current_round') || '1';

        const fetchNarratorText = async (round) => {
            const response = await fetch(`${API_URL}/narrator_text/${round}`);
            const data = await response.json();
            if (response.ok) {
                narratorTextContainer.innerHTML = '';
                data.text_blocks.forEach(block => {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${block.role}:</strong> ${block.text}`;
                    narratorTextContainer.appendChild(p);
                });
            } else {
                alert(data.error);
            }
        };

        const setActiveRound = (round) => {
            if (round === '1') {
                round1Btn.classList.add('active');
                round2Btn.classList.remove('active');
            } else {
                round1Btn.classList.remove('active');
                round2Btn.classList.add('active');
            }
            sessionStorage.setItem('current_round', round);
            fetchNarratorText(round);
        };

        round1Btn.addEventListener('click', () => setActiveRound('1'));
        round2Btn.addEventListener('click', () => setActiveRound('2'));

        setActiveRound(currentRound);
    }
});