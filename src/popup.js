import {subdomains} from './domains';

var port = chrome.runtime.connect({name: 'hostnames'});

port.onMessage.addListener(function(message) {
    if (message.type == 'state') {
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
            var tab = tabs[0];
            var oldListNode = document.getElementById('hostname-list');
            var url = new URL(tab.url);
            var hostname = url.hostname;
            var domains = subdomains(hostname);
            var listNode = oldListNode.cloneNode(false);
            for (var i = 0; i < domains.length; i++) {
                var urlNode = document.createElement("p");
                urlNode.onclick = function(domain, port) {
                    return function(event) {
                        port.postMessage({type: 'toggleHostname',
                                          hostname: domain});
                    }
                }(domains[i], port);
                if (message.hostnames[domains[i]]) {
                    urlNode.className = 'selected';
                }
                urlNode.appendChild(document.createTextNode(domains[i]));
                listNode.appendChild(urlNode);
            }
            oldListNode.parentNode.replaceChild(listNode, oldListNode);
        });
    }
});
