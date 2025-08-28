document.addEventListener('DOMContentLoaded', function() {
    const playersList = document.getElementById('players-list');
    const startBtn = document.getElementById('start-btn');
    
    // Annahme: Die Namen werden von der vorherigen Seite über die Session gespeichert
    // und hier über das Template geladen oder direkt von einer API abgerufen.
    // Für dieses Beispiel gehen wir davon aus, dass die Namen bereits vorhanden sind.

    startBtn.addEventListener('click', function() {
        // Leitet zur Rollenauswahl weiter
        window.location.href = '/rollen';
    });
});