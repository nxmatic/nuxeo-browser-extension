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

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: '^https?://[A-Za-z_\.0-9:-]+/[A-Za-z_\.0-9-]+/(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site/[A-Za-z_\.0-9-]+)/[A-Za-z_\.0-9-]+|view_documents.faces)' }
          })
        ],
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
