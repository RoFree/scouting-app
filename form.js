//add api data to form before submit
async function submit(){
    var form = document.getElementById("theForm"); //save form object for easy access
    var teamID = form.elements["entry.1638702746"].value;
    var match_number = form.elements["entry.508602665"].value;
    var tba = new BlueAlliance("OuQqtF0trtw2zR4l6A5E6mQGhAumDyt2FGPCNhfo67ogm2pndWCA2eSgzyeyBLIr");
    var event_id = form.elements["entry.event"].value.toLowerCase();
    var event_year = new Date().getFullYear();
    var event = await tba.getEvent(event_id, event_year); 
    var match = await tba.getMatch(event, "q", match_number); //get match data as large array, assumes qual match
    if(!tba.isMatchDone(match)) return false; //check match has actually finished before submit
    addHidden(form, "barsdone", endgameScore(match, teamID)); //automate collection of endgame data
    var team  = await tba.getTeam(teamID); //get team obj
    addHidden(form, "entry.215295328", team.nickname); //automate logging to team name based on team number
    return true; //submit form
}


/** Adds a hidden form field with the provided data to the form passed in.
 * @param {Object} theForm - The form DOM object.
 * @param {String} key - name of the hidden form field.
 * @param {Object} value - arbitrary value of the hidden form field.
 * @returns {void}
 */
function addHidden(theForm, key, value) {
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
