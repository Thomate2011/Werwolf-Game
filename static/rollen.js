document.addEventListener('DOMContentLoaded', () => {
    const roleCounts = {};
    const playerCounter = document.getElementById('playerCounter');
    const playerCount = parseInt(playerCounter.dataset.playerCount);
    const playerCounterSpan = document.getElementById('playerCount');
    const rolesCounterSpan = document.getElementById('rolesCount');
    
    let savedRolesData = JSON.parse(playerCounter.dataset.savedRoles);
    
    // Populate roleCounts from saved data
    for (const role in savedRolesData) {
        roleCounts[role] = savedRolesData[role];
    }

    const updateCounters = () => {
        const rolesCount = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
        rolesCounterSpan.textContent = rolesCount;
        if (rolesCount === playerCount) {
            rolesCounterSpan.style.color = 'green';
        } else {
            rolesCounterSpan.style.color = 'red';
        }
    };

    document.querySelectorAll('.role-card').forEach(card => {
        const roleName = card.dataset.role;
        const countDisplay = card.querySelector('.role-count');
        const minusBtn = card.querySelector('.minus-btn');
        const plusBtn = card.querySelector('.plus-btn');

        let count = roleCounts[roleName] || 0;
        countDisplay.textContent = count;

        if (count > 0) {
            minusBtn.style.display = 'inline-block';
        }

        minusBtn.addEventListener('click', () => {
            if (count > 0) {
                count--;
                roleCounts[roleName] = count;
                countDisplay.textContent = count;
                if (count === 0) {
                    minusBtn.style.display = 'none';
                }
                updateCounters();
            }
        });

        plusBtn.addEventListener('click', () => {
            count++;
            roleCounts[roleName] = count;
            countDisplay.textContent = count;
            minusBtn.style.display = 'inline-block';
            updateCounters();
        });
    });

    updateCounters();

    document.getElementById('start-game-btn').addEventListener('click', async () => {
        const rolesCount = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
        if (rolesCount !== playerCount) {
            alert(`Die Anzahl der Rollen (${rolesCount}) muss genau der Anzahl der Spieler (${playerCount}) entsprechen.`);
            return;
        }

        // Save role counts to session
        await fetch('/api/game/save_roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_counts: roleCounts })
        });

        // Gather and save special roles for Dieb and Gaukler
        const specialRoles = {};
        if (roleCounts['Dieb'] > 0) {
            const diebRolesInput = document.getElementById('dieb-roles');
            const diebRoles = diebRolesInput.value.split(',').map(role => role.trim()).filter(role => role.length > 0);
            specialRoles['dieb_roles'] = diebRoles;
        }
        if (roleCounts['Der Gaukler'] > 0) {
            const gauklerRolesInput = document.getElementById('gaukler-roles');
            const gauklerRoles = gauklerRolesInput.value.split(',').map(role => role.trim()).filter(role => role.length > 0);
            specialRoles['gaukler_roles'] = gauklerRoles;
        }
        if (Object.keys(specialRoles).length > 0) {
            await fetch('/api/game/save_special_roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(specialRoles)
            });
        }

        // Start the game on the backend
        const response = await fetch('/api/game/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role_counts: roleCounts,
                special_roles: specialRoles
            })
        });

        const data = await response.json();
        if (response.ok) {
            window.location.href = '/karten';
        } else {
            alert("Fehler beim Starten des Spiels: " + data.error);
        }
    });

    // Hide/Show special roles input fields
    const diebCard = document.querySelector('.role-card[data-role="Dieb"]');
    const gauklerCard = document.querySelector('.role-card[data-role="Der Gaukler"]');

    const toggleSpecialRoleInputs = () => {
        const diebInput = document.getElementById('dieb-roles-container');
        const gauklerInput = document.getElementById('gaukler-roles-container');
        diebInput.style.display = roleCounts['Dieb'] > 0 ? 'block' : 'none';
        gauklerInput.style.display = roleCounts['Der Gaukler'] > 0 ? 'block' : 'none';
    };

    diebCard.querySelector('.plus-btn').addEventListener('click', toggleSpecialRoleInputs);
    diebCard.querySelector('.minus-btn').addEventListener('click', toggleSpecialRoleInputs);
    gauklerCard.querySelector('.plus-btn').addEventListener('click', toggleSpecialRoleInputs);
    gauklerCard.querySelector('.minus-btn').addEventListener('click', toggleSpecialRoleInputs);
    toggleSpecialRoleInputs();
});