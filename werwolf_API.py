from flask import Flask, request, jsonify, session
import random
import json
from flask_cors import CORS # Füge diese Zeile hinzu

app = Flask(__name__)
CORS(app) # Füge diese Zeile hinzu
app.secret_key = 'your_super_secret_key' # Wichtig für die Sessions

# Globale Variable für den Spielzustand, die über die Sessions verwaltet wird
# Nur als Fallback, die Sessions sind das primäre Speichermedium für den Zustand
game_state = {}

# --- Konstanten für Rollen ---
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

def get_game_state_from_session():
    """Hilfsfunktion, um den Spielzustand aus der Session zu laden."""
    return json.loads(session.get('game_state', '{}'))

def save_game_state_to_session(state):
    """Hilfsfunktion, um den Spielzustand in der Session zu speichern."""
    session['game_state'] = json.dumps(state)

def get_role_descriptions():
    """Gibt alle Rollenbeschreibungen zurück."""
    return jsonify(ALL_ROLES)

def get_players_from_session():
    """Hilfsfunktion, um Spieler aus der Session zu laden."""
    players_string = session.get('saved_players', '')
    return [name.strip() for name in players_string.split('\n') if name.strip()]

def get_role_counts_from_session():
    """Hilfsfunktion, um Rollen aus der Session zu laden."""
    return json.loads(session.get('saved_roles', '{}'))

def save_role_counts_to_session(role_counts):
    """Hilfsfunktion, um Rollen in der Session zu speichern."""
    session['saved_roles'] = json.dumps(role_counts)

# API-Endpunkte
@app.route('/api/roles_descriptions', methods=['GET'])
def roles_descriptions():
    """Gibt alle Rollen und ihre Beschreibungen zurück."""
    return get_role_descriptions()

@app.route('/api/game/players', methods=['POST'])
def save_players():
    """Speichert Spielernamen in der Session."""
    data = request.get_json()
    players_string = data.get("players", "")
    session['saved_players'] = players_string
    
    # Optional: Rollen-Zählung zurücksetzen, wenn die Spieleranzahl sich ändert
    saved_roles = get_role_counts_from_session()
    players_count = len(get_players_from_session())
    if players_count < sum(saved_roles.values()):
        save_role_counts_to_session({})
        
    return jsonify({"message": "Spielernamen gespeichert."}), 200

@app.route('/api/game/players', methods=['GET'])
def get_players():
    """Gibt die Liste der gespeicherten Spieler zurück."""
    players_list = get_players_from_session()
    return jsonify({"players": players_list, "count": len(players_list)})

@app.route('/api/game/roles_count', methods=['GET'])
def get_roles_count():
    """Gibt die gespeicherte Rollen-Zählung zurück."""
    return jsonify(get_role_counts_from_session())

@app.route('/api/game/save_roles', methods=['POST'])
def save_roles_api():
    """Speichert die Rollen-Zählung in der Session."""
    data = request.get_json()
    save_role_counts_to_session(data.get('role_counts', {}))
    return jsonify({"message": "Rollen wurden in der Session gespeichert."}), 200

@app.route('/api/game/start', methods=['POST'])
def set_game_roles():
    """Startet das Spiel und weist die Rollen zu."""
    data = request.get_json()
    role_counts = data.get("role_counts", {})
    
    players_list = get_players_from_session()
    total_players = len(players_list)

    if total_players < 4:
        return jsonify({"error": "Es müssen mindestens 4 Spieler angemeldet sein."}), 400

    total_roles_count = sum(role_counts.values())

    if total_roles_count != total_players:
        return jsonify({
            "error": "Die Anzahl der Rollen muss genau der Anzahl der Spieler entsprechen.",
            "players_count": total_players,
            "roles_count": total_roles_count
        }), 400
        
    players_state = [{"name": name, "status": "alive"} for name in players_list]
    
    roles_to_assign = []
    for role, count in role_counts.items():
        roles_to_assign.extend([role] * count)
    
    random.shuffle(roles_to_assign)
    
    assigned_roles = {}
    for i, player_info in enumerate(players_state):
        player_name = player_info["name"]
        assigned_roles[player_name] = roles_to_assign[i]
        
    new_game_state = {
        "players": players_state,
        "roles": role_counts,
        "game_started": True,
        "assigned_roles": assigned_roles,
        "current_player_index": 0,
    }
    
    save_game_state_to_session(new_game_state)
    
    return jsonify({"message": "Spiel erfolgreich gestartet. Rollen wurden zugewiesen."}), 200

@app.route('/api/game/next_card', methods=['GET'])
def get_next_card():
    """Gibt den nächsten Spieler zum Aufdecken der Karte zurück."""
    game_state = get_game_state_from_session()
    
    if not game_state.get("game_started", False):
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    current_index = game_state.get("current_player_index", 0)
    
    if current_index >= len(game_state["players"]):
        return jsonify({"message": "Alle Rollen wurden aufgedeckt. Das Spiel kann beginnen."})
        
    player_name = game_state["players"][current_index]["name"]
    
    response = {
        "player_name": player_name,
        "current_player_index": current_index
    }
    
    return jsonify(response)

@app.route('/api/game/reveal', methods=['POST'])
def reveal_card():
    """Decktt die Rolle des aktuellen Spielers auf und geht zum nächsten über."""
    game_state = get_game_state_from_session()
    
    if not game_state.get("game_started", False):
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    current_index = game_state.get("current_player_index", 0)

    if current_index >= len(game_state["players"]):
        return jsonify({"error": "Alle Rollen wurden bereits aufgedeckt."}), 400
        
    player_name = game_state["players"][current_index]["name"]
    
    role_name = game_state["assigned_roles"].get(player_name)
    
    if not role_name:
        return jsonify({"error": "Rolle konnte für diesen Spieler nicht gefunden werden."}), 404
        
    role_description = ALL_ROLES.get(role_name, "Keine Erklärung verfügbar.")
    
    game_state["current_player_index"] += 1
    save_game_state_to_session(game_state)
    
    return jsonify({
        "player_name": player_name,
        "role_name": role_name,
        "role_description": role_description,
        "is_last_card": (game_state["current_player_index"] >= len(game_state["players"]))
    })

@app.route('/api/gamemaster/view', methods=['GET'])
def get_gamemaster_view():
    """Gibt eine Übersicht über alle Spieler und ihre Rollen zurück."""
    game_state = get_game_state_from_session()

    if not game_state.get("game_started", False):
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
    """Markiert einen Spieler als 'tot'."""
    game_state = get_game_state_from_session()

    if not game_state.get("game_started", False):
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    player_found = False
    
    for player_info in game_state["players"]:
        if player_info["name"] == player_name:
            player_info["status"] = "dead"
            player_found = True
            break
    
    if player_found:
        save_game_state_to_session(game_state)
        return jsonify({"message": f"Spieler '{player_name}' wurde als 'tot' markiert."})
    else:
        return jsonify({"error": "Spieler nicht gefunden."}), 404

@app.route('/api/game/restart', methods=['POST'])
def restart_game():
    """Setzt das Spiel zurück."""
    game_state = get_game_state_from_session()
    
    game_state["game_started"] = False
    game_state["assigned_roles"] = {}
    game_state["current_player_index"] = 0
    
    for player_info in game_state["players"]:
        player_info["status"] = "alive"

    save_game_state_to_session(game_state)
    
    return jsonify({"message": "Spiel wurde erfolgreich zurückgesetzt. Du kannst nun wieder zur Rollenauswahl wechseln."})

if __name__ == '__main__':
    app.run(debug=True)