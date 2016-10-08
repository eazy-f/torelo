console.log('Loading torelo');
var tabConfig = {};

function updateIcon(tab_id) {
    var path = "";
    if (tabConfig[tab_id]) {
	path =  "images/page_action_enabled_38.png";
    } else {
	path = "images/page_action_38.png";
    }
    chrome.pageAction.setIcon({path: path, tabId: tab_id});
}

function disableReload(tab_id) {
    tabConfig[tab_id] = false;
}

function enableReload(tab_id) {
    tabConfig[tab_id] = true;
    updateIcon(tab_id);
}

function responseStartedCallback(details) {
    chrome.tabs.get(details.tabId, function(tab) {
	if (details.statusCode / 100 == 2) {
	    chrome.pageAction.hide(tab.id);
	    disableReload(tab.id);
	} else {
	    updateIcon(tab.id);
	    chrome.pageAction.show(tab.id);
	}
    });
}

function scheduleCheck(timeout, iteration, tab) {
    window.setTimeout(periodicCheck, timeout, iteration, tab.id, tab.url);
}

function periodicCheck(iteration, tab_id, url) {
    chrome.tabs.get(tab_id, function(tab) {
	if (tab.url == url && tabConfig[tab_id]) {
	    chrome.tabs.reload(tab_id, {bypassCache: true}, function() {
		var delay = Math.min(60000, 1000 * Math.pow(2, iteration));
		console.log(iteration + ' - ' + delay);
		scheduleCheck(delay, Math.min(20, iteration + 1), tab);
	    });
	}
    });
}

function setupTimer(tab) {
    scheduleCheck(1000, 1, tab);
}

function pageActionCallback(tab) {
    if (tabConfig[tab.id]) {
	disableReload(tab.id);
    } else {
	enableReload(tab.id);
	setupTimer(tab);
    }
}

function initialize() {
    var filter = {types: ["main_frame"], urls: ["<all_urls>"]};
    chrome.webRequest.onCompleted.removeListener(responseStartedCallback);
    chrome.webRequest.onCompleted.addListener(responseStartedCallback, filter);
    chrome.pageAction.onClicked.addListener(pageActionCallback);
}

initialize();
console.log('Loading completed');
