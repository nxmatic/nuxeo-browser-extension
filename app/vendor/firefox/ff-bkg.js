
var tabUrl;

function disableIcon(tabId) {
  chrome.browserAction.setIcon({ path: {
    '16': '../images/nuxeo-grey-16.png',
    '19': '../images/nuxeo-grey-19.png',
    '32': '../images/nuxeo-grey-32.png',
    '38': '../images/nuxeo-grey-38.png'
  }, tabId: tabId });
}

function enableIcon(tabId) {
  chrome.browserAction.setIcon({ path: {
    '16': '../images/nuxeo-16.png',
    '19': '../images/nuxeo-19.png',
    '32': '../images/nuxeo-32.png',
    '38': '../images/nuxeo-38.png'
  }, tabId: tabId });
}

function pageActionOnNuxeo(tabInfo) {
  var re = /.*\.nuxeo$/;
  var isNuxeo;
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    var tab = tabs[0];
    tabUrl = tab.url;
  });
  chrome.cookies.getAll({
    url: tabUrl,
    name: 'JSESSIONID'
  }, function(cookies) {
    disableIcon();
    chrome.browserAction.disable(tabInfo.id);
    cookies.forEach(function(cookie) {
      if((cookie.value).match(re)) {
        enableIcon();
        chrome.browserAction.enable(tabInfo.id);
        return;
      }
    })
  });
}

function getInfoForTab(tabs) {
  if (tabs.length > 0) {
    chrome.tabs.get(tabs[0].id, pageActionOnNuxeo);
  }
}

function onChange(tabInfo) {
  chrome.tabs.query({currentWindow: true, active: true}, getInfoForTab);
};

var target = "<all_urls>";
chrome.webRequest.onCompleted.addListener(onChange, {urls: [target]});
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, pageActionOnNuxeo);
});
