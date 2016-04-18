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

function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    var url = tab.url;
    var nxPattern = /(^https?:\/\/[A-Za-z_\.0-9:-]+\/[A-Za-z_\.0-9-]+\/)(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/[A-Za-z_\.0-9-]+)\/[A-Za-z_\.0-9-]+|view_documents.faces)/;
    var matchGroup = nxPattern.exec(url);
    url = matchGroup[1];
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
  $('a.server-name-url').html(nuxeo._baseURL);
});

$(document).ready(function() {

  var openJsonWindow = function(jsonObject) {
    var jsonString;
    var w = 600;
    var h = 800;
    var left = (screen.width/2)-(w/2);
    var top = (screen.height/2)-(h/2);
    jsonString = JSON.stringify(jsonObject, undefined, 2);
    chrome.runtime.getBackgroundPage(function(bkg){
      bkg._text = jsonString;
      chrome.windows.create({'url': 'json.html', 'type': 'popup', 'width': w, 'height': h, 'left': left, 'top': top} , function(window) {});
    });
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
    $('#loading').css({'display': 'block', 'bottom': '115px', 'right':'400px'});
    chrome.runtime.getBackgroundPage(function(bkg){
      nuxeo.operation('Service.HotReloadStudioSnapshot').execute()
        .then(function() {
          bkg.notification('success', 'Success!', 'A Hot Reload has successfully been completed.', '../images/nuxeo-128.png');
          $('#loading').css('display', 'none');
        })
        .catch(function(e) {
          var err = e.response.status;
          if (err >= 500) {
            bkg.notification('access_denied', 'Access denied!', 'You must have Administrator rights to perform this function.', '../images/access_denied.png');
            $('#loading').css('display', 'none');
          } else if (err >= 300 && err < 500) {
            bkg.notification('bad_login', 'Bad Login', 'Your Login and/or Password are incorrect', '../images/access_denied.png');
            $('#loading').css('display', 'none');
          } else {
            bkg.notification('unknown_error', 'Unknown Error', 'An unknown error has occurred. Please try again later.', '../images/access_denied.png');
            $('#loading').css('display', 'none');
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
      $('#loading').css({'display': 'block', 'top': '25px', 'left':'400px'});
      chrome.runtime.getBackgroundPage(function(bkg){
        nuxeo.fetch({
          method: 'POST',
          schemas: [],
          enrichers: [],
          fetchProperties: [],
          url: nuxeo._baseURL.concat('site/connectClient/uninstall/restart'),
        })
          .then(function(){
            $('#loading').css('display', 'none');
            bkg.notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png');
          })
          .catch(function(e) {
            $('#loading').css('display', 'none');
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
        $('#json-search-results').append('<thead><tr><th id="col1"></th><th id="col2"><span class="tablehead">TITLE</span></th><th id="col3"><span class="tablehead">PATH</span></th></tr></thead><tbody></tbody>');
        $('table').css('margin-top', '20px');
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
