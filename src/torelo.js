import {subdomains} from './domains';

var tabConfig = {};
var retryHostnames = {};
var failedTabs = {};

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
    updateIcon(tab_id);
}

function enableReload(tab_id) {
    tabConfig[tab_id] = true;
    updateIcon(tab_id);
}

function responseStartedCallback(details) {
    chrome.tabs.get(details.tabId, function(tab) {
	if (details.statusCode / 100 == 2) {
            delete failedTabs[tab.id];
	    chrome.pageAction.hide(tab.id);
	    disableReload(tab.id);
	} else {
            failedTabs[tab.id] = true;
	    updateIcon(tab.id);
	    chrome.pageAction.show(tab.id);
            updateTabs();
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
		scheduleCheck(delay, Math.min(20, iteration + 1), tab);
	    });
	}
    });
}

function setupTimer(tab) {
    if (!tabConfig[tab.id]) {
        scheduleCheck(1000, 1, tab);
	enableReload(tab.id);
    }
}

function isRetryEnabledForUrl(url, hostnames) {
    var hostname = new URL(url).hostname;
    var domains = subdomains(hostname);
    for (var i = 0; i < domains.length; i++) {
        if (hostnames[domains[i]]) {
            return true;
        }
    }
    return false
}

function updateTabs() {
    chrome.tabs.query({}, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (isRetryEnabledForUrl(tab.url, retryHostnames)
                && failedTabs[tab.id]) {
	        setupTimer(tab);
            } else if(tabConfig[tab.id]) {
                disableReload(tab.id);
            }
        }
    });
}

function hostnamesListener(port, message) {
    if (message.type == 'toggleHostname') {
        var hostname = message.hostname;
        if (retryHostnames[hostname]) {
            delete retryHostnames[hostname];
        } else {
            retryHostnames[hostname] = true;
        }
        updateTabs();
        postState(port);
    }
}

function postState(port) {
    port.postMessage({type: 'state', hostnames: retryHostnames});
}

function onConnectCallback(port) {
    if (port.name == 'hostnames') {
        port.onMessage.addListener(function(message) {
            hostnamesListener(port, message);
        });
        postState(port);
    }
}

function initialize() {
    var filter = {types: ["main_frame"], urls: ["<all_urls>"]};
    chrome.runtime.onConnect.removeListener(onConnectCallback);
    chrome.runtime.onConnect.addListener(onConnectCallback);
    chrome.webRequest.onCompleted.removeListener(responseStartedCallback);
    chrome.webRequest.onCompleted.addListener(responseStartedCallback, filter);
}

initialize();
