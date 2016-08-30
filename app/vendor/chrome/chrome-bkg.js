chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlMatches: '^https?://[A-Za-z_\.0-9:-]+/[A-Za-z_\.0-9-]+/(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site/[A-Za-z_\.0-9-]+)/[A-Za-z_\.0-9-]+|view_documents\.faces|view_domains\.faces|view_home\.faces)' }
          })
        ],
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
});