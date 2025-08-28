// Spezifisches JavaScript für die spiel.html Seite
document.addEventListener('DOMContentLoaded', () => {
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
});