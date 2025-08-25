from flask import Flask, request, jsonify, session
from flask_cors import CORS
import random, json

app = Flask(__name__)
app.secret_key = 'your_super_secret_key'
CORS(app)

# --- Rollen-Definition ---
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

# --- Globale Spiel-Variablen (vereinfacht, für Demo, nicht Threadsicher) ---
game_state = {
    "players": [],
    "roles": {},
    "total_roles_count": 0,
    "game_started": False,
    "assigned_roles": {},
    "current_player_index": 0,
}

def get_role_counts():
    return json.loads(session.get('saved_roles', '{}'))

def save_role_counts(role_counts):
    session['saved_roles'] = json.dumps(role_counts)

@app.route("/api/roles/legend", methods=["GET"])
def legend():
    """ Gibt alle Rollen und ihre Beschreibungen zurück """
    return jsonify(ALL_ROLES)

@app.route("/api/game/save_roles", methods=["POST"])
def save_roles_api():
    data = request.get_json()
    save_role_counts(data.get("role_counts", {}))
    return jsonify({"message": "Rollen gespeichert."}), 200

@app.route("/api/game/roles", methods=["POST"])
def set_game_roles():
    data = request.get_json()
    role_counts = data.get("role_counts", {})
    total_players = int(data.get("player_count", len(role_counts)))
    total_roles_count = sum(role_counts.values())

    if total_roles_count != total_players:
        return jsonify({
            "error": "Die Anzahl der Rollen muss genau der Anzahl der Spieler entsprechen.",
            "players_count": total_players,
            "roles_count": total_roles_count
        }), 400

    players_list = [{"name": name, "status": "alive"} for name in data.get("players",[])]
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
    return jsonify({"message": "Spiel erfolgreich gestartet."})

@app.route("/api/game/next_card", methods=["GET"])
def get_next_card():
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde nicht gestartet."}), 400
    idx = game_state["current_player_index"]
    if idx >= len(game_state["players"]):
        return jsonify({"message": "Alle Karten aufgedeckt."}), 200
    player_name = game_state["players"][idx]["name"]
    return jsonify({"player_name": player_name, "current_player_index": idx})

@app.route("/api/game/reveal_and_next", methods=["POST"])
def reveal_and_next():
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel nicht gestartet."}), 400

    idx = game_state["current_player_index"]
    if idx >= len(game_state["players"]):
        return jsonify({"error": "Schon alle Karten verteilt."}), 400

    player = game_state["players"][idx]["name"]
    role_name = game_state["assigned_roles"].get(player)
    role_desc = ALL_ROLES.get(role_name, "Keine Beschreibung verfügbar.")
    game_state["current_player_index"] += 1
    return jsonify({
        "player_name": player,
        "role_name": role_name,
        "role_description": role_desc,
        "is_last_card": (game_state["current_player_index"] >= len(game_state["players"]))
    })

@app.route("/api/game/restart", methods=["POST"])
def restart():
    game_state.update({
        "players": [],
        "roles": {},
        "total_roles_count": 0,
        "game_started": False,
        "assigned_roles": {},
        "current_player_index": 0,
    })
    return jsonify({"message": "Spiel zurückgesetzt."})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000,  debug=True)