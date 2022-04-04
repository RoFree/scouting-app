//add api data to form before submit

async function submit(){
    var form = document.getElementById("theForm");
    var team = form.elements["entry.1638702746"].value;
    var match_number = form.elements["entry.508602665"].value;
    var tba = new BlueAlliance("OuQqtF0trtw2zR4l6A5E6mQGhAumDyt2FGPCNhfo67ogm2pndWCA2eSgzyeyBLIr");
    var event_id = form.elements["entry.event"].value.toLowerCase(); //you can get this by looking at a url for a blue alliance event
    var event_year = 2022 
    var event = await tba.getEvent(event_id, event_year);
    var match = await tba.getMatch(event, "q", match_number); //get match data as large array, assumes qual matches
    if(!tba.isMatchDone(match)) return false; //check match has actually finished
    var a = (match['alliances']["blue"]["team_keys"].includes("frc"+team)) ? "blue":"red"; //what color alliance
    var num = match['alliances'][a]["team_keys"].indexOf("frc"+team);//index of robot in alliance, reminder js arrays are weird
    addHidden(form, "barsdone", match["score_breakdown"][a]["endgameRobot"+num]);
    var nickname  = await tba.getTeam(team); //get team nickname
    addHidden(form, "entry.215295328", nickname);
    return true; //submit form
}


function addHidden(theForm, key, value) {
    // Create a hidden input element, and append it to the form:
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = key; 
    input.value = value;
    theForm.appendChild(input);
}







//missed lower
function incValueMissedLower()
{
    var value = parseInt(document.getElementById('missedlower').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('missedlower').value = value;
}
//made lower
function incValueMadeLower()
{
    var value = parseInt(document.getElementById('madelower').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('madelower').value = value;
}
//missed upper
function incValueMissedUpper()
{
    var value = parseInt(document.getElementById('missedupper').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('missedupper').value = value;
}
//made upper
function incValueMadeUpper()
{
    var value = parseInt(document.getElementById('madeupper').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('madeupper').value = value;
}
//bars attempted
function incValueBarsAtt()
{
    var value = parseInt(document.getElementById('barsatt').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('barsatt').value = value;
}
//bars done
function incValueBarsDone()
{
    var value = parseInt(document.getElementById('barsdone').value, 10);
    value = isNaN(value) ? 0 : value;
    value++;
    document.getElementById('barsdone').value = value;
}