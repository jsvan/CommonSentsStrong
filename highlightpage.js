var CONTEXTCOLOR = "yellow"
var NEGCOLOR = "red"
var POSCOLOR = "lightgreen"
var NEUCOLOR = "lightgray"
var ALERTCOLOR = "red";
var WARNINGCOLOR = "yellow";
var ORIGINAL_BG_COLOR = document.body.style.backgroundColor;
var FLASHDURATION = 50;
var alltaglocs = [];
var NEsFoundInThisContext = new Map();
var prevContextStart = 0;
var prevContextEnd = 0;



function setprevContextStart(num){
    prevContextStart = num;
};

function setprevContextEnd(num){
    prevContextEnd = num;
};

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request.action + " " + request.highlighted);
    let HL = request.highlighted.trim();
    if (request.action == "CON") {
      addContext(HL);
    } else if (request.action == "POS"){
        addPos(HL);
    } else if (request.action == "NEU"){
        addNeu(HL);
    } else if (request.action == "NEG"){
        addNeg(HL);
    } else if (request.action == "UND"){
        undo();
    } else if (request.action == "NOT"){
        notify(ALERTCOLOR);
    } else {
        console.log(request.action + " not found.");
    }
  });


function notify(color) {
    innernotify(color, ORIGINAL_BG_COLOR);
    setTimeout(function() {innernotify(color, ORIGINAL_BG_COLOR)}, FLASHDURATION+60);
    setTimeout(function() {innernotify(color, ORIGINAL_BG_COLOR)}, 2*FLASHDURATION+70);
    setTimeout(function() {revertscreen(ORIGINAL_BG_COLOR)}, 3*FLASHDURATION+80);
};

function innernotify(color, oldcolor){
    flashscreen(color);
    setTimeout(function() {revertscreen(oldcolor)}, FLASHDURATION);
};

function flashscreen(color){
    document.body.style.backgroundColor = color;
};

function revertscreen(oldcolor){
    document.body.style.backgroundColor = oldcolor;
};

function markS(color){
    let builtstring = " <mark title=\"Strong\" style=\"background-color:" + color + "\"> ";
    return builtstring;
};

function markE(){
    let builtstring = " </mark> ";
    return builtstring;
};


function highlightInside(mid, starttag, endtag, startLocOffset){
    function Tag(){
        this.taglocs = [];
        this.addedtagwidth = 0;
        this.push = function(tag, where){
            let tagstartloc = where + this.addedtagwidth + startLocOffset;
            this.taglocs.push([tagstartloc, tagstartloc + tag.length]);
            this.addedtagwidth += tag.length;
        }
    }

    let finalhtmllist = [];
    finalhtmllist.push(starttag);
    taginfo = new Tag();
    taginfo.push(starttag, 0);

    let inTag = false;
    let inMark = true;
    for(var ch_i = 0; ch_i<mid.length; ch_i++){
        let ch = mid[ch_i];
        if ( ch === '<' && inMark){
            inTag = true;
            finalhtmllist.push(endtag);
            taginfo.push(endtag, ch_i);
            inMark = false;
        } else if ( inTag && ch === '>') {
            inTag = false;
        } else if (inTag || /\s/.test(ch) ) {  // if in a tag or is a whitespace
            // pass to just add it
        } else if (ch === '<' && !inMark){
            inTag = true;

        } else if (!inMark) {  //Havent begun mark yet, not inTag.
            finalhtmllist.push(starttag);
            taginfo.push(starttag, ch_i);
            inMark = true;
        }
        finalhtmllist.push(ch);
    }
    if (!inTag && inMark){
            finalhtmllist.push(endtag);
            taginfo.push(endtag, ch_i);
            inMark = false;
    }
    return [finalhtmllist.join(''), [taginfo.taglocs], taginfo.addedtagwidth]
}


function highlight(color, start, end){
    var body = document.body.innerHTML;
    var starttag    = markS(color);
    var endtag      = markE();
    var prefix      = body.substring(0, start);
    var mid         = body.substring(start, end);
    var suffix      = body.substring(end);
    var insideresults = highlightInside(mid, starttag, endtag, start);

    // highlight everythign until you hit an end tag, and then recall this same function for substring after that tag
    var newbody = prefix + insideresults[0] + suffix;
    alltaglocs = alltaglocs.concat(insideresults[1]);  // keep track of where you put tags
    setprevContextEnd(prevContextEnd+insideresults[2]);  // lengthen new context by the mark lengths
    return newbody;
}

function addContext(highlighted){
    var [start, end] = htmlsearchRecursive(highlighted, document.body.innerHTML);

    if (start == -1) {
         alltaglocs = alltaglocs.concat([[[-1,-1], [-1,-1]]]);
        notify(WARNINGCOLOR);
        return;
    }
    var smark = markS(CONTEXTCOLOR);
    setprevContextStart(start);
    setprevContextEnd(end);
    var newbody = highlight(CONTEXTCOLOR, prevContextStart, prevContextEnd);
    document.body.innerHTML = newbody;
    NEsFoundInThisContext.clear();
};

function addCol(highlighted, color){
    var body = document.body.innerHTML;
    var samecount = (NEsFoundInThisContext.has(highlighted)) ? NEsFoundInThisContext.get(highlighted) + 1 : 1;
    var searchStartLoc = prevContextStart;
    var offsets = htmlsearchRecursive(highlighted, body.substring(searchStartLoc, prevContextEnd));
    if (offsets[0] == -1) {
        alltaglocs = alltaglocs.concat([[[-1,-1], [-1,-1]]]);
        notify(WARNINGCOLOR);
        return;
    }
    for(var findingword=1; findingword < samecount; findingword++){
        searchStartLoc = searchStartLoc + offsets[1];
        offsets = htmlsearchRecursive(highlighted, body.substring(searchStartLoc, prevContextEnd));
        if (offsets[0] == -1) {
            alltaglocs = alltaglocs.concat([[[-1,-1], [-1,-1]]]);
            notify(WARNINGCOLOR);
            return;
        }
    }

    var start = searchStartLoc + offsets[0];
    var end = searchStartLoc + offsets[1];
    var newbody = highlight(color, start, end);
    document.body.innerHTML = newbody;
    NEsFoundInThisContext.set(highlighted, samecount);

};

function addPos(highlighted) {
    addCol(highlighted, POSCOLOR);
};

function addNeg(highlighted) {
    addCol(highlighted, NEGCOLOR);
};

function addNeu(highlighted) {
    addCol(highlighted, NEUCOLOR);
};

function undo() {
    if (!alltaglocs){
        return;
    }
    var alltagstoundo = alltaglocs.pop();
    if (alltagstoundo[0] == -1) {  // [[-1,-1], [-1,-1]]
        console.log("Last item wasn't found, no highlighting to undo.")
        return;
    }
    var body = document.body.innerHTML;
    var htmlbuilt = [];
    htmlbuilt.push(body.substring(0, alltagstoundo[0][0]));
    var prevend = alltagstoundo[0][1];
    var shrinkage = alltagstoundo[0][1] - alltagstoundo[0][0];
    for (var t=1; t < alltagstoundo.length; t++){
        htmlbuilt.push(body.substring(prevend, alltagstoundo[t][0]));
        shrinkage += (alltagstoundo[t][1] - alltagstoundo[t][0]);
        prevend = alltagstoundo[t][1];
    }
    htmlbuilt.push(body.substring(alltagstoundo[alltagstoundo.length - 1][1]))
    document.body.innerHTML = htmlbuilt.join('');
    setprevContextEnd(prevContextEnd - shrinkage);
};


function searchinner(lostboy, context){
    if (!lostboy) {
        return 1;
    }
    if (!context) {
        return -1;
    }
    var i = 0;
    var lostboyI = 0;
    var stuck = true;
    while(stuck) {
        if (i > context.length){
            return -1;
        }
        stuck = false;
        if (/\s/.test(context[i])) {
            stuck = true;
            i += 1;
        }
        if (context[i] == '<') {
            while (context[i] != '>') {
                stuck = true;
                i+=1;
            }
            i += 1;
        }
        // deal with &nbsp;
        // if &thing;, then skip to the end of it in context, skip to 1 over in lostboy.
        var badguy = []
        if (context[i] === '&' && i+1<context.length && !/\s/.test(context[i+1])) {
             while (context[i] != ';') {
                badguy.push(context[i]);
                stuck = true;
                i+=1;
            }
            badguy.push(context[i]);
            i += 1;
            if(badguy.join('') !== '&nbsp;'){  // we took out all the spaces already from lostboy so nothing to skip over.
                lostboyI += 1;
            }

        }
    }
    // special rule to deal with &nbsp;

    if (lostboy[lostboyI] === context[i]){
        ret = searchinner(lostboy.substring(lostboyI + 1), context.substring(i+1));
        if (ret == -1){
            return -1;
        } else {
            return ret + 1 + i;
        }
    }
    return -1;
};


function htmlsearchRecursive(lostboy, context) {
    lostboy = lostboy.replace(/\s/g,'');
    for (var cc = 0; cc < context.length; cc++){
        if (lostboy[0] == context[cc]) {
            var ret = searchinner(lostboy.substring(1), context.substring(cc+1));
            if (ret == -1){
                continue
            } else {
                return [cc, cc+ret];
            }
        }
    }
    return [-1, -1];
};

function testSearch(what){
var b = document.body.innerHTML;
var t0 = performance.now();
var res = b.search(what);
console.log('searchn ',performance.now()-t0, " ms, ", res);
if (res != -1) { console.log(b.substring(res, res+what.length));}
/*
var t0 = performance.now();
var res = htmlsearch(what, b);
console.log('charles ',performance.now()-t0, " ms, ", res);
if (res[0] != -1) { console.log(b.substring(res[0], res[1]));}
*/
var t0 = performance.now();
var res = htmlsearchRecursive(what,b);
console.log('minerec ',performance.now()-t0, " ms, ", res);
if (res[0] != -1) { console.log(b.substring(res[0], res[1]));}
};
