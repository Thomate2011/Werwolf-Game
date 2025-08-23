from flask import Flask, request, jsonify, redirect, url_for, render_template_string, session
import random
import json

app = Flask(__name__)
app.secret_key = 'your_super_secret_key' # Ein geheimer Schlüssel wird für Sessions benötigt

# Ein Dictionary, um den Zustand des Spiels zu speichern.
game_state = {
    "players": [],
    "roles": {},
    "total_roles_count": 0,
    "game_started": False,
    "assigned_roles": {},
    "current_player_index": 0,
}

# --- Konstanten für alle verfügbaren Rollen und ihre detaillierten Erklärungen ---
ALL_ROLES = {
    "Dorfbewohner": "Der normale Dorfbewohner hat keine Sonderfähigkeit.",
    "Werwölfe": "Die Werwölfe werden nachts vom Spielleiter aufgerufen, erkennen sich und einigen sich auf ein Opfer, welches „gefressen“ wird und somit aus dem Spiel ist.",
    "Hexe": "Die Hexe erwacht, nachdem die Werwölfe ihr Opfer ausgesucht haben. Sie hat im Verlauf des gesamten Spiels einen Gift- und einen Heiltrank. Der Spielleiter zeigt der Hexe das Opfer und die Hexe kann es mit ihrem Heiltrank heilen (auch sich selbst), so dass es überlebt. Sie kann aber auch den Gifttrank auf einen anderen Spieler anwenden. Dadurch kann es in einer Nacht keine, einen oder zwei Tote geben.",
    "Jäger": "Scheidet der Jäger aus dem Spiel aus, feuert er in seinem letzten Lebensmoment noch einen Schuss ab, mit dem er einen Spieler seiner Wahl mit in den Tod reißt.",
    "Amor": "Amor erwacht nur einmal in der allerersten Nacht, um zwei Spieler seiner Wahl miteinander zu verkuppeln (eventuell auch sich selbst). Danach schläft er wieder ein.",
    "Dieb": "Der Dieb kann in der ersten Runde seine Karte mit der eines anderen tauschen.",
    "Kleines Mädchen": "Das kleine Mädchen darf nachts in der Werwolf-Phase heimlich blinzeln, um so die Werwölfe zu erkennen.",
    "Seherin": "Die Seherin erwacht, während alle anderen schlafen, und darf sich eine Person aussuchen, deren Rolle sie sehen möchte.",
    "Heiler/Beschützer": "Der Heiler erwacht am Anfang jeder Nacht und bestimmt einen Spieler (auch sich selbst), den er vor den Werwölfen beschützen will. Selbst wenn der ausgewählte Spieler von den Werwölfen gebissen wird, stirbt er nicht. Es ist nicht erlaubt, zwei Runden hintereinander denselben Charakter zu schützen, da dieser sonst unsterblich wäre.",
    "Sündenbock": "Immer wenn es im Dorf zu einer Pattsituation zwischen dem Sündenbock und einer Person während der Abstimmung kommt, trifft es sofort den Sündenbock. Er opfert sich für das Dorf und scheidet aus dem Spiel aus.",
    "Dorfdepp": "Wird der Dorfdepp vom Dorfgericht zum Opfer gewählt, erkennen sie im letzten Moment, dass es sich nur um den Dorfdeppen handelt. Der Dorfdepp bleibt im Spiel, verliert jedoch sein Abstimmungsrecht.",
    "Der Alte": "Der Alte überlebt den ersten Angriff der Werwölfe. Wird er aber vom Dorfgericht zum Opfer bestimmt, durch die Hexe oder den Jäger umgebracht stirbt er.",
    "Flötenspieler": "Der Flötenspieler ist eine eigene Partei und kann nur alleine das Spiel gewinnen, außer er ist verliebt. In diesem Fall gewinnt er, wenn nur noch er und die geliebte Person im Spiel sind. Er erwacht immer am Ende jeder Nacht und bestimmt zwei Spieler, die er mit seiner Musik verzaubert. Der Flötenspieler gewinnt das Spiel alleine, wenn alle anderen Spieler verzaubert sind.",
    "Der große böse Werwolf": "Der große böse Wolf ist ein Wolf, der in jeder zweiten Nacht zweimal tötet. Er einigt sich zunächst mit den anderen Wölfen auf ein Opfer, dann wählt er sich allein ein zweites Opfer.",
    "Der Urwolf": "Er ist ein Werwolf, der einmalig einen Spieler statt zu fressen in einen Werwolf verwandeln kann. Er signalisiert dem Spielleiter heimlich, nach der Entscheidung aller Werwölfe, wenn eine Umwandlung stattfinden soll.",
    "Der weiße Werwolf": "Der weiße Werwolf wacht jede Runde zusammen mit den anderen Werwölfen auf und verhält sich normal. Zusätzlich wacht er aber jede zweite Runde erneut gesondert auf und kann, wenn er möchte, einen der anderen Werwölfe töten. Sein Ziel ist es, als einziger zu überleben.",
    "Der Wolfshund": "Wenn er vom Spielleiter aufgerufen wird, kann er entscheiden, ob er zum Werwolf werden oder Dorfbewohner bleiben möchte.",
    "Das wilde Kind": "Das wilde Kind wählt am Anfang des Spiels einen anderen Spieler, der ab dann sein Vorbild wird. Stirbt sein Vorbild, wird das wilde Kind zum Werwolf.",
    "Die reine Seele": "Du wirst noch am Tag aufgerufen und jeder weiß, dass du ein Dorfbewohner bist.",
    "Der Engel": "Wenn er in der Abstimmung der ersten Runde eliminiert wird (nicht von den Werwölfen), gewinnt er das Spiel allein.",
    "Die drei Brüder": "Die drei Brüder erwachen zusammen in der ersten Nacht und erkennen sich. Ansonsten sind sie einfache Dorfbewohner.",
    "Die zwei Schwestern": "Die zwei Schwestern erwachen zusammen in der ersten Nacht und erkennen sich. Ansonsten sind sie einfache Dorfbewohner.",
    "Der Fuchs": "Wenn er in der Nacht aufgerufen wird, wählt er einen Spieler aus und erfährt vom Spielleiter, ob dieser oder einer seiner beiden Nachbarn ein Werwolf ist oder nicht. Ist bei dem Trio mindestens ein Werwolf dabei, darf er es in der nächsten Nacht ein weiteres Mal versuchen. Ist aber keiner der drei ein Werwolf, verliert er seine Fähigkeit.",
    "Die ergebene Magd": "Wenn jemand stirbt kann die ergebene Magd bevor erfahren wird welche Rolle die tote Person hat ihre Rolle mit der, der toten Person tauschen und ihre Rolle weiterspielen.",
    "Der Bärenführer": "Wenn sich der Bärenführer am Morgen in seiner Sitzposition unmittelbar neben einem Werwolf befindet (ausgeschiedene Spieler werden ignoriert), zeigt der Spielleiter dies durch ein Bärenknurren. Ist der Bärenführer vom Urwolf infiziert, knurrt der Spielleiter jeden Morgen.",
    "Der Ritter mit der verrosteten Klinge": "Der Ritter infiziert mit seinem rostigen Schwert den Werwolf zu seiner Linken mit Tetanus, wenn er von ihnen in der Nacht gefressen wird. Dieser Werwolf stirbt dann in der folgenden Nacht.",
    "Der verbitterte Greis": "Zu Beginn teilt der Spielleiter anhand eines offensichtlich einsehbaren, binären Kriteriums das Dorf in zwei Gruppen (z. B. Brille/keine Brille, Bart/kein Bart, größer als 170 cm/kleiner als 170 cm, Geschlecht) – der Greis gehört dann zu einer der beiden Gruppen. Sein Ziel, um das Spiel alleine zu gewinnen, ist es die andere Gruppe komplett zu beseitigen.",
    "Der Gaukler": "Der Spielleiter wählt vor dem Start drei zusätzliche Rollen aus, die er offen in die Mitte legt. Zu Beginn jeder Nacht wählt sich der Schauspieler eine dieser Rollen aus und spielt sie bis zur folgenden Nacht.",
    "Der stotternde Richter": "Der Spielleiter und der Richter einigen sich in der ersten Nacht auf ein Zeichen. Wenn der Richter nach der regulären Abstimmung des Dorfes und dem Tod eines Spielers dieses Zeichen gibt, führt der Spielleiter sofort noch eine Abstimmung ohne erneute Diskussion durch.",
    "Der Obdachlose": "Wenn du aufgerufen wirst, wählst du eine Person bei der du übernachten willst. Wenn diese Person in der Nacht von den Werwölfen getötet wird, stirbst du auch. Wenn die Werwölfe dich in der Nacht töten wollen, stirbst du nicht, weil du bei der anderen Person schläfst."
}

def get_role_counts_from_session():
    """Hilfsfunktion, um Rollen aus der Session zu laden."""
    return json.loads(session.get('saved_roles', '{}'))

def save_role_counts_to_session(role_counts):
    """Hilfsfunktion, um Rollen in der Session zu speichern."""
    session['saved_roles'] = json.dumps(role_counts)

# --- WEBSEITEN-ROUTEN (Front-End) ---

@app.route('/')
def startseite():
    session.clear() # Hier wird die Session beim Betreten der Startseite geleert.
    html_content = """
    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4CAF50;">Willkommen bei dem Werwolf-Spiel von Thomas.</h1>
        <p style="font-size: 1.2em; color: #555;">Hier kannst du einfach die Rollen für dein Werwolf-Spiel verteilen und sie dir erklären lassen.</p>
        <hr style="margin: 30px auto; width: 50%;">
        <a href="/spiel" style="text-decoration: none;">
            <button style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Zum Spiel</button>
        </a>
    </div>
    """
    return html_content

@app.route('/spiel', methods=['GET', 'POST'])
def spiel_seite():
    if request.method == 'POST':
        namen_string = request.form.get("namen")
        namen_liste = [name.strip() for name in namen_string.split('\n') if name.strip()]
        
        session['saved_players'] = namen_string
        
        saved_roles = get_role_counts_from_session()
        total_roles_selected = sum(saved_roles.values())
        if len(namen_liste) < total_roles_selected:
            save_role_counts_to_session({})
        
        return redirect(url_for('rollen_seite'))

    saved_players_string = session.get('saved_players', '')
    html_content = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4CAF50;">Namen eingeben</h1>
        <p style="font-size: 1em; color: #555;">Gib die Namen der Spieler ein (jeder Name in einer neuen Zeile).</p>
        <form action="/spiel" method="post">
            <textarea name="namen" rows="10" cols="40" style="width: 80%; padding: 10px; font-size: 1em;">{saved_players_string}</textarea><br><br>
            <button type="submit" style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #008CBA; color: white; border: none; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Zu den Rollen</button>
        </form>
    </div>
    """
    return html_content

@app.route('/rollen_seite', methods=['GET'])
def rollen_seite():
    all_roles = list(ALL_ROLES.keys())
    saved_roles = get_role_counts_from_session()
    
    player_count = len([name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()])
    if player_count == 0:
        return redirect(url_for('spiel_seite'))

    roles_html = ""
    for role in all_roles:
        count = saved_roles.get(role, 0)
        roles_html += f"""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 5px 10px; border: 1px solid #ddd; border-radius: 5px;">
            <div style="display: flex; align-items: center;">
                <span style="font-size: 1.1em; color: #333;">{role}</span>
                <button onclick="showInfo('{role}')" style="font-size: 1em; margin-left: 10px; padding: 0 5px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #008CBA; background-color: #008CBA; color: white; cursor: pointer; display: flex; justify-content: center; align-items: center;">i</button>
            </div>
            <div>
                <button onclick="decrementRole('{role}')" style="font-size: 1.2em; padding: 5px 10px; cursor: pointer;">-</button>
                <span id="{role}-count" style="font-size: 1.2em; margin: 0 10px;">{count}</span>
                <button onclick="incrementRole('{role}')" style="font-size: 1.2em; padding: 5px 10px; cursor: pointer;">+</button>
            </div>
        </div>
        """
    
    return render_template_string(f"""
    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4CAF50;">Rollen auswählen</h1>
        <p style="font-size: 1em; color: #555;">Wähle genau {player_count} Rollen aus.</p>
        <p style="font-size: 1.2em; color: #008CBA;">Noch zu vergeben: <span id="roles-to-go">{player_count - sum(saved_roles.values())}</span></p>
        
        <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
            <a href="/spiel" style="text-decoration: none;">
                <button style="font-size: 1em; padding: 10px 15px; cursor: pointer; background-color: #f44336; color: white; border: none; border-radius: 5px;">Zurück</button>
            </a>
            <button id="start-button-top" onclick="startGame()" style="font-size: 1em; padding: 10px 15px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; display: none;">Mischen</button>
        </div>
        

        {roles_html}

        <button id="start-button-bottom" onclick="startGame()" style="font-size: 1.5em; padding: 15px 30px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; margin-top: 20px; display: none;">Mischen</button>
    </div>

    <div id="info-popup" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 400px; background: white; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000;">
        <h2 id="popup-role-name"></h2>
        <p id="popup-role-description"></p>
        <button onclick="hideInfo()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; cursor: pointer;">&times;</button>
    </div>
    <div id="overlay" onclick="hideInfo()" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;"></div>

    <script>
        let rolesCount = {json.dumps(saved_roles)};
        const ALL_ROLES_DESCRIPTIONS = {json.dumps(ALL_ROLES)};
        const totalPlayers = {player_count};
        const rolesToGo = document.getElementById("roles-to-go");
        const startButtonTop = document.getElementById("start-button-top");
        const startButtonBottom = document.getElementById("start-button-bottom");

        function updateRolesToGo() {{
            const totalRolesSelected = Object.values(rolesCount).reduce((a, b) => a + b, 0);
            const remainingRoles = totalPlayers - totalRolesSelected;
            rolesToGo.textContent = remainingRoles;
            if (remainingRoles === 0) {{
                startButtonTop.style.display = 'inline-block';
                startButtonBottom.style.display = 'inline-block';
            }} else {{
                startButtonTop.style.display = 'none';
                startButtonBottom.style.display = 'none';
            }}
        }}

        function incrementRole(role) {{
            if (!rolesCount[role]) {{
                rolesCount[role] = 0;
            }}
            if (Object.values(rolesCount).reduce((a, b) => a + b, 0) < totalPlayers) {{
                rolesCount[role]++;
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }}
        }}

        function decrementRole(role) {{
            if (rolesCount[role] > 0) {{
                rolesCount[role]--;
                document.getElementById(role + '-count').textContent = rolesCount[role];
                updateRolesToGo();
                saveRoles();
            }}
        }}

        function showInfo(role) {{
            const popup = document.getElementById('info-popup');
            const overlay = document.getElementById('overlay');
            document.getElementById('popup-role-name').textContent = role;
            document.getElementById('popup-role-description').textContent = ALL_ROLES_DESCRIPTIONS[role];
            popup.style.display = 'block';
            overlay.style.display = 'block';
        }}

        function hideInfo() {{
            document.getElementById('info-popup').style.display = 'none';
            document.getElementById('overlay').style.display = 'none';
        }}
        
        function saveRoles() {{
            fetch('/api/game/save_roles', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{ 'role_counts': rolesCount }})
            }});
        }}

        async function startGame() {{
            const response = await fetch('/api/game/roles', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{ 'role_counts': rolesCount }})
            }});
            const result = await response.json();
            if (response.ok) {{
                window.location.href = '/karten';
            }} else {{
                alert(result.error);
            }}
        }}

        updateRolesToGo();
    </script>
    """)

@app.route('/karten')
def karten_seite():
    return render_template_string(f"""
    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4CAF50;">Rollen aufdecken</h1>
        <div id="player-card" style="min-height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; border: 2px dashed #008CBA; border-radius: 10px;">
            <h2 id="player-name" style="color: #333;"></h2>
            <p id="role-name" style="font-size: 1.5em; font-weight: bold; color: #f44336; display: none;"></p>
            <p id="role-description" style="font-size: 1em; color: #555; display: none;"></p>
            <button id="reveal-role-btn" style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #008CBA; color: white; border: none; border-radius: 5px; margin-top: 15px;">Rolle aufdecken</button>
            <button id="show-description-btn" style="font-size: 1em; padding: 8px 15px; cursor: pointer; background-color: #2196F3; color: white; border: none; border-radius: 5px; margin-top: 10px; display: none;">Erklärung</button>
            <button id="next-player-btn" style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; margin-top: 15px; display: none;">Nächster Spieler</button>
        </div>
    </div>
    <script>
        let currentRoleData = null;
        let isRevealed = false;

        async function fetchCurrentPlayer() {{
            const response = await fetch('/api/game/next_card');
            const data = await response.json();
            if (response.ok) {{
                if (data.message) {{
                    window.location.href = '/neustart';
                }} else {{
                    document.getElementById('player-name').textContent = data.player_name;
                    document.getElementById('reveal-role-btn').style.display = 'inline-block';
                    isRevealed = false;
                }}
            }}
        }}
        
        async function revealCard() {{
            const response = await fetch('/api/game/reveal_and_next', {{ method: 'POST' }});
            const data = await response.json();
            if (response.ok) {{
                currentRoleData = data;
                document.getElementById('role-name').textContent = data.role_name;
                document.getElementById('role-name').style.display = 'block';
                document.getElementById('reveal-role-btn').style.display = 'none';
                document.getElementById('show-description-btn').style.display = 'inline-block';
                document.getElementById('next-player-btn').style.display = 'inline-block';
                isRevealed = true;
            }} else {{
                alert(data.error);
            }}
        }}

        function showDescription() {{
            if (currentRoleData && isRevealed) {{
                document.getElementById('role-description').textContent = currentRoleData.role_description;
                document.getElementById('role-description').style.display = 'block';
                document.getElementById('show-description-btn').style.display = 'none';
            }}
        }}

        function nextPlayer() {{
            window.location.reload();
        }}

        document.getElementById('reveal-role-btn').addEventListener('click', revealCard);
        document.getElementById('show-description-btn').addEventListener('click', showDescription);
        document.getElementById('next-player-btn').addEventListener('click', nextPlayer);

        window.onload = fetchCurrentPlayer;
    </script>
    """)

@app.route('/neustart')
def neustart_seite():
    players_list_html = ""
    for player_info in game_state["players"]:
        player_name = player_info["name"]
        role = game_state["assigned_roles"].get(player_name, "Rolle noch nicht zugewiesen.")
        status = player_info["status"]
        
        style = ''
        if status == 'dead':
            style = 'text-decoration: line-through; color: #888;'
            
        players_list_html += f"""
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer; {style}">
            <span onclick="killPlayer('{player_name}')" style="flex-grow: 1; text-align: left;">
                <span style="font-weight: bold;">{role}</span> | {player_name}
            </span>
            <button onclick="showInfoNeustart('{role}')" style="font-size: 1em; margin-left: 10px; padding: 0 5px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #008CBA; background-color: #008CBA; color: white; cursor: pointer; display: flex; justify-content: center; align-items: center;">i</button>
        </div>
        """

    return render_template_string(f"""
    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4CAF50;">Spielübersicht</h1>
        
        <div style="text-align: left; padding: 0 20px;">
            <p>Tippe auf den Namen, um einen ausgeschiedenen Spieler zu entfernen.</p>
        </div>
        
        <div id="player-list" style="text-align: left; margin: 20px auto; width: 80%;">
            {players_list_html}
        </div>
        
        <button onclick="restartGame()" style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #f44336; color: white; border: none; border-radius: 5px; margin-top: 20px;">Neustart</button>
        <a href="/" style="text-decoration: none;">
            <button style="font-size: 1.2em; padding: 10px 20px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; margin-top: 20px;">Zur Startseite</button>
        </a>
    </div>

    <div id="info-popup-neustart" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 400px; background: white; padding: 20px; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000;">
        <p id="popup-role-name-neustart" style="font-size: 3em; font-weight: bold; color: #008CBA; margin-bottom: 5px;"></p>
        <p id="popup-role-description-neustart" style="font-size: 0.9em; color: #555;"></p>
        <button onclick="hideInfoNeustart()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 2em; cursor: pointer;">&times;</button>
    </div>

    <script>
        const ALL_ROLES_DESCRIPTIONS = {json.dumps(ALL_ROLES)};

        async function killPlayer(playerName) {{
            const confirmKill = confirm(`Spieler '{{playerName}}' als 'tot' markieren?`);
            if (confirmKill) {{
                const killResponse = await fetch(`/api/gamemaster/kill/` + playerName, {{ method: 'PUT' }});
                if (killResponse.ok) {{
                    window.location.reload();
                }} else {{
                    alert('Fehler beim Markieren des Spielers.');
                }}
            }}
        }}

        async function restartGame() {{
            const response = await fetch('/api/game/restart', {{ method: 'POST' }});
            const result = await response.json();
            alert(result.message);
            window.location.href = '/rollen_seite';
        }}
        
        function showInfoNeustart(role) {{
            const popup = document.getElementById('info-popup-neustart');
            document.getElementById('popup-role-name-neustart').textContent = role;
            document.getElementById('popup-role-description-neustart').textContent = ALL_ROLES_DESCRIPTIONS[role];
            popup.style.display = 'block';
        }}

        function hideInfoNeustart() {{
            document.getElementById('info-popup-neustart').style.display = 'none';
        }}
    </script>
    """)

# --- API-ENDPUNKTE ---

@app.route('/api/game/save_roles', methods=['POST'])
def save_roles_api():
    data = request.get_json()
    save_role_counts_to_session(data.get('role_counts', {}))
    return jsonify({"message": "Rollen wurden in der Session gespeichert."}), 200

@app.route('/api/game/roles', methods=['POST'])
def set_game_roles():
    data = request.get_json()
    role_counts = data.get("role_counts", {})
    
    total_players = len([name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()])
    if total_players < 4:
        return jsonify({"error": "Es müssen mindestens 4 Spieler angemeldet sein."}), 400

    total_roles_count = sum(role_counts.values())

    if total_roles_count != total_players:
        return jsonify({
            "error": "Die Anzahl der Rollen muss genau der Anzahl der Spieler entsprechen.",
            "players_count": total_players,
            "roles_count": total_roles_count
        }), 400
    
    players_list = [{"name": name, "status": "alive"} for name in [name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()]]
    game_state["players"] = players_list
    game_state["roles"] = role_counts
    game_state["total_roles_count"] = total_roles_count
    
    roles_to_assign = []
    for role, count in game_state["roles"].items():
        roles_to_assign.extend([role] * count)
    
    random.shuffle(roles_to_assign)
    
    assigned_roles = {}
    for i, player_info in enumerate(game_state["players"]):
        player_name = player_info["name"]
        assigned_roles[player_name] = roles_to_assign[i]
        
    game_state["assigned_roles"] = assigned_roles
    game_state["game_started"] = True
    game_state["current_player_index"] = 0
    
    return jsonify({"message": "Spiel erfolgreich gestartet. Rollen wurden zugewiesen."}), 200

@app.route('/api/game/next_card', methods=['GET'])
def get_next_card():
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    current_index = game_state["current_player_index"]
    
    if current_index >= len(game_state["players"]):
        return jsonify({"message": "Alle Rollen wurden aufgedeckt. Das Spiel kann beginnen."})
        
    player_name = game_state["players"][current_index]["name"]
    
    response = {
        "player_name": player_name,
        "current_player_index": current_index
    }
    
    return jsonify(response)

@app.route('/api/game/reveal_and_next', methods=['POST'])
def reveal_and_next():
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    current_index = game_state["current_player_index"]

    if current_index >= len(game_state["players"]):
        return jsonify({"error": "Alle Rollen wurden bereits aufgedeckt."}), 400
        
    player_name = game_state["players"][current_index]["name"]
    
    role_name = game_state["assigned_roles"].get(player_name)
    
    if not role_name:
        return jsonify({"error": "Rolle konnte für diesen Spieler nicht gefunden werden."}), 404
        
    role_description = ALL_ROLES.get(role_name, "Keine Erklärung verfügbar.")
    
    game_state["current_player_index"] += 1
    
    return jsonify({
        "player_name": player_name,
        "role_name": role_name,
        "role_description": role_description,
        "is_last_card": (game_state["current_player_index"] >= len(game_state["players"]))
    })

@app.route('/api/gamemaster/view', methods=['GET'])
def get_gamemaster_view():
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    overview = []
    for player_info in game_state["players"]:
        player_name = player_info["name"]
        role = game_state["assigned_roles"].get(player_name, "Rolle noch nicht zugewiesen.")
        
        overview.append({
            "name": player_name,
            "role": role,
            "status": player_info["status"],
        })
        
    return jsonify(overview)

@app.route('/api/gamemaster/kill/<player_name>', methods=['PUT'])
def kill_player(player_name):
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    player_found = False
    
    for player_info in game_state["players"]:
        if player_info["name"] == player_name:
            player_info["status"] = "dead"
            player_found = True
            break
    
    if player_found:
        return jsonify({"message": f"Spieler '{player_name}' wurde als 'tot' markiert."})
    else:
        return jsonify({"error": "Spieler nicht gefunden."}), 404

@app.route('/api/game/restart', methods=['POST'])
def restart_game():
    game_state["game_started"] = False
    game_state["assigned_roles"] = {}
    game_state["current_player_index"] = 0
    
    for player_info in game_state["players"]:
        player_info["status"] = "alive"
    
    return jsonify({"message": "Spiel wurde erfolgreich zurückgesetzt. Du kannst nun wieder zur Rollenauswahl wechseln."})

if __name__ == '__main__':
    app.run(debug=True)