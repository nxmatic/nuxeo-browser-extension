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

(function (window) {
	var app = window.app = window.app || {};
  var studioExt = {};
  var tabUrl;
  var pkgName;

  var _AnalyticsCode = 'UA-79232642-1';
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', _AnalyticsCode]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

  function trackButtonClick(e) {
    _gaq.push(['_trackEvent', e.target.id, 'clicked']);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('a');
    var debug = document.getElementById('debug-switch');
    var exportCurrent = document.getElementById('export-current');
    var jsonSearch = document.getElementById('json-search');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', trackButtonClick);
    };
    debug.addEventListener('click', trackButtonClick);
    exportCurrent.addEventListener('click', trackButtonClick);
    jsonSearch.addEventListener('click', trackButtonClick);
  });

  app.browser.getBackgroundPage(function(bkg) {
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

    var position;

    function startLoadingHR() {
        _gaq.push(['_trackEvent', 'hot-reload-button', 'clicked']);
        var a = $('a#hot-reload-button');
        position = a.position();
        $('#loading').css({'display': 'block', 'top': (position.top-5), 'left': (position.left-50)});
      };

    function startLoadingRS() {
        _gaq.push(['_trackEvent', 'restart-button', 'clicked']);
        var a = $('a#restart-button');
        position = a.position();
        $('#loading').css({'display': 'block', 'top': (position.top-5), 'left': (position.left+140)});
    };

    function startLoadingES() {
        _gaq.push(['_trackEvent', 'reindex-button', 'clicked']);
        var a = $('a#reindex-button');
        position = a.position();
        $('#loading').css({'display': 'block', 'top': (position.top-5), 'left': (position.left-50)});
    };

    function stopLoading() {
        $('#loading').css('display', 'none');
    };

    function registerLink(element, url) {
      $(element).click(function() {
				if (app.browser.name == 'Chrome') {
	        app.browser.createTabs({
	          url: url,
	          openerTabId: bkg.studioExt.server.tabId
	        });
				} else {
	        app.browser.createTabs({
	          url: url
	        });
				}

      });
    };

    function checkStudioProject(nuxeo) {
      let script = `import groovy.json.JsonOutput;
      import org.nuxeo.connect.packages.PackageManager;
      import org.nuxeo.connect.client.we.StudioSnapshotHelper;
      import org.nuxeo.ecm.admin.runtime.RuntimeInstrospection;
      import org.nuxeo.runtime.api.Framework;

      def pm = Framework.getLocalService(PackageManager.class);
      def snapshotPkg = StudioSnapshotHelper.getSnapshot(pm.listRemoteAssociatedStudioPackages());
      def pkgName = snapshotPkg == null ? null : snapshotPkg.getName();
      def bundles = RuntimeInstrospection.getInfo();

      println JsonOutput.toJson([studio: pkgName, bundles: bundles]);`;

      let blob = new Nuxeo.Blob({
        content: new Blob([script]),
        name: 'script',
        type: 'text/plain',
        size: script.length
      });

      nuxeo.operation('RunInputScript').params({
        type: 'groovy'
      }).input(blob).execute().then((res) => {
        return res.text();
      }).then((text) => {
        var json = JSON.parse(text);
        pkgName = json['studio'];
        var studioUrl = ('https://connect.nuxeo.com/nuxeo/site/studio/ide?project=').concat(pkgName);
        if (pkgName) {
          $('#studio-link-button').click(function() {
            _gaq.push(['_trackEvent', 'studio-link-button', 'clicked']);
						if (app.browser.name == 'Chrome') {
							app.browser.createTabs({
								url: studioUrl,
								openerTabId: bkg.studioExt.server.tabId
							});
						} else {
							app.browser.createTabs({
								url: studioUrl
							});
						}

          });
          $('#hot-reload-button').click(function() {
            bkg.bkgHotReload(startLoadingHR, stopLoading);
          });
        } else {
          $('#studio-link-button, #hot-reload-button').attr('class', 'inactive-button');
          $('#studio-link-button, #hot-reload-button').click(function() {
            bkg.notification('no_studio_project', 'No associated Studio project', 'If you\'d like to use this function, please associate your Nuxeo server with a studio project' , '../images/access_denied.png');
          });
        }
      }).catch((e) => {
        console.log(e);
      })
    };

    $(document).ready(function() {

      $('#searchclear').click(function(){
        $('#json-search').val('');
        $('.no-result').css('display', 'none');
      });

      var nuxeo;
      bkg.getCurrentTabUrl(function(url) {

        nuxeo = new Nuxeo({
          baseURL: url
        });

        checkStudioProject(nuxeo);

        nuxeo.operation('Traces.ToggleRecording')
          .params({readOnly: true})
          .execute()
          .then(function(response) {
            $('#debug-switch').attr('checked', response.value);
          });

        $('div.server-name-url').html(nuxeo._baseURL);

        var serverURL = nuxeo._baseURL.replace(/\/$/, '');

        registerLink('#autodoc-button', nuxeo._baseURL.concat('site/automation/doc/'));
        registerLink('#api-pg-link', 'http://nuxeo.github.io/api-playground/');
        registerLink('#api-button', ('http://nuxeo.github.io/api-playground/#/').concat(serverURL));
        registerLink('#explorer-link', 'https://explorer.nuxeo.com');
        registerLink('#nxql-link', 'https://doc.nuxeo.com/display/NXDOC/NXQL');
        registerLink('#el-scripting-link', 'https://doc.nuxeo.com/display/NXDOC/Understand+Expression+and+Scripting+Languages+Used+in+Nuxeo');
        registerLink('#mvel-link', 'https://doc.nuxeo.com/display/NXDOC/Use+of+MVEL+in+Automation+Chains');
        registerLink('#workflow-variables-link', 'https://doc.nuxeo.com/display/NXDOC/Variables+Available+in+the+Automation+Context');
        registerLink('#escalation-rules-link', 'https://doc.nuxeo.com/display/NXDOC/Escalation+Service');
        registerLink('#nxelements-link', 'https://elements.nuxeo.com/');
        registerLink('#nxlayouts-link', 'http://showcase.nuxeo.com/nuxeo/layoutDemo/');
        registerLink('#style-guide-link', 'http://showcase.nuxeo.com/nuxeo/styleGuide/');

        var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        var pathPattern = /^\//;
        var docPattern = /nxpath\/[A-Za-z_\.0-9-]+(\/[A-Za-z\.0-9_\-\/%~:?#]+)|(?:nxdoc[\/A-Za-z_\.0-9]+)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/;
        var matchGroupDoc = docPattern.exec(bkg.tabUrl);

        if (matchGroupDoc) {
          var docPath = matchGroupDoc[1];
          $('#export-current').css('display', 'block');
          $('#export-current').click(function(event) {
            if (uuidPattern.test(docPath)) {
              getJsonFromGuid(docPath);
            } else if (pathPattern.test(docPath)) {
              getJsonFromPath(docPath);
            };
          });
        };

      });

      function getJsonFromPath(input) {
        nuxeo.request('/path/' + input)
          .schemas('*')
          .enrichers({ document: ['acls', 'permissions'] })
          .get()
          .then(openJsonWindow)
          .catch(function(error) {
            throw new Error(error);
          });
      };

      function getJsonFromGuid(input) {
        nuxeo.request('/id/' + input)
          .schemas('*')
          .enrichers({ document: ['acls', 'permissions'] })
          .get()
          .then(openJsonWindow)
          .catch(function(error) {
            throw new Error(error);
          });
      };

      var openJsonWindow = function(jsonObject) {
        var jsonString;
        var w = 600;
        var h = 800;
        var left = (screen.width/2)-(w/2);
        var top = (screen.height/2)-(h/2);
        jsonString = JSON.stringify(jsonObject, undefined, 2);
        bkg._text = jsonString;
				if (app.browser.name == 'Chrome') {
					app.browser.createTabs({url: 'json.html', active: true, openerTabId: bkg.studioExt.server.tabId});
				} else {
					app.browser.createTabs({url: 'json.html', active: true});
				}

      };

      function showSearchResults(icon, title, path, uid) {
        var icon_link = nuxeo._baseURL.concat(icon);
        var icon_tag = '<td class="json-doc-icon"><img src="' + icon_link + '" alt="icon"></td>';
        var title_tag = '<td class="json-title" id="' + uid + '">' + title + '</td>';
        var path_tag = '<td class="json-path">' + path + '</td>';
        $('tbody').append('<tr class="search-result">'+ icon_tag + title_tag + path_tag + '</tr>');
      };

      $('#restart-button').confirm({
        title: 'Warning!',
        text: 'Are you sure you want to restart the server?',
        confirmButton: 'Restart',
        cancelButton: 'Cancel',
        confirm: function() {
          bkg.restart(startLoadingRS, stopLoading);
        }
      });

      $('#reindex-button').click(function() {
        bkg.reindex(startLoadingES, stopLoading);
      });

      $('#debug-switch').click(function(event) {
        nuxeo.operation('Traces.ToggleRecording')
          .params({readOnly: false})
          .execute()
          .then(function(response) {
            $('#debug-switch').attr('checked', response.value);
          })
      });

      $('#json-search').keydown(function() {
        $('#loading-gif').css({'display': 'inline'});
      });

      $('#json-search').keyup(debounce(function() {
        $('#json-search-results').empty();
        var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        var pathPattern = /^\//;
        var input = $('#json-search').val();
        if (input == '') {
          $('.no-result').css('display', 'none');
          $('#json-search-results').empty();
          $('#loading-gif').css('display', 'none');
        } else if (uuidPattern.test(input)) {
          getJsonFromGuid(input);
          $('#loading-gif').css('display', 'none');
        } else if (pathPattern.test(input)) {
          getJsonFromPath(input);
          $('#loading-gif').css('display', 'none');
        } else {
          var jsonQuery = 'SELECT * FROM Document WHERE ecm:fulltext = "' + input + '"';
          nuxeo.repository()
          .schemas(['dublincore', 'common'])
          .query({
            query: jsonQuery,
            sortBy: 'dc:modified'
          })
          .then(function(res) {
            if (res.length > 0) {
              $('#json-search-results').append('<thead><tr><th id="col1"></th><th id="col2"><span class="tablehead">TITLE</span></th><th id="col3"><span class="tablehead">PATH</span></th></tr></thead><tbody></tbody>');
              $('table').css('margin-top', '20px');

              res.forEach(function(doc) {
                var icon = doc.get('common:icon');
                var title = doc.get('dc:title');
                var path = doc.path;
                var uid = doc.uid;
                showSearchResults(icon, title, path, uid);
              });
              $('.json-title').click(function(event) {
                event.preventDefault();
                getJsonFromGuid(event.target.id);
              });
              $('#loading-gif').css('display', 'none');
            } else {
              $('.no-result span').text(input);
              $('.no-result').css('display', 'block');
              $('#loading-gif').css('display', 'none');
            }
          })
          .catch(function(error) {
            error.response.json().then(function(json) {
              bkg.notification('error', json.code, json.message, '../images/access_denied.png');
              $('#loading-gif').css('display', 'none');
            });
          });
        };
      }, 1000));
    });
  });
})(window);
