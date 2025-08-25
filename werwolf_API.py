from flask import Flask, request, jsonify, session
from flask_cors import CORS
import random, json

app = Flask(__name__)
app.secret_key = 'your_super_secret_key'
CORS(app)

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

def get_from_session(name, default=None):
    return session.get(name) if session.get(name) is not None else default

def save_to_session(name, value):
    session[name] = value

@app.route('/api/init', methods=['POST'])
def api_init():
    """ Startet neue Session (Komplettes Reset, wie "Zur Startseite") """
    session.clear()
    return jsonify({"message": "Session komplett resettet."})

@app.route('/api/names', methods=['GET','POST'])
def api_names():
    """ Namen verwalten """
    if request.method == 'GET':
        return jsonify({"names": get_from_session('names', [])})
    else:
        names = request.json.get('names', [])
        save_to_session('names', names)
        return jsonify({"message": "Namen gespeichert."})

@app.route('/api/roles', methods=['GET','POST'])
def api_roles():
    """ Rollenauswahl verwalten """
    if request.method == 'GET':
        return jsonify({"role_counts": get_from_session('role_counts', {}), "all_roles": ALL_ROLES})
    else:
        role_counts = request.json.get('role_counts', {})
        save_to_session('role_counts', role_counts)
        return jsonify({"message": "Rollenauswahl gespeichert."})

@app.route('/api/mixroles', methods=['POST'])
def api_mixroles():
    """ Zuweisung von Rollen zu Spielern starten & Status zurücksetzen """
    names = get_from_session("names", [])
    role_counts = get_from_session("role_counts", {})
    if not names or not role_counts:
        return jsonify({"error": "Vorher Namen und Rollenauswahl definieren!"}), 400
    if sum(role_counts.values()) != len(names):
        return jsonify({"error": "Rollenzahl und Spielernamen stimmen nicht überein!"}), 400
    player_status = [{"name": name, "status": "alive"} for name in names]
    # zufällige Rollenverteilung
    roles_flat = []
    for r, n in role_counts.items(): roles_flat += [r]*n
    random.shuffle(roles_flat)
    assignment = {n: r for n, r in zip(names, roles_flat)}
    save_to_session("assignment", assignment)
    save_to_session("player_status", player_status)
    save_to_session("card_index", 0)
    save_to_session("game_over", False)
    return jsonify({"message": "Rollen verteilt", "assignment": assignment})

@app.route('/api/next_card', methods=['GET'])
def api_next_card():
    idx = get_from_session("card_index", 0)
    player_status = get_from_session("player_status", [])
    if idx >= len(player_status):
        save_to_session("game_over", True)
        return jsonify({"done": True})
    name = player_status[idx]["name"]
    return jsonify({"player_name": name, "index": idx})

@app.route('/api/reveal_card', methods=['POST'])
def api_reveal_card():
    idx = get_from_session("card_index", 0)
    names = get_from_session("names", [])
    assignment = get_from_session("assignment", {})
    if idx >= len(names):
        return jsonify({"done": True})
    player = names[idx]
    role = assignment.get(player)
    save_to_session("card_index", idx+1)
    return jsonify({"player_name": player, "role_name": role, "role_desc": ALL_ROLES.get(role,"Keine Beschreibung")})

@app.route('/api/status', methods=['GET','PUT'])
def api_status():
    """ ToGetAll or Mark dead (PUT {"kill":"name"}) """
    status = get_from_session("player_status", [])
    if request.method == 'GET':
        assignment = get_from_session("assignment", {})
        return jsonify([
            {"name": p["name"], "status": p["status"], "role": assignment.get(p["name"], "?")} for p in status
        ])
    else:
        name = request.json.get('kill','')
        for p in status:
            if p["name"] == name: p["status"] = "dead"
        save_to_session("player_status", status)
        return jsonify({"message":"Status geändert."})

@app.route('/api/resetsoft', methods=['POST'])
def api_resetsoft():
    """ Rollenzuordnung & Status neu mischen, Namen & Rollenauswahl BLEIBEN, CardIndex auf 0 """
    names = get_from_session("names", [])
    role_counts = get_from_session("role_counts", {})
    if not names or not role_counts or sum(role_counts.values()) != len(names):
        return jsonify({"error":"Unvollständige Daten zum Neustarten!"}), 400
    player_status = [{"name": name, "status": "alive"} for name in names]
    roles_flat = []
    for r, n in role_counts.items(): roles_flat += [r]*n
    random.shuffle(roles_flat)
    assignment = {n: r for n, r in zip(names, roles_flat)}
    save_to_session("assignment", assignment)
    save_to_session("player_status", player_status)
    save_to_session("card_index", 0)
    save_to_session("game_over", False)
    return jsonify({"message":"Neu gemischt."})

@app.route('/api/roles/legend', methods=['GET'])
def legend():
    return jsonify(ALL_ROLES)

if __name__ == "__main__":
    app.run(port=8000, debug=True)