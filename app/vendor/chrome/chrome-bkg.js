function pageActionOnNuxeo(tabInfo) {
  var re = /.*\.nuxeo$/;
  var isNuxeo;
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    var url;
    var tab = tabs[0];
    tabUrl = tab.url;
  });
  console.log(tabUrl);
  chrome.cookies.get({
    url: tabUrl,
    name: 'JSESSIONID'
  }, function(cookie) {
    console.log(cookie.value);
    isNuxeo = (cookie.value).match(re);
    console.log("is Nuxeo? " + isNuxeo);
    if (isNuxeo) {
      chrome.pageAction.show(tabInfo.id);
    } else {
      chrome.pageAction.hide(tabInfo.id);
    }
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
chrome.tabs.onActivated.addListener(onChange);