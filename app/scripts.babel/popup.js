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
    url = url.substr(0, (n + path.length));
    console.assert(typeof url === 'string', 'tab.url should be a string');
    callback(url);
  });
};

var nuxeo;
getCurrentTabUrl(function(url) {
  nuxeo = new Nuxeo({
    baseURL: url,
    auth: {
      method: 'basic',
      username: 'Administrator',
      password: 'Administrator'
    }
  });
  nuxeo.operation('Traces.ToggleRecording')
    .params({readOnly: true})
    .execute()
    .then(function(response) {
      $('#debug-switch').attr('checked', response.value);
    });
});

$(document).ready(function() {

  var openJsonWindow = function(jsonObject) {
    var jsonString;
    var w = 600;
    var h = 800;
    var left = (screen.width/2)-(w/2);
    var top = (screen.height/2)-(h/2);
    jsonString = JSON.stringify(jsonObject, undefined, 2);
    jsonString = btoa(jsonString);
    chrome.windows.create({'url': 'data:application/json;base64,' + jsonString, 'type': 'popup', 'width': w, 'height': h, 'left': left, 'top': top} , function(window) {});
  };

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  };

  function getJsonFromPath(input) {
    nuxeo.request('/path/' + input)
      .schemas('*')
      .get()
      .then(openJsonWindow)
      .catch(function(error) {
        throw new Error(error);
      });
  };

  function getJsonFromGuid(input) {
    nuxeo.request('/id/' + input)
      .schemas('*')
      .get()
      .then(openJsonWindow)
      .catch(function(error) {
        throw new Error(error);
      });
  };

  function showSearchResults(icon, title, path, uid) {
    var icon_link = nuxeo._baseURL.concat(icon);
    var icon_tag = '<td class="json-doc-icon"><img src="' + icon_link + '" alt="icon"></td>';
    var title_tag = '<td class="json-title" id="' + uid + '">' + title + '</td>';
    var path_tag = '<td class="json-path">' + path + '</td>';
    $('tbody').append('<tr class="search-result">'+ icon_tag + title_tag + path_tag + '</tr>');
  };

  $('#hot-reload-button').click(function() {
    chrome.runtime.getBackgroundPage(function(bkg){
      nuxeo.operation('Service.HotReloadStudioSnapshot').execute()
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
        });
    });
  });

  $('#studio-link-button').click(function() {
    chrome.tabs.create({
      url: 'https://connect.nuxeo.com/nuxeo/site/studio/ide/'
    });
  });

  $('#autodoc-button').click(function() {
    chrome.tabs.create({
      url: nuxeo._baseURL.concat('site/automation/doc/')
    });
  });

  $('#restart-button').click(function() {
    var restart = confirm('Are you sure you want to restart the server?');
    if (restart) {
      chrome.runtime.getBackgroundPage(function(bkg){
        nuxeo.fetch({
          method: 'POST',
          schemas: [],
          enrichers: [],
          fetchProperties: [],
          url: nuxeo._baseURL.concat('site/connectClient/uninstall/restart'),
        })
          .then(function(){
            bkg.notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png');
          })
          .catch(function(e) {
            bkg.notification('success', 'Success!', 'Nuxeo server is restarting...', '../images/nuxeo-128.png');
          });
      });
    };
  });

  $('#debug-switch').click(function() {
    nuxeo.operation('Traces.ToggleRecording')
      .params({readOnly: false})
      .execute()
      .then(function(response) {
        $('#debug-switch').attr('checked', response.value);
      })
  });

  $('#json-search').keydown(function() {
    $('#loading-gif').css('display', 'inline');
  });

  $('#json-search').keyup(debounce(function() {
    $('#json-search-results').empty();
    $('#loading-gif').css('display', 'none');
    var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    var pathPattern = /^\//;
    var input = $('#json-search').val();
    if (input == '') {
      $('#json-search-results').empty();
    } else if (uuidPattern.test(input)) {
      getJsonFromGuid(input);
    } else if (pathPattern.test(input)) {
        getJsonFromPath(input);
    } else {
      var jsonQuery = 'SELECT * FROM Document WHERE ecm:fulltext = "' + input + '"';
      var getResults = function(doc) {
        var icon = doc.get('common:icon');
        var title = doc.get('dc:title');
        var path = doc.path;
        var uid = doc.uid;
        showSearchResults(icon, title, path, uid);
      }
      nuxeo.repository()
      .schemas(['dublincore', 'common'])
      .query({
        query: jsonQuery,
        sortBy: 'dc:modified'
      })
      .then(function(res) {
        $('#json-search-results').append('<thead><tr><th id="col1"></th><th id="col2">Title</th><th id="col3">Path</th></tr></thead><tbody></tbody>');
        res.forEach(getResults);
          $('.json-title').click(function(event) {
            event.preventDefault();
            getJsonFromGuid(event.target.id);
          });
      })
      .catch(function(error) {
        throw new Error(error);
      });
    };
  }, 750));
});
