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
    return browser.pageAction.setIcon({path: path, tabId: tab_id});
}

function disableReload(tab_id) {
    tabConfig[tab_id] = false;
    return updateIcon(tab_id);
}

function enableReload(tab_id) {
    tabConfig[tab_id] = true;
    return updateIcon(tab_id);
}

function responseStartedCallback(details) {
    browser.tabs.get(details.tabId).then((tab) => {
	if (details.statusCode / 100 == 2) {
            delete failedTabs[tab.id];
            tabConfig[tab.id] = false;
	} else {
            failedTabs[tab.id] = true;
            if (!(tab.id in tabConfig)) {
                tabConfig[tab.id] = false;
            };
	}
    });
}

function scheduleCheck(timeout, iteration, tab) {
    window.setTimeout(periodicCheck, timeout, iteration, tab.id, tab.url);
}

function periodicCheck(iteration, tab_id, url) {
    browser.tabs.get(tab_id, function(tab) {
	if (tab.url == url && tabConfig[tab_id]) {
	    browser.tabs.reload(tab_id, {bypassCache: true}, function() {
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
    return browser.tabs.query({}).then(function(tabs) {
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
        updateTabs().then(() => postState(port));
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

function tabUpdateCallback(tabId, changeInfo, tabInfo) {
    if (tabInfo.status == 'complete') {
        if (failedTabs[tabId]) {
            updateTabs().then(() => updateIcon(tabInfo.id));
            browser.pageAction.show(tabId);
        } else {
            browser.pageAction.hide(tabId);
        }
    }
}

function initialize() {
    var filter = {types: ["main_frame"], urls: ["<all_urls>"]};
    browser.runtime.onConnect.removeListener(onConnectCallback)
    browser.runtime.onConnect.addListener(onConnectCallback);
    browser.webRequest.onCompleted.removeListener(responseStartedCallback);
    browser.webRequest.onCompleted.addListener(responseStartedCallback, filter);
    browser.tabs.onUpdated.removeListener(tabUpdateCallback);
    browser.tabs.onUpdated.addListener(tabUpdateCallback);
}

initialize();
