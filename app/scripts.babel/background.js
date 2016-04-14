/*
Copyright 2016 Nuxeo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
};

chrome.runtime.onInstalled.addListener(function() {
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
});
