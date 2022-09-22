window.onload = document.getElementById("printpage").innerHTML = stringifyLS();
window.onload = document.getElementById("postman").setAttribute('href', "mailto:jsvsentilabel@gmail.com?subject=MORAL&body=" + stringifyLS('<br>').replaceAll(',', ''));
document.getElementById("clearLS").addEventListener("click", deleteSelections); 


function stringifyLS() {
    let itemlist = [];
    let keys = Object.keys(localStorage);
    itemlist.push( "GOV_DIST" + ': '+ getLS("WEALTH"));
    itemlist.push( "CULTURE" + ': '+ getLS("NATIONALISM"));
    itemlist.push( "COUNTRY" + ': '+ getLS("COUNTRY"));
    itemlist.push( "POL_LEAN" + ': '+ getLS("GROUP_IDENTITY"));

    for (var i = 0; i < getCount(); i++) {
        key = i.toString();
        itemlist.push( getLS(key) );
    }
    tosend = itemlist.join('<br>');
    console.log(tosend);
    return tosend;
};


function deleteSelections() {
    for (var i = 0; i < getCount(); i++)
    {
        rmLS(i);
    }
    setLS("sentiCount", "0");
    document.getElementById("cleared_message").innerHTML = "Your items have been cleared.";
    document.getElementById("printpage").innerHTML = stringifyLS();
};

function setLS(key, val) {
    localStorage["senti_" + key] = val;
}

function getLS(key) {
    return localStorage["senti_" + key];
}

function rmLS(key) {
    localStorage.removeItem("senti_" + key);
}

function getCount() {
    return parseInt(getLS("sentiCount"));
}
