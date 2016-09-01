chrome.browserAction.disable();
disableIcon();

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
  var re = /https?:\/\/[\w\:\.]+\/\w+\/(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/\w+)\/\w+|view_documents\.faces|view_domains\.faces|view_home\.faces)/g;
  var currentUrl = tabInfo.url;
  var isNuxeo = currentUrl.match(re);
  if (isNuxeo === null){
    disableIcon();
    chrome.browserAction.disable(tabInfo.id);
  } else {
    enableIcon();
    chrome.browserAction.enable(tabInfo.id);
  };
};

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
chrome.tabs.onActivated.addListener(onChange);

