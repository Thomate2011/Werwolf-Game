// Allgemeine Hilfsfunktionen für Popups und Informationen
document.addEventListener('DOMContentLoaded', () => {
    window.showPopup = (id, overlay = true) => {
        document.getElementById(id).style.display = 'block';
        if (overlay) document.getElementById('overlay').style.display = 'block';
    };

    window.hidePopup = (id) => {
        document.getElementById(id).style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    };

    window.showInfo = async (role) => {
        const popup = document.getElementById('info-popup');
        try {
            const response = await fetch('/api/get_roles_and_players');
            if (!response.ok) {
                throw new Error('Failed to fetch roles and players.');
            }
            const data = await response.json();
            const roleDescription = data.all_roles[role] || "Keine Erklärung verfügbar.";
            document.getElementById('popup-role-name').textContent = role;
            document.getElementById('popup-role-description').textContent = roleDescription;
            showPopup('info-popup');
        } catch (error) {
            console.error(error);
            alert("Fehler beim Laden der Rolleninformationen.");
        }
    };

    window.hideInfo = () => hidePopup('info-popup');
});