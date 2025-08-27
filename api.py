from flask import Flask, request, jsonify, session, render_template, redirect, url_for
import random
import json
import os

app = Flask(__name__)
app.secret_key = 'your_super_secret_key'

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
    "Der Fuchs": "Wenn er in der Nacht aufgerufen wird, wählt er einen Spieler aus und erfährt vom Spielleiter, ob dieser oder einer ihrer beiden Nachbarn ein Werwolf ist oder nicht. Ist bei dem Trio mindestens ein Werwolf dabei, darf er es in der nächsten Nacht ein weiteres Mal versuchen. Ist aber keiner der drei ein Werwolf, verliert er seine Fähigkeit.",
    "Die ergebene Magd": "Wenn jemand stirbt kann die ergebene Magd bevor erfahren wird welche Rolle die tote Person hat ihre Rolle mit der, der toten Person tauschen und ihre Rolle weiterspielen.",
    "Der Bärenführer": "Wenn sich der Bärenführer am Morgen in seiner Sitzposition unmittelbar neben einem Werwolf befindet (ausgeschiedene Spieler werden ignoriert), zeigt der Spielleiter dies durch ein Bärenknurren. Ist der Bärenführer vom Urwolf infiziert, knurrt der Spielleiter jeden Morgen.",
    "Der Ritter mit der verrosteten Klinge": "Der Ritter infiziert mit seinem rostigen Schwert den Werwolf zu seiner Linken mit Tetanus, wenn er von ihnen in der Nacht gefressen wird. Dieser Werwolf stirbt dann in der folgenden Nacht.",
    "Der verbitterte Greis": "Zu Beginn teilt der Spielleiter anhand eines offensichtlich einsehbaren, binären Kriteriums das Dorf in zwei Gruppen (z. B. Brille/keine Brille, Bart/kein Bart, größer als 170 cm/kleiner als 170 cm, Geschlecht) – der Greis gehört dann zu einer der beiden Gruppen. Sein Ziel, um das Spiel alleine zu gewinnen, ist es die andere Gruppe komplett zu beseitigen.",
    "Der Gaukler": "Der Spielleiter wählt vor dem Start drei zusätzliche Rollen aus, die er offen in die Mitte legt. Zu Beginn jeder Nacht wählt sich der Schauspieler eine dieser Rollen aus und spielt sie bis zur folgenden Nacht.",
    "Der stotternde Richter": "Der Spielleiter und der Richter einigen sich in der ersten Nacht auf ein Zeichen. Wenn der Richter nach der regulären Abstimmung des Dorfes und dem Tod eines Spielers dieses Zeichen gibt, führt der Spielleiter sofort noch eine Abstimmung ohne erneute Diskussion durch.",
    "Der Obdachlose": "Wenn du aufgerufen wirst, wählst du eine Person bei der du übernachten willst. Wenn diese Person in der Nacht von den Werwölfen getötet wird, stirbst du auch. Wenn die Werwölfe dich in der Nacht töten wollen, stirbst du nicht, weil du bei der anderen Person schläfst."
}

# --- Erzählertext in eine leicht verarbeitbare Struktur umgewandelt ---
# WICHTIG: Die Anordnung hier ist entscheidend für die Reihenfolge der Aufrufe.
NARRATOR_TEXT = {
    "round_1": [
        {"role": "Die reine Seele", "text": "Reine Seele, du darfst dich jetzt allen Dorfbewohnern zu erkennen geben.<br>(Die reine Seele gibt sich zu erkennen)<br>(Sobald das geschehen ist)<br>Alle Bürger, schließt jetzt bitte eure Augen."},
        {"role": "Alle Bürger", "text": "Alle Bürger, schließt jetzt bitte eure Augen."},
        {"role": "Dieb", "text": "Dieb, du darfst deine Augen jetzt öffnen.<br>Ich halte jetzt die zwei übrigen Rollen in der Hand.<br>Du kannst nun deine Rolle mit einer der beiden Rollen tauschen oder deine Rolle behalten.<br>(Erzähler hält die zwei übrigen Karten hoch)<br>Wenn du deine Rolle behältst, bleibst du ein Dorfbewohner.<br>Wenn du eine neue Karte willst, zeig drauf.<br>(Erzähler nimmt die Karte, die der Dieb nicht will, weg)<br>Dieb, schließe jetzt deine Augen."},
        {"role": "Der Gaukler", "text": "Gaukler, du darfst deine Augen jetzt öffnen.<br>Ich halte jetzt die drei für dich ausgewählten Rollen in der Hand.<br>Du kannst dich jetzt entscheiden welche Rolle du für diese Nacht spielen möchtest.<br>(Der Gaukler zeigt auf einer der Rollen)<br>Gaukler schließe deine Augen."},
        {"role": "Der verbitterte Greis", "text": "Verbitterte Greis, du darfst deine Augen jetzt öffnen.<br>Teile unsere Gruppe in zwei kleinere gleichgroße Gruppen auf.<br>(Z.B. in dunkle Haare und helle Haare)<br>Wird eine dieser Gruppen eliminiert und du lebst noch gewinnst du.<br>(Der verbitterte Greis macht zwei Gruppen)<br>Du darfst deine Augen wieder schließen."},
        {"role": "Amor", "text": "Amor, du darfst deine Augen jetzt öffnen.<br>Wähle zwei Personen aus, die du verkuppeln möchtest.<br>(Amor zeigt auf zwei Personen)<br>Amor, schließe jetzt deine Augen.<br>Ich gehe jetzt rum und tippe die beiden Verliebten an.<br>(Erzähler geht rum und tippt die beiden Verliebten an)<br>Verliebten, ihr dürft jetzt eure Augen öffnen und euch gegenseitig sehen.<br>(Verliebten schauen sich an)<br>Verliebten, schließt eure Augen bitte wieder."},
        {"role": "Der Wolfshund", "text": "Wolfshund, du darfst deine Augen jetzt öffnen.<br>Ich halte die beiden Hände hoch, die rechte Hand bedeutet Werwolf<br>und die linke Hand bedeutet Dorfbewohner.<br>(Erzähler hält beide Hände hoch)<br>Entscheide dich was du sein willst.<br>(Der Wolfshund zeigt auf einen der Hände)<br>Wolfshund, schließe jetzt deine Augen."},
        {"role": "Die drei Brüder", "text": "Brüder, ihr dürft eure Augen jetzt öffnen.<br>Schaut euch an, damit ihr euch erkennt.<br>(Die drei Brüder schauen sich an)<br>Brüder, schließt bitte wieder die Augen."},
        {"role": "Die zwei Schwestern", "text": "Schwestern, ihr dürft eure Augen jetzt öffnen.<br>Schaut euch an, damit ihr euch erkennt.<br>(Die zwei Schwestern schauen sich an)<br>Schwestern, schließt bitte wieder die Augen."},
        {"role": "Das wilde Kind", "text": "Wildes Kind, du darfst deine Augen jetzt öffnen.<br>Wähle eine Person aus, die dein Vorbild sein soll.<br>Wenn dein Vorbild stirbt, wird das wilde Kind zum Werwolf.<br>(Das wilde Kind zeigt auf eine Person)<br>Wildes Kind, schließe jetzt deine Augen."},
        {"role": "Der stotternde Richter", "text": "Richter, du darfst deine Augen jetzt öffnen.<br>Zeige mir ein geheimes kleines Zeichen, welches du machst,<br>wenn am heutigen Tag eine zweite Abstimmung stattfinden soll.<br>(Der Richter und der Erzähler vereinbaren ein geheimes Zeichen)<br>Richter, schließe jetzt deine Augen."},
        {"role": "Seherin", "text": "Seherin, du darfst deine Augen jetzt öffnen.<br>Wähle eine Person aus, von der du die Rolle sehen möchtest.<br>(Die Seherin zeigt auf eine Person)<br>(Erzähler tippt auf das I neben der Rolle der Person und zeigt sie der Seherin)<br>Seherin, schließe jetzt deine Augen."},
        {"role": "Heiler/Beschützer", "text": "Heiler/Beschützer, du darfst jetzt deine Augen öffnen.<br>Wähle eine Person aus, die du beschützen möchtest.<br>Diese Person wird egal durch was sie getötet werden würde nicht sterben.<br>Du darfst keine Person zweimal hintereinander beschützen.<br>(Heiler zeigt auf die Person)<br>Heiler/Beschützer, schließe jetzt deine Augen."},
        {"role": "Werwölfe", "text": "Werwölfe, ihr dürft jetzt eure Augen öffnen.<br>Sucht euch eine Person aus, die ihr fressen wollt.<br>(Die Werwölfe einigen sich auf ein Opfer)<br>Werwölfe, schließt jetzt eure Augen."},
        {"role": "Der Urwolf", "text": "Ulwolf, du darfst deine Augen jetzt öffnen.<br>Welche Person möchtest du in einen Werwolf verwandeln?<br>(Der Urwolf zeigt auf eine Person, die Werwolf werden soll)<br>Ulwolf, schließe jetzt deine Augen.<br>Ich gehe jetzt herum und tippe die infizierte Person an.<br>(Erzähler geht rum und tippt die infizierte Person an)<br>Die Person die ich angetippt habe wird in der nächsten Nacht zum Werwolf.<br>Sie verliert ihre andere Rolle."},
        {"role": "Hexe", "text": "Hexe, du darfst deine Augen jetzt öffnen.<br>Das ist das Opfer der Werwölfe.<br>(Erzähler zeigt der Hexe, wer das Opfer der Werwölfe ist)<br>Möchtest du es mit deinem Heiltrank retten oder nicht?<br>Wenn ja mache einen Daumen nach oben.<br>Möchtest du noch jemanden töten?<br>Wenn ja mache einen Daumen nach unten.<br>Oder wenn du nichts tun möchtest<br>Mache einen Daumen in die Mitte.<br>Du darfst auch beide Tränke in der Nacht aufbrauchen.<br>(Die Hexe bewegt ihren Daumen)<br>Hexe, schließe jetzt deine Augen."},
        {"role": "Flötenspieler", "text": "Flötenspieler, du darfst jetzt deine Augen öffnen.<br>Wähle jetzt zwei Personen aus, die du mit deiner Musik verzaubern möchtest.<br>(Der Flötenspieler zeigt auf zwei Personen)<br>Flötenspieler, schließe jetzt deine Augen.<br>Ich tippe jetzt die Verzauberten an.<br>(Erzähler geht rum und tippt die Verzauberten an)<br>Verzauberten ihr dürft jetzt aufwachen<br>und euch mit Handzeichen besprechen wer der Flötenspieler ist.<br>Wenn der Flötenspieler alle Personen verzaubert hat, gewinnt er.<br>Verzauberten ihr dürft eure Augen jetzt schließen."},
        {"role": "Der Obdachlose", "text": "Obdachloser, du darfst deine Augen jetzt öffnen.<br>Suche dir eine Person aus, bei der du übernachten möchtest.<br>Wenn die Person in der Nacht von den Werwölfen gefressen wird, stirbst du auch. Wenn die Werwölfe dich in der Nacht töten wollen, stirbst du nicht, weil du bei der anderen Person schläfst.<br>(Der Obdachlose zeigt auf eine Person)<br>Obdachlose, schließe jetzt deine Augen."},
        {"role": "Der Fuchs", "text": "Fuchs, du darfst deine Augen jetzt öffnen.<br>Wähle eine Person aus.<br>Ich werde dir zeigen, ob sie oder einer ihrer beiden Nachbarn ein Werwolf ist.<br>Wenn einer ein Werwolf ist zeige ich einen Daumen nach oben.<br>Wenn keiner ein Werwolf ist zeige ich einen Daumen nach unten<br>und du verlierst deine Fähigkeit.<br>(Der Fuchs zeigt auf eine Person)<br>(Erzähler zeigt, ob im Trio ein Werwolf ist oder nicht)<br>Fuchs, schließe jetzt deine Augen."},
        {"role": "Alle Bürger", "text": "Alle Bürger öffnen jetzt ihre Augen."},
    ],
    "round_2": [
        {"role": "Alle Bürger", "text": "Alle Bürger, schließt jetzt bitte eure Augen."},
        {"role": "Der Gaukler", "text": "Gaukler, du darfst deine Augen jetzt öffnen.<br>Ich halte jetzt die drei für dich ausgewählten Rollen in der Hand.<br>Du kannst dich jetzt entscheiden welche Rolle du für diese Nacht spielen möchtest.<br>(Der Gaukler zeigt auf einer der Rollen)<br>Gaukler schließe deine Augen."},
        {"role": "Seherin", "text": "Seherin, du darfst deine Augen jetzt öffnen.<br>Wähle eine Person aus, von der du die Rolle sehen möchtest.<br>(Die Seherin zeigt auf eine Person)<br>(Erzähler tippt auf das I neben der Rolle der Person und zeigt sie der Seherin)<br>Seherin, schließe jetzt deine Augen."},
        {"role": "Heiler/Beschützer", "text": "Heiler/Beschützer, du darfst jetzt deine Augen öffnen.<br>Wähle eine Person aus, die du beschützen möchtest.<br>Diese Person wird egal durch was sie getötet werden würde nicht sterben.<br>Du darfst keine Person zweimal hintereinander beschützen.<br>(Heiler zeigt auf die Person)<br>Heiler/Beschützer, schließe jetzt deine Augen."},
        {"role": "Werwölfe", "text": "Werwölfe, ihr dürft jetzt eure Augen öffnen.<br>Sucht euch eine Person aus, die ihr fressen wollt.<br>(Die Werwölfe einigen sich auf ein Opfer)<br>Werwölfe, schließt jetzt eure Augen."},
        {"role": "Der große böse Werwolf", "text": "(nur jede zweite Nacht aufrufen)<br>Großer böser Werwolf, öffne deine Augen.<br>Wähle noch ein zweites Opfer, das du in dieser Nacht töten möchtest.<br>(Der große böse Werwolf zeigt auf ein Opfer)<br>Großer böser Werwolf, schließe nun deine Augen."},
        {"role": "Der weiße Werwolf", "text": "(nur jede zweite Nacht aufrufen)<br>Weißer Werwolf, du darfst jetzt deine Augen öffnen.<br>Welchen deiner Werwolf-Kollegen möchtest du töten?<br>(Der weiße Werwolf zeigt auf einen Werwolf)<br>Weißer Werwolf, schließe jetzt deine Augen."},
        {"role": "Hexe", "text": "Hexe, du darfst deine Augen jetzt öffnen.<br>Das ist das Opfer der Werwölfe.<br>(Erzähler zeigt der Hexe, wer das Opfer der Werwölfe ist)<br>Möchtest du es mit deinem Heiltrank retten oder nicht?<br>Wenn ja mache einen Daumen nach oben.<br>Möchtest du noch jemanden töten?<br>Wenn ja mache einen Daumen nach unten.<br>Oder wenn du nichts tun möchtest<br>Mache einen Daumen in die Mitte.<br>Du darfst auch beide Tränke in der Nacht aufbrauchen.<br>(Die Hexe bewegt ihren Daumen)<br>Hexe, schließe jetzt deine Augen."},
        {"role": "Flötenspieler", "text": "Flötenspieler, du darfst jetzt deine Augen öffnen.<br>Wähle jetzt zwei Personen aus, die du mit deiner Musik verzaubern möchtest.<br>(Der Flötenspieler zeigt auf zwei Personen)<br>Flötenspieler, schließe jetzt deine Augen.<br>Ich tippe jetzt die Verzauberten an.<br>(Erzähler geht rum und tippt die Verzauberten an)<br>Verzauberten ihr dürft jetzt aufwachen<br>und euch mit Handzeichen besprechen wer der Flötenspieler ist.<br>Wenn der Flötenspieler alle Personen verzaubert hat, gewinnt er.<br>Verzauberten ihr dürft eure Augen jetzt schließen."},
        {"role": "Der Obdachlose", "text": "Obdachloser, du darfst deine Augen jetzt öffnen.<br>Suche dir eine Person aus, bei der du übernachten möchtest.<br>Wenn die Person in der Nacht von den Werwölfen gefressen wird, stirbst du auch. Wenn die Werwölfe dich in der Nacht töten wollen, stirbst du nicht, weil du bei der anderen Person schläfst.<br>(Der Obdachlose zeigt auf eine Person)<br>Obdachlose, schließe jetzt deine Augen."},
        {"role": "Der Fuchs", "text": "Fuchs, du darfst deine Augen jetzt öffnen.<br>Wähle eine Person aus.<br>Ich werde dir zeigen, ob sie oder einer ihrer beiden Nachbarn ein Werwolf ist.<br>Wenn einer ein Werwolf ist zeige ich einen Daumen nach oben.<br>Wenn keiner ein Werwolf ist zeige ich einen Daumen nach unten<br>und du verlierst deine Fähigkeit.<br>(Der Fuchs zeigt auf eine Person)<br>(Erzähler zeigt, ob im Trio ein Werwolf ist oder nicht)<br>Fuchs, schließe jetzt deine Augen."},
        {"role": "Alle Bürger", "text": "Alle Bürger öffnen jetzt ihre Augen."},
    ]
}

game_state = {
    "players": [],
    "roles": {},
    "total_roles_count": 0,
    "game_started": False,
    "assigned_roles": {},
    "current_player_index": 0,
    "role_counters": {},
    "special_roles": {
        "Dieb": {"enabled": False, "extra_roles": []},
        "Gaukler": {"enabled": False, "extra_roles": []},
        "Amor": {"enabled": False, "lovers": []},
        "Ulwolf": {"enabled": False}
    }
}

def get_role_counts_from_session():
    return json.loads(session.get('saved_roles', '{}'))

def save_role_counts_to_session(role_counts):
    session['saved_roles'] = json.dumps(role_counts)

def get_special_roles_from_session():
    return json.loads(session.get('special_roles_data', '{}'))

def save_special_roles_to_session(special_roles):
    session['special_roles_data'] = json.dumps(special_roles)

def get_living_players_count(role_name):
    count = 0
    for player_info in game_state["players"]:
        if player_info["status"] == "alive" and game_state["assigned_roles"].get(player_info["name"]) == role_name:
            count += 1
    return count

def get_player_by_name(player_name):
    for player in game_state["players"]:
        if player["name"] == player_name:
            return player
    return None

def get_player_by_role(role_name):
    for player_name, role in game_state["assigned_roles"].items():
        if role == role_name:
            player_info = get_player_by_name(player_name)
            if player_info and player_info["status"] == "alive":
                return player_name
    return None

@app.route('/')
def startseite():
    session.clear()
    game_state["players"] = []
    game_state["game_started"] = False
    game_state["assigned_roles"] = {}
    game_state["current_player_index"] = 0
    game_state["role_counters"] = {}
    game_state["special_roles"] = {
        "Dieb": {"enabled": False, "extra_roles": []},
        "Gaukler": {"enabled": False, "extra_roles": []},
        "Amor": {"enabled": False, "lovers": []},
        "Ulwolf": {"enabled": False}
    }
    return render_template('index.html')

@app.route('/spiel', methods=['GET', 'POST'])
def spiel_seite():
    if request.method == 'POST':
        namen_string = request.form.get("namen")
        namen_liste = [name.strip() for name in namen_string.split('\n') if name.strip()]
        
        if len(namen_liste) != len(set(name.lower() for name in namen_liste)):
            return render_template('spiel.html', saved_players=namen_string, error="Doppelte Namen sind nicht erlaubt.")
        
        session['saved_players'] = namen_string
        
        saved_roles = get_role_counts_from_session()
        total_roles_selected = sum(saved_roles.values())
        if len(namen_liste) < total_roles_selected:
            save_role_counts_to_session({})
        
        return render_template('rollen.html', all_roles=ALL_ROLES, player_count=len(namen_liste), saved_roles=saved_roles)

    saved_players_string = session.get('saved_players', '')
    return render_template('spiel.html', saved_players=saved_players_string)

@app.route('/rollen', methods=['GET', 'POST'])
def rollen_seite():
    player_count = len([name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()])
    if player_count == 0:
        return render_template('spiel.html')

    saved_roles = get_role_counts_from_session()
    
    return render_template('rollen.html', all_roles=ALL_ROLES, player_count=player_count, saved_roles=saved_roles)

@app.route('/karten')
def karten_seite():
    return render_template('karten.html', all_roles=ALL_ROLES)

@app.route('/neustart')
def neustart_seite():
    if not game_state["game_started"]:
        return redirect(url_for('spiel_seite'))
    
    players_list_data = []
    for player_info in game_state["players"]:
        player_name = player_info["name"]
        role = game_state["assigned_roles"].get(player_name, "Rolle noch nicht zugewiesen.")
        status = player_info["status"]
        players_list_data.append({
            "name": player_name,
            "role": role,
            "status": status
        })
    return render_template('neustart.html', players=players_list_data, all_roles=ALL_ROLES)

@app.route('/erzaehler')
def erzaehler_seite():
    if not game_state["game_started"]:
        return redirect(url_for('spiel_seite'))
    return render_template('erzaehler.html')

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
    special_roles_data = data.get("special_roles_data", {})
    
    players_list_raw = [name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()]
    total_players = len(players_list_raw)
    
    if len(players_list_raw) != len(set(name.lower() for name in players_list_raw)):
        return jsonify({"error": "Doppelte Namen sind nicht erlaubt."}), 400

    if total_players < 4:
        return jsonify({"error": "Es müssen mindestens 4 Spieler angemeldet sein."}), 400

    total_roles_count = sum(role_counts.values())

    if total_roles_count != total_players:
        return jsonify({
            "error": f"Die Anzahl der Rollen ({total_roles_count}) muss genau der Anzahl der Spieler ({total_players}) entsprechen.",
            "players_count": total_players,
            "roles_count": total_roles_count
        }), 400
    
    game_state["players"] = [{"name": name, "status": "alive"} for name in players_list_raw]
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
    game_state["role_counters"] = {role: count for role, count in role_counts.items()}

    # Spezielle Rollen-Daten speichern
    game_state["special_roles"]["Dieb"]["enabled"] = "Dieb" in role_counts and role_counts["Dieb"] > 0
    game_state["special_roles"]["Dieb"]["extra_roles"] = special_roles_data.get("Dieb", [])

    game_state["special_roles"]["Gaukler"]["enabled"] = "Der Gaukler" in role_counts and role_counts["Der Gaukler"] > 0
    game_state["special_roles"]["Gaukler"]["extra_roles"] = special_roles_data.get("Gaukler", [])
    
    game_state["special_roles"]["Amor"]["enabled"] = "Amor" in role_counts and role_counts["Amor"] > 0
    game_state["special_roles"]["Ulwolf"]["enabled"] = "Der Urwolf" in role_counts and role_counts["Der Urwolf"] > 0

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
        
        emojis = []
        if game_state["special_roles"]["Dieb"]["enabled"] and role == "Dieb":
            emojis.append({"icon": "💰", "label": "Dieb", "type": "Dieb"})
        if game_state["special_roles"]["Gaukler"]["enabled"] and role == "Der Gaukler":
            emojis.append({"icon": "🎭", "label": "Gaukler", "type": "Gaukler"})
        if game_state["special_roles"]["Amor"]["enabled"] and role == "Amor":
            emojis.append({"icon": "❤️", "label": "Verlieben", "type": "Amor"})
        if game_state["special_roles"]["Ulwolf"]["enabled"] and role == "Der Urwolf":
            emojis.append({"icon": "🐺", "label": "Ulwolf", "type": "Ulwolf"})

        overview.append({
            "name": player_name,
            "role": role,
            "status": player_info["status"],
            "emojis": emojis,
        })
        
    return jsonify(overview)

@app.route('/api/gamemaster/toggle_status/<player_name>', methods=['PUT'])
def toggle_player_status(player_name):
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400
    
    player_found = False
    
    for player_info in game_state["players"]:
        if player_info["name"] == player_name:
            role = game_state["assigned_roles"].get(player_name)
            
            if player_info["status"] == "alive":
                player_info["status"] = "dead"
                if role in game_state["role_counters"]:
                    game_state["role_counters"][role] -= 1
                
                # Check for Amor's lovers
                if len(game_state["special_roles"]["Amor"]["lovers"]) > 0:
                    other_lover = [p for p in game_state["special_roles"]["Amor"]["lovers"] if p != player_name]
                    if len(other_lover) > 0:
                        other_lover_player = get_player_by_name(other_lover[0])
                        if other_lover_player and other_lover_player["status"] == "alive":
                            other_lover_player["status"] = "dead"
                            other_lover_role = game_state["assigned_roles"].get(other_lover[0])
                            if other_lover_role in game_state["role_counters"]:
                                game_state["role_counters"][other_lover_role] -= 1

            else:
                player_info["status"] = "alive"
                if role in game_state["role_counters"]:
                    game_state["role_counters"][role] += 1
            
            player_found = True
            break
    
    if player_found:
        return jsonify({"message": f"Status von '{player_name}' wurde geändert."})
    else:
        return jsonify({"error": "Spieler nicht gefunden."}), 404

@app.route('/api/game/restart', methods=['POST'])
def restart_game():
    game_state["game_started"] = False
    game_state["assigned_roles"] = {}
    game_state["current_player_index"] = 0
    game_state["role_counters"] = {}
    game_state["special_roles"] = {
        "Dieb": {"enabled": False, "extra_roles": []},
        "Gaukler": {"enabled": False, "extra_roles": []},
        "Amor": {"enabled": False, "lovers": []},
        "Ulwolf": {"enabled": False}
    }
    
    for player_info in game_state["players"]:
        player_info["status"] = "alive"
    
    return jsonify({"message": "Spiel wurde erfolgreich zurückgesetzt. Du kannst nun wieder zur Rollenauswahl wechseln."})

@app.route('/api/get_roles_list')
def get_roles_list():
    return jsonify(list(ALL_ROLES.keys()))

@app.route('/api/get_roles_and_players')
def get_roles_and_players():
    player_count = len([name.strip() for name in session.get('saved_players', '').split('\n') if name.strip()])
    saved_roles = get_role_counts_from_session()
    all_roles = ALL_ROLES
    return jsonify({
        "player_count": player_count,
        "saved_roles": saved_roles,
        "all_roles": all_roles
    })

@app.route('/api/narrator_text/<round_number>', methods=['GET'])
def get_narrator_text(round_number):
    if not game_state["game_started"]:
        return jsonify({"error": "Spiel wurde noch nicht gestartet."}), 400

    target_text = NARRATOR_TEXT.get(f"round_{round_number}")
    if not target_text:
        return jsonify({"error": "Ungültige Runden-Nummer."}), 400

    filtered_text = []
    selected_roles = set(game_state["assigned_roles"].values())

    if round_number == '1':
        if "Die reine Seele" in selected_roles and get_living_players_count("Die reine Seele") > 0:
            filtered_text.append(next(item for item in NARRATOR_TEXT["round_1"] if item["role"] == "Die reine Seele"))

        filtered_text.append(next(item for item in NARRATOR_TEXT["round_1"] if item["role"] == "Alle Bürger" and "schließt" in item["text"]))

        for item in NARRATOR_TEXT["round_1"]:
            if item["role"] in selected_roles and item["role"] not in ["Alle Bürger", "Die reine Seele"]:
                if get_living_players_count(item["role"]) > 0:
                    filtered_text.append(item)

        filtered_text.append(next(item for item in NARRATOR_TEXT["round_1"] if item["role"] == "Alle Bürger" and "öffnen" in item["text"]))
    else:
        filtered_text.append(next(item for item in NARRATOR_TEXT["round_2"] if item["role"] == "Alle Bürger" and "schließt" in item["text"]))

        for item in NARRATOR_TEXT["round_2"]:
            if item["role"] in selected_roles and item["role"] != "Alle Bürger":
                if get_living_players_count(item["role"]) > 0:
                    filtered_text.append(item)

        filtered_text.append(next(item for item in NARRATOR_TEXT["round_2"] if item["role"] == "Alle Bürger" and "öffnen" in item["text"]))

    return jsonify({"text_blocks": filtered_text})

@app.route('/api/special_roles/data', methods=['GET'])
def get_special_roles_data():
    return jsonify(game_state["special_roles"])

@app.route('/api/dieb/extra_roles', methods=['GET'])
def get_dieb_roles():
    return jsonify(game_state["special_roles"]["Dieb"]["extra_roles"])

@app.route('/api/gaukler/extra_roles', methods=['GET'])
def get_gaukler_roles():
    return jsonify(game_state["special_roles"]["Gaukler"]["extra_roles"])

@app.route('/api/dieb/swap_role', methods=['POST'])
def swap_dieb_role():
    data = request.get_json()
    new_role = data.get('new_role')
    dieb_player_name = get_player_by_role("Dieb")

    if not dieb_player_name:
        return jsonify({"error": "Dieb-Spieler nicht gefunden."}), 404
    if new_role not in ALL_ROLES:
        return jsonify({"error": "Ungültige Rolle."}), 400

    old_dieb_role = game_state["assigned_roles"][dieb_player_name]
    
    game_state["assigned_roles"][dieb_player_name] = new_role
    game_state["role_counters"][old_dieb_role] -= 1
    game_state["role_counters"][new_role] = game_state["role_counters"].get(new_role, 0) + 1

    extra_roles = game_state["special_roles"]["Dieb"]["extra_roles"]
    if new_role in extra_roles:
        extra_roles.remove(new_role)
    extra_roles.append(old_dieb_role)
    
    return jsonify({"message": f"Dieb hat die Rolle zu {new_role} getauscht."})

@app.route('/api/gaukler/swap_role', methods=['POST'])
def swap_gaukler_role():
    data = request.get_json()
    new_role = data.get('new_role')
    gaukler_player_name = get_player_by_role("Der Gaukler")

    if not gaukler_player_name:
        return jsonify({"error": "Gaukler-Spieler nicht gefunden."}), 404
    if new_role not in ALL_ROLES:
        return jsonify({"error": "Ungültige Rolle."}), 400

    old_gaukler_role = game_state["assigned_roles"][gaukler_player_name]
    
    game_state["assigned_roles"][gaukler_player_name] = new_role
    
    return jsonify({"message": f"Gaukler hat die Rolle zu {new_role} getauscht."})

@app.route('/api/amor/set_lovers', methods=['POST'])
def set_lovers():
    data = request.get_json()
    lovers = data.get('lovers')
    if len(lovers) != 2:
        return jsonify({"error": "Es müssen genau zwei Spieler ausgewählt werden."}), 400

    game_state["special_roles"]["Amor"]["lovers"] = lovers
    return jsonify({"message": "Verliebte wurden gesetzt."})

@app.route('/api/ulwolf/transform_player', methods=['POST'])
def transform_ulwolf():
    data = request.get_json()
    player_name = data.get('player_name')
    
    player_info = get_player_by_name(player_name)
    if not player_info:
        return jsonify({"error": "Spieler nicht gefunden."}), 404
    
    old_role = game_state["assigned_roles"][player_name]
    new_role = "Werwölfe"
    
    if old_role == new_role:
        return jsonify({"message": "Spieler ist bereits ein Werwolf."})
        
    game_state["assigned_roles"][player_name] = new_role
    game_state["role_counters"][old_role] -= 1
    game_state["role_counters"][new_role] = game_state["role_counters"].get(new_role, 0) + 1
    
    return jsonify({"message": f"{player_name} wurde in einen Werwolf verwandelt."})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=os.environ.get('PORT', 5000))