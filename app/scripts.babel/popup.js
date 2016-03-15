'use strict';

function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    var url = tab.url;
    var path = '/nuxeo/';
    var n = url.indexOf(path);
    url = url.substr(0,(n+path.length));
    console.assert(typeof url === 'string', 'tab.url should be a string');
    callback(url);
  });
};

getCurrentTabUrl(function(url) {});

var nuxeo;
getCurrentTabUrl(function(url) {
  nuxeo = new Nuxeo({
    baseURL: url,
    auth: {
      username: 'Administrator',
      password: 'Administrator'
    }
  });
});

$(document).ready(function() {
  $('#hot-reload-button').click(function() {
    var bkg = chrome.extension.getBackgroundPage();
    nuxeo.operation('Document.HotReloadOperation').execute()
      .then(function() {
        bkg.notification('success', 'Success!', 'A Hot Reload has successfully been completed.', '../images/nuxeo-128.png');
      })
      .catch(function(e) {
        var err = e.response.status;
        if (err >= 500) {
          bkg.notification('access_denied', 'Access denied!', 'You must have Administrator rights to perform this function.', '../images/access_denied.png');
        } else if (err >= 300 && err < 500) {
          bkg.notification('bad_login', 'Bad Login', 'Your Login and/or Password are incorrect', '../images/access_denied.png');
        } else {
          bkg.notification('unknown_error', 'Unknown Error', 'An unknown error has occurred. Please try again later.', '../images/access_denied.png');
        };
      })
  });
});
