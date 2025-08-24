from flask import Flask, request, jsonify, session
from flask_cors import CORS
import random
import json

app = Flask(__name__)
# Erlaube Anfragen von allen Domains. Für Produktionsumgebungen solltest du die genaue Frontend-URL angeben.
CORS(app) 
app.secret_key = 'your_super_secret_key'

# Rollenkonstanten und Spielzustand wie in deinem ursprünglichen Code
ALL_ROLES = {
    "Dorfbewohner": "Der normale Dorfbewohner hat keine Sonderfähigkeit.",
    # ... Rest der Rollen
}

game_state = {
    "players": [],
    "roles": {},
    "total_roles_count": 0,
    "game_started": False,
    "assigned_roles": {},
    "current_player_index": 0,
}

def get_role_counts_from_session():
    return json.loads(session.get('saved_roles', '{}'))

def save_role_counts_to_session(role_counts):
    session['saved_roles'] = json.dumps(role_counts)

# API-Endpunkt zum Speichern der Rollenzahlen in der Session
@app.route('/api/game/save_roles', methods=['POST'])
def save_roles_api():
    data = request.get_json()
    save_role_counts_to_session(data.get('role_counts', {}))
    return jsonify({"message": "Rollen wurden in der Session gespeichert."}), 200

# API-Endpunkt für das Starten des Spiels und die Rollenzuweisung
@app.route('/api/game/roles', methods=['POST'])
def set_game_roles():
    data = request.get_json()
    role_counts = data.get("role_counts", {})
    
    namen_string = session.get('saved_players', '')
    players_list = [{"name": name, "status": "alive"} for name in [name.strip() for name in namen_string.split('\n') if name.strip()]]
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

# API-Endpunkt für den nächsten Spieler zur Rollenansicht
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

# API-Endpunkt zum Aufdecken der Rolle
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

# API-Endpunkt für die Spielleiter-Übersicht
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

# API-Endpunkt, um Spieler als "tot" zu markieren
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

# API-Endpunkt zum Zurücksetzen des Spiels
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