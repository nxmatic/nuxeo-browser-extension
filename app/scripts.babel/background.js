'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

//chrome.browserAction.setBadgeText({text: '\'Allo'});

console.log('\'Allo \'Allo! Event Page for Browser Action');

function notification(idP, titleP, messageP, img) {
  chrome.notifications.create(idP, {
    type: 'basic',
    title: titleP,
    message: messageP,
    iconUrl: img
  }, function() {
    console.log(chrome.runtime.lastError);
  });
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([
        {
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { urlMatches: '^https?:\/\/[\w\.]+\/\w+\/(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/\w+)\/\w+' }
            })
          ],
          actions: [ new chrome.declarativeContent.ShowPageAction() ]
        }
      ]);
    });
  });
