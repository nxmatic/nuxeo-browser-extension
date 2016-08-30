function pageActionOnNuxeo(tabInfo) {
  var re = /https?:\/\/[\w\:\.]+\/\w+\/(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/\w+)\/\w+/g;
  var currentUrl = tabInfo.url;
  var isNuxeo = currentUrl.match(re);
  if (isNuxeo){
    console.log("IS NUXEO");
    chrome.pageAction.show(tabInfo.id);
  };
};

function getInfoForTab(tabs) {
  if (tabs.length > 0) {
    chrome.tabs.get(tabs[0].id, pageActionOnNuxeo);
  }
}

function onTabChange(activeInfo) {
  chrome.tabs.query({currentWindow: true, active: true}, getInfoForTab);
};

chrome.tabs.onActivated.addListener(onTabChange);