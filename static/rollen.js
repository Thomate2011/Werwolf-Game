// Spezifisches JavaScript für die rollen.html Seite
document.addEventListener('DOMContentLoaded', () => {
    const rolesContainer = document.getElementById("roles-container");
    const rolesToGoEl = document.getElementById("roles-to-go");
    const startButtons = document.querySelectorAll(".start-button");
    const playerCounterEl = document.getElementById("player-count");
    const specialRolesSection = document.getElementById("special-roles-selection");

    let rolesCount = {};
    let totalPlayers = 0;
    let specialRoles = {
        dieb_roles: [],
        gaukler_roles: []
    };
    let specialRoleToSelect = null;
    let selectedSpecialRolesCount = 0;
    let totalSpecialRolesToSelect = 0;

    async function fetchData() {
        try {
            const rolesResponse = await fetch('/api/get_roles_list');
            if (!rolesResponse.ok) throw new Error('Failed to fetch ordered roles.');
            const orderedRoles = await rolesResponse.json();

            const playersResponse = await fetch('/api/get_roles_and_players');
            if (!playersResponse.ok) throw new Error('Failed to fetch players data.');
            const playersData = await playersResponse.json();
            rolesCount = playersData.saved_roles;
            totalPlayers = playersData.player_count;
            playerCounterEl.textContent = totalPlayers;

            const specialRolesResponse = await fetch('/api/game/get_special_roles');
            if (!specialRolesResponse.ok) throw new Error('Failed to fetch special roles.');
            const specialRolesData = await specialRolesResponse.json();
            if (specialRolesData.dieb_roles) {
                specialRoles.dieb_roles = specialRolesData.dieb_roles;
            }
            if (specialRolesData.gaukler_roles) {
                specialRoles.gaukler_roles = specialRolesData.gaukler_roles;
            }

            renderRoles(orderedRoles);
        } catch (error) {
            console.error(error);
            alert("Fehler beim Laden der Spieldaten.");
        }
    }

    function renderRoles(orderedRoles) {
        rolesContainer.innerHTML = '';
        let totalSelectedRoles = 0;

        for (const role of orderedRoles) {
            const count = rolesCount[role] || 0;
            totalSelectedRoles += count;

            const roleDiv = document.createElement("div");
            roleDiv.classList.add("role-card");
            if (role in rolesCount && rolesCount[role] > 0) {
                roleDiv.classList.add("selected");
            }
            roleDiv.onclick = () => {
                const hasSpecialRoleSelection = specialRoleToSelect !== null;
                if (hasSpecialRoleSelection) {
                    return;
                }
                if (rolesCount[role]) {
                    rolesCount[role] = 0;
                    roleDiv.classList.remove("selected");
                } else {
                    rolesCount[role] = 1;
                    roleDiv.classList.add("selected");
                }
                if (role === 'Dieb' && rolesCount[role] === 1) {
                    showSpecialRolePopup('dieb');
                }
                if (role === 'Der Gaukler' && rolesCount[role] === 1) {
                    showSpecialRolePopup('gaukler');
                }
                updateTotalSelectedRoles();
            };

            const roleNameEl = document.createElement("span");
            roleNameEl.classList.add("role-name");
            roleNameEl.textContent = role;

            const counterDiv = document.createElement("div");
            counterDiv.classList.add("counter-container");

            const minusBtn = document.createElement("button");
            minusBtn.textContent = "-";
            minusBtn.classList.add("counter-btn");
            minusBtn.onclick = (e) => {
                e.stopPropagation();
                if (rolesCount[role] && rolesCount[role] > 0) {
                    rolesCount[role]--;
                    if (rolesCount[role] === 0) {
                        roleDiv.classList.remove("selected");
                    }
                    updateTotalSelectedRoles();
                }
            };

            const countEl = document.createElement("span");
            countEl.textContent = count;
            countEl.classList.add("role-count");

            const plusBtn = document.createElement("button");
            plusBtn.textContent = "+";
            plusBtn.classList.add("counter-btn");
            plusBtn.onclick = (e) => {
                e.stopPropagation();
                if (!rolesCount[role]) {
                    rolesCount[role] = 0;
                }
                rolesCount[role]++;
                roleDiv.classList.add("selected");
                updateTotalSelectedRoles();
            };

            const infoBtn = document.createElement("button");
            infoBtn.textContent = "i";
            infoBtn.classList.add("info-btn");
            infoBtn.onclick = (e) => {
                e.stopPropagation();
                window.showInfo(role);
            };

            counterDiv.appendChild(minusBtn);
            counterDiv.appendChild(countEl);
            counterDiv.appendChild(plusBtn);

            if (role !== "Dorfbewohner" && role !== "Werwölfe") {
                roleDiv.appendChild(infoBtn);
            }
            roleDiv.appendChild(roleNameEl);
            roleDiv.appendChild(counterDiv);
            rolesContainer.appendChild(roleDiv);
        }

        updateTotalSelectedRoles();
    }

    function updateTotalSelectedRoles() {
        let totalSelectedRoles = 0;
        for (const role in rolesCount) {
            totalSelectedRoles += rolesCount[role];
        }
        rolesToGoEl.textContent = totalPlayers - totalSelectedRoles;
        if (totalSelectedRoles === totalPlayers) {
            rolesToGoEl.classList.remove("error");
            startButtons.forEach(btn => btn.style.display = 'block');
        } else {
            rolesToGoEl.classList.add("error");
            startButtons.forEach(btn => btn.style.display = 'none');
        }
        saveRoleCounts(rolesCount);
    }

    async function saveRoleCounts(counts) {
        try {
            await fetch('/api/game/save_roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role_counts: counts }),
            });
        } catch (error) {
            console.error("Fehler beim Speichern der Rollen:", error);
        }
    }

    async function saveSpecialRoles(specialRoles) {
        try {
            await fetch('/api/game/save_special_roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(specialRoles),
            });
        } catch (error) {
            console.error("Fehler beim Speichern der Spezialrollen:", error);
        }
    }

    function showSpecialRolePopup(roleType) {
        const popup = document.getElementById('special-roles-popup');
        const title = document.getElementById('special-role-title');
        const description = document.getElementById('special-role-description');
        const selectContainer = document.getElementById('special-role-select-container');

        selectContainer.innerHTML = '';

        specialRoleToSelect = roleType;
        selectedSpecialRolesCount = 0;
        if (roleType === 'dieb') {
            title.textContent = "Wähle zwei Rollen für den Dieb aus.";
            description.textContent = "Wähle zwei Rollen aus, die der Dieb in der ersten Nacht tauschen kann. Die gewählten Rollen sind nicht im eigentlichen Spiel vorhanden.";
            totalSpecialRolesToSelect = 2;
        } else if (roleType === 'gaukler') {
            title.textContent = "Wähle drei Rollen für den Gaukler aus.";
            description.textContent = "Wähle drei Rollen aus, die der Gaukler jede Nacht spielen kann. Die gewählten Rollen sind nicht im eigentlichen Spiel vorhanden.";
            totalSpecialRolesToSelect = 3;
        }

        const rolesList = Object.keys(rolesCount).filter(r => r !== 'Dorfbewohner' && r !== 'Werwölfe' && r !== 'Dieb' && r !== 'Der Gaukler');

        rolesList.forEach(role => {
            const roleCard = document.createElement('div');
            roleCard.classList.add('role-card-small');
            roleCard.textContent = role;

            if (specialRoles[roleType + '_roles'].includes(role)) {
                roleCard.classList.add('selected');
            }

            roleCard.onclick = () => {
                if (roleCard.classList.contains('selected')) {
                    roleCard.classList.remove('selected');
                    selectedSpecialRolesCount--;
                    const index = specialRoles[roleType + '_roles'].indexOf(role);
                    if (index > -1) {
                        specialRoles[roleType + '_roles'].splice(index, 1);
                    }
                } else if (selectedSpecialRolesCount < totalSpecialRolesToSelect) {
                    roleCard.classList.add('selected');
                    selectedSpecialRolesCount++;
                    specialRoles[roleType + '_roles'].push(role);
                }

                document.getElementById('special-roles-counter').textContent = `${selectedSpecialRolesCount}/${totalSpecialRolesToSelect}`;
            };
            selectContainer.appendChild(roleCard);
        });

        document.getElementById('special-roles-counter').textContent = `${selectedSpecialRolesCount}/${totalSpecialRolesToSelect}`;
        window.showPopup('special-roles-popup');
    }

    document.getElementById('save-special-roles-btn').onclick = async () => {
        if (selectedSpecialRolesCount === totalSpecialRolesToSelect) {
            await saveSpecialRoles(specialRoles);
            window.hidePopup('special-roles-popup');
            specialRoleToSelect = null;
        } else {
            alert(`Bitte wähle genau ${totalSpecialRolesToSelect} Rollen aus.`);
        }
    };

    document.getElementById('cancel-special-roles-btn').onclick = () => {
        window.hidePopup('special-roles-popup');
        specialRoleToSelect = null;
    };

    document.getElementById('start-game-btn').onclick = async () => {
        const totalSelectedRoles = Object.values(rolesCount).reduce((sum, count) => sum + count, 0);
        if (totalSelectedRoles !== totalPlayers) {
            alert("Die Anzahl der ausgewählten Rollen muss genau der Anzahl der Spieler entsprechen.");
            return;
        }

        const payload = {
            role_counts: rolesCount,
            special_roles: specialRoles
        };

        try {
            const response = await fetch('/api/game/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                window.location.href = '/karten';
            } else {
                alert("Fehler beim Starten des Spiels: " + data.error);
            }
        } catch (error) {
            console.error("Fehler beim Starten des Spiels:", error);
            alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
    };

    fetchData();
});