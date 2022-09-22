var existing_context= "";
// EDIT THIS TO EDIT ANNOTATION TITLE
var CONTEXTTAG = "<br>[STRONG CONTEXT]: ";
var debug = true;
var SURVEY_KEYS = ["COUNTRY", "WEALTH", "GROUP_IDENTITY", "NATIONALISM"];
var PREFIX = "senti_";

setLS("sentiCount", "0");
// highlighting is on by default
setLS("highlight", "1");

function sendHighlight(actiontosend, highlightedtosend){
    if (getHighlight())
    {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: actiontosend, highlighted:highlightedtosend});
        })
    }
};

function updateMenuItem(id, newtitle){
    chrome.contextMenus.update(id, {title: newtitle});
    dprint("UPDATED MENU ITEM: "+id+" with the new entry: "+ newtitle);
};

function setLS(key, val) {
    localStorage[PREFIX + key] = val;
}

function getLS(key) {
    return localStorage[PREFIX + key];
}

function rmLS(key) {
    localStorage.removeItem(PREFIX + key);
}

function getCount() {
    return parseInt(getLS("sentiCount"));
}

function getHighlight() {
    return parseInt(getLS("highlight"));
}

function dprint(words){
    if (debug){
        chrome.extension.getBackgroundPage().console.log(words);
    }
};

function setneu(info) {
    highlighted = info.selectionText.trim();
    dprint("setneu() NEU");
    setSent(highlighted, "NEU");
};

function setneg(info) {
    highlighted = info.selectionText.trim();
    dprint("setneg() NEG");
    setSent(highlighted, "NEG");
};

function setpos(info) {
    highlighted = info.selectionText.trim();
    dprint("setpos() POS");
    setSent(highlighted, "POS");
};

function setSent(highlighted, label){
    dprint("setSent() "+ label + " : " + highlighted);
    if (existing_context.includes(highlighted)) {
        addtoLS("[" + label + "]: " + highlighted);
        sendHighlight(label, highlighted)
     } else {
        notifyMe("Error, entity not found in context sentence.");
     }
};

function addtoLS(value){
    dprint("addtoLS() \"" + value + "\"");
    setLS(getCount().toString(), value);
    setLS("sentiCount", (getCount() + 1).toString());
    dprint("ADDED TO INDEX " + (getCount() - 1).toString() + " -- INDEX NOW " + getCount().toString());
    var menuupdate = getLS((getCount() - 1).toString());
    if (menuupdate.startsWith('<br>')) {
        menuupdate = menuupdate.substring(4);
    }
    updateMenuItem("UND", "Undo: \"" + menuupdate + "\"");
    updateMenuItem("UND1", "Undo: \"" + menuupdate + "\"");
};

function undo() {
    if (getCount() > 0) {
        setLS("sentiCount", (getCount() - 1).toString());
        var shitlisted = getLS(getCount().toString());
        if (shitlisted.startsWith(CONTEXTTAG)){
            dprint("RESETTING CONTEXT");
            resetContext();
        }
        rmLS(getCount().toString());
        dprint("REMOVED "+ shitlisted);
        dprint("COUNT IS NOW "+ (getCount() - 1).toString());
        var menuupdate = getLS((getCount() - 1).toString());
        if (getCount() > 0){
            if (menuupdate.startsWith('<br>')) {
                menuupdate = menuupdate.substring(4);
            }
            updateMenuItem("UND", "Undo: \"" + menuupdate + "\"");
            updateMenuItem("UND1", "Undo: \"" + menuupdate + "\"");
        }else{
            updateMenuItem("UND", "Undo: Previous");
            updateMenuItem("UND1", "Undo: Previous");
            }
        sendHighlight("UND", "");

    } else {
        notifyMe("Nothing to undo.");
    }
};

function setContext(info) {
     var highlighted = info.selectionText.trim();
     dprint("setContext() with "+highlighted);
     if ( getCount() > 0 && getLS( getCount()-1 ).startsWith(CONTEXTTAG) ){
        undo();
     }
     addtoLS(CONTEXTTAG + highlighted);
     updateMenuItem("CON", CONTEXTTAG.substring(4) + highlighted);
     existing_context = highlighted;
     dprint("UPDATED MENU, existing_context: "+existing_context);
     sendHighlight("CON", highlighted);
};

function resetContext(){
    updateMenuItem("CON", "Context not set.");
    existing_context = "";
    dprint("CONTEXT RESET");
};

function deleteSelections() {
    dprint("resetting state");
    for (var i = 0; i < getCount(); i++)
    {
        rmLS(i);
    }
    setLS("sentiCount", "0");
    resetContext();
};

function stringifyLS() {
    dprint("INTERNAL STORAGE STRINGIFY: ")
    let itemlist = [];
    let keys = Object.keys(localStorage);
    for (var i = 0; i < getCount(); i++) {
        key = i.toString();
        itemlist.push( getLS(key) );
    }
    tosend = itemlist.join('\n');
    chrome.extension.getBackgroundPage().console.log(tosend);
};

function notifyMe(words){
    dprint("NOTIFYING "+words);
    words = words;
    sendHighlight("NOT", words);
    chrome.notifications.create(
          "id1",
          {
          type:"basic",
          iconUrl:'images/SLicon.jpg',
          title:'CommonSents',  // notification title
          message:words  // notification body text
          },
          function(id) { console.log("Last error:", chrome.runtime.lastError); }
        );
};

function viewSamples(){
    chrome.tabs.create({'url':chrome.runtime.getURL("printpage.html"), 'active':true});
};

chrome.contextMenus.create({id:"UND1", title: "Undo: Previous", contexts:["selection"], onclick:undo});
chrome.contextMenus.create({id:"CON", title: "[CONTEXT NOT SET]", contexts:["selection"], onclick:setContext});
chrome.contextMenus.create({id:"SET", title: "Set New Context <alt-c>", contexts:["selection"], onclick:setContext});
chrome.contextMenus.create({ id:"POS", title: "<Target is Positive> <alt-p>", contexts:["selection"], onclick:setpos});
chrome.contextMenus.create({id:"NEU", title: "<Target is  Neutral> <alt-k>", contexts:["selection"], onclick:setneu});
chrome.contextMenus.create({ id:"NEG", title: "<Target is Negative> <alt-n>", contexts:["selection"], onclick:setneg});
chrome.contextMenus.create({id:"UND", title: "Undo: Previous", onclick:undo});
chrome.contextMenus.create({id:"SAM", title: "View your samples", onclick:viewSamples});

// keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
    chrome.tabs.executeScript( {
        code: "window.getSelection().toString();"
    }, function(selection) {
        var c = command.toString();
        text = selection[0].toString();
        if (text) {
            // convert text to text_obj so that setContext and other
            // functions can use it
            text_obj = { selectionText : text }
            if (c === "set_context") {
                setContext(text_obj);
            }
            else if (c === "set_positive") {
                setpos(text_obj);
            }
            else if (c === "set_neutral") {
                setneu(text_obj);
            }
            else if (c === "set_negative") {
                setneg(text_obj);
            }
        }
    })
});

chrome.runtime.onInstalled.addListener(function (object) {
    if (chrome.runtime.OnInstalledReason.INSTALL === object.reason) {
        chrome.tabs.create({'url':"https://jsvan.github.io/Common_Sents_Usage_Strong.html", 'active':true})
    }
});
