/* eslint-disable comma-dangle */
/*
  Copyright 2016-2024 Nuxeo

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

import $ from 'jquery';
import 'bootstrap/dist/css/bootstrap.min.css';
import debounce from 'just-debounce';
import DOMPurify from 'dompurify';
import NuxeoServerVersion from 'nuxeo/lib/server-version';
import Swal from 'sweetalert2';

import ServiceWorkerBridge from '../service-worker-bridge';

function loadPage(serviceWorker) {
  let position;

  const startLoadingHR = () => new Promise((resolve) => {
    const a = $('a#hot-reload-button');
    position = a.position();
    $('#loading').css({
      display: 'block',
      top: position.top - 5,
      left: position.left - 50,
    });
    resolve();
  });

  const startLoadingRS = () => new Promise((resolve) => {
    const a = $('a#restart-button');
    position = a.position();
    $('#loading').css({
      display: 'block',
      top: position.top - 5,
      left: position.left - 50,
    });
    resolve();
  });

  const stopLoading = (error) => {
    $('#loading').css('display', 'none');
    if (error instanceof Error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: `Something went wrong! (${error})`,
        footer: '<a href>Why do I have this issue?</a>'
      });
    }
  };

  const showDependencyError = (deps) => {
    let nuxeoctlCommand = 'nuxeoctl mp-install';
    deps.forEach((dep) => {
      const li = document.createElement('li');
      li.textContent = dep;
      $('#deps-list').append(li);
      nuxeoctlCommand += ` ${dep}`;
    });
    $('div.nuxeoctl-command').append(nuxeoctlCommand);
    $('div.shade').show();
    $('div.deps-popup').show();
    const msgHeight = document.getElementsByClassName('deps-popup')[0].offsetHeight;
    const htmlHeight = $('html').height();
    if (msgHeight > 360) {
      const heightDiff = msgHeight - 360;
      $('html').css('height', htmlHeight + heightDiff);
    } else {
      $('html').css('height', 'auto');
    }
  };

  const hideDependencyError = () => new Promise((resolve) => {
    $('deps-list').empty();
    $('div.nuxeoctl-command').empty();
    $('div.shade').hide();
    $('div.deps-popup').hide();
    resolve();
  });

  let connectUrl;

  const studioPackageFound = (packageName) => {
    $('#no-studio-buttons').css('display', 'none');
    $('#studio').css('display', 'flex');
    $('#studio-buttons').css('display', 'block');
    if (serviceWorker.designerLivePreview.isEnabled()) {
      $('#designer-live-preview-button').addClass('enabled');
      $('#designer-live-preview-button').removeClass('disabled');
    } else {
      $('#designer-live-preview-button').addClass('disabled');
      $('#designer-live-preview-button').removeClass('enabled');
    }

    const packageLocation = new URL(
      `/nuxeo/site/studio/ide?project=${packageName}`,
      connectUrl
    ).toString();
    $('#log-into-studio').attr(
      'href',
      new URL('/nuxeo', connectUrl).toString()
    );
    $('#studio').click(() => {
      serviceWorker.browser.loadNewExtensionTab(packageLocation);
    });
    $('#hot-reload-button').click(() => {
      startLoadingHR()
        .then(() => serviceWorker.studioHotReloader.reload())
        .then(stopLoading)
        .catch(stopLoading);
    });
    $('#designer-live-preview-button').click(() => {
      serviceWorker.designerLivePreview
        .toggle(packageName)
        .then((enabled) => (enabled
          ? { beforeClass: 'enabled', afterClass: 'disabled' }
          : { beforeClass: 'disabled', afterClass: 'enabled' }
        ))
        .then(({ beforeClass, afterClass }) => {
          $('#designer-live-preview-button').removeClass(beforeClass);
          $('#designer-live-preview-button').addClass(afterClass);
        })
        // eslint-disable-next-line no-unused-vars
        .catch((error) => {
          console.error(error);
          $('#designer-livepreview-message').css('display', 'block');
          setTimeout(() => {
            $('#designer-livepreview-message').css('display', 'none');
          }, 5000);
        });
    });
    $('#force-hot-reload-button').click(() => {
      hideDependencyError()
        .then(startLoadingHR)
        .then(() => serviceWorker
          .studioHotReloader
          .reload(false))
        .then(stopLoading)
        .catch(stopLoading);
    });
    $('#cancel-button').click(() => {
      hideDependencyError()
        .then(() => serviceWorker.studioHotReloader.reset())
        .catch((error) => console.error(error));
    });
  };

  const noStudioPackageFound = () => {
    $('#studio, #studio-buttons').css('display', 'none');
    $('#no-studio-buttons').css('display', 'block');
    $('#message').css('display', 'none');
    $('#nopkg').css('display', 'block');
    $('#studio, #hot-reload-button').click(() => {
      serviceWorker.desktopNotifier.notify(
        'no_studio_project',
        'No associated Studio project',
        "If you'd like to use this function, please associate your Nuxeo server with a studio project",
        '../images/access_denied.png'
      );
    });
    setTimeout(() => {
      $('#nopkg');
    }, 5000);
  };

  const registerLink = (element, url) => {
    $(element).click(() => {
      serviceWorker.serverLocator.loadNewExtensionTab(url);
    });
  };

  const checkDependencyMismatch = () => {
    const dependenciesMismatch = serviceWorker.studioHotReloader.dependenciesMismatch();
    if (
      dependenciesMismatch.length > 0
    ) {
      showDependencyError(dependenciesMismatch);
    } else {
      hideDependencyError();
    }
  };

  const adjustStorageButtons = () => {
    $('.highlight-option').hide();
    $('#save').css('right', -15);
    $('#save').css('top', 5);
    $('#reset').css('right', -37);
    $('#reset').css('top', 5);
  };

  serviceWorker.connectLocator.url().then((url) => {
    connectUrl = url;

    $(document).ready(() => {
      const browserVendor = serviceWorker.buildInfo.browserVendor();
      if (browserVendor === 'Firefox') {
        adjustStorageButtons();
      }

      // For chrome browser, the designer live preview is enable
      // for version upper 72
      $('#designer-livepreview-need-update').hide();
      if (browserVendor === 'Chrome') {
        const version = parseInt(
          /(Firefox|Chrome)\/(?<version>[0-9\.]*)/g
            .exec(navigator.userAgent)
            .groups.version.split('.')[0]
        );
        if (version < 72) {
          $('#designer-livepreview').hide();
          $('#designer-livepreview-need-update').show();
        }
      }

      $('#searchclear').click(() => {
        $('#search').val('');
        $('.no-result').css('display', 'none');
        $('#search-results').empty();
        $('body').css('overflow-y', 'hidden');
        $('html').outerHeight(height + 66);
      });

      $('#nxql-clear').click(() => {
        $('#nxql-docid').val('');
      });

      $('#logo').click(() => {
        $('#connect-url').toggle();
      });

      if (
        connectUrl.hostname !== 'connect.nuxeo.com'
      ) {
        $('#connect-url-input').val(
          connectUrl.toString()
        );
      }

      serviceWorker.browserStore.get({ highlight: true }, (res) => {
        $('#highlight-input').prop('checked', res.highlight);
      });

      $('#save').click(() => {
        const input = $('#connect-url-input').val();
        const highlight = $('#highlight-input').prop('checked');

        const inputPromise = input.length > 0
          ? serviceWorker.connectLocator.url(input).then(() => $('#connect-url').hide())
          : Promise.resolve();

        const highlightPromise = serviceWorker.browserStore.set({ highlight });

        Promise.all([inputPromise, highlightPromise]).then(() => {
          Swal.fire('Your changes have been saved.');
        });
      });

      $('#reset').click(() => {
        Swal.fire({
          title: 'Reset Options',
          text: 'Click Reset to reset all options to default settings.',
          showCancelButton: true,
          confirmButtonText: 'Reset',
          cancelButtonText: 'Cancel',
        }).then((result) => {
          if (result.isConfirmed) {
            serviceWorker.browserStore.set(
              { connectUrl: 'https://connect.nuxeo.com', highlight: true },
              () => {
                $('#connect-url-input').val('');
                $('#connect-url').hide();
                $('#highlight-input').prop('checked', true);
              }
            );
          }
        });
      });

      checkDependencyMismatch();

      // being resolved in promise for handles, better be bound in a dedicated class I think
      let onUI;
      let repository = 'default';
      let serverUrl;

      const regexes = {};
      regexes.uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      regexes.repo = /[A-Za-z_\.0-9-]+/;
      regexes.path = /\/[A-Za-z\.0-9_\- \/%~:?#'"]+/;

      regexes.jsf = {};
      regexes.jsf.nxpath = new RegExp(
        `(?:nxpath/(?<repoPath>${regexes.repo.source})(?<path>${regexes.path.source}))`
      );
      regexes.jsf.nxdoc = new RegExp(
        `(?:nxdoc/(?<repoId>${regexes.repo.source})/(?<docid>${regexes.uuid.source}))`
      );
      regexes.jsf.doc = new RegExp(
        `/(${regexes.jsf.nxpath.source}|${regexes.jsf.nxdoc.source})`
      );

      regexes.ui = {};
      regexes.ui.browse = new RegExp('(?:browse(?<path>/.+?(?=\\?|$)))');
      regexes.ui.docid = new RegExp(
        `(?:doc[\/A-Za-z_\.0-9]+(?<docid>${regexes.uuid.source}))`
      );
      regexes.ui.doc = new RegExp(
        `/(?:repo/(?<repo>${regexes.repo.source})|)ui/#!/(?:${regexes.ui.browse.source}|${regexes.ui.docid.source})`
      );

      function doGetJson(path) {
        serviceWorker.browserStore.get({ highlight: true }).then((res) => {
          if (res.highlight) {
            serviceWorker.documentBrowser.jsonOf(repository, path)
              .then(openJsonWindow);
          } else {
            const jsonPath = `api/v1/repo/${repository}/${path}?enrichers.document=acls,permissions&properties=*`;
            serviceWorker.serverLocator.loadNewExtensionTab(jsonPath, true);
          }
        });
      }

      function getJsonFromPath(input) {
        doGetJson(`path/${decodeURIComponent(input)}`);
      }

      function getJsonFromGuid(input) {
        doGetJson(`id/${input}`);
      }

      serviceWorker.serverConnector
        .runtimeInfo()
        .then((res) => {
          if (!res.nuxeo.user.isAdministrator) {
            $('.buttons').css('display', 'none');
            $('.toggles').css('display', 'none');
          }
        })
        .catch((e) => {
          console.log(e);
        });

      const checkStudioPkg = `import groovy.json.JsonOutput;
    import org.nuxeo.connect.packages.PackageManager;
    import org.nuxeo.connect.client.we.StudioSnapshotHelper;
    import org.nuxeo.ecm.admin.runtime.RuntimeInstrospection;
    import org.nuxeo.runtime.api.Framework;

    def pm = Framework.getService(PackageManager.class);
    def snapshotPkg = StudioSnapshotHelper.getSnapshot(pm.listRemoteAssociatedStudioPackages());
    def pkgName = snapshotPkg == null ? null : snapshotPkg.getName();
    def bundles = RuntimeInstrospection.getInfo();

    println JsonOutput.toJson([studio: pkgName]);`;

      serviceWorker.serverConnector
        .executeScript(checkStudioPkg)
        .then((text) => {
          const pkgName = JSON.parse(text).studio;
          if (pkgName) {
            studioPackageFound(pkgName);
          } else {
            noStudioPackageFound();
          }
        })
        .catch((error) => {
          console.error(error);
          noStudioPackageFound();
        });

      serviceWorker.serverConnector.executeOperation('Traces.ToggleRecording', { readOnly: true })
        .then((response) => {
          if (response.value) {
            $('#traces-button').addClass('enabled');
            $('#traces-button').removeClass('disabled');
          } else {
            $('#traces-button').addClass('disabled');
            $('#traces-button').removeClass('enabled');
          }
        });

      serviceWorker.serverConnector.runtimeInfo()
        .then((info) => {
          $('#platform-version').text(` ${info.nuxeo.serverVersion.version}`);
          return info;
        })
        .then((info) => {
          const nuxeoServerVersion = NuxeoServerVersion.create(info.nuxeo.serverVersion.version);
          const lts2019 = NuxeoServerVersion.create('10.10');
          if (nuxeoServerVersion.lt(lts2019)) {
            serviceWorker.browserStore.set({ highlight: true }, () => {
              adjustStorageButtons();
            });
          }
          return info;
        })
        .then((info) => {
          serverUrl = info.rootUrl.replace(/\/$/, '');
          return serverUrl;
        })
      // eslint-disable-next-line no-shadow
        .then((serverUrl) => {
          const serverString = DOMPurify.sanitize(serverUrl);
          $('div.server-name-url').text(serverString);
          return serverUrl;
        })
      // eslint-disable-next-line no-shadow
        .then((serverUrl) => registerLink(
          '#automation-doc',
          serverUrl.concat('/site/automation/doc/')
        ))
      // eslint-disable-next-line no-shadow
        .then((serverUrl) => {
          const jsfMatchs = regexes.jsf.doc.exec(serverUrl);
          const uiMatchs = regexes.ui.doc.exec(serverUrl);

          function exportCurrentLink(docPathOrId) {
            $('#export-current').css('display', 'block');
            $('#export-current').click(() => {
              if (regexes.uuid.test(docPathOrId)) {
                getJsonFromGuid(docPathOrId);
              } else if (docPathOrId.startsWith('/')) {
                getJsonFromPath(docPathOrId);
              }
            });
          }

          if (jsfMatchs || uiMatchs) {
            onUI = !!uiMatchs;
            const groups = (jsfMatchs || uiMatchs).groups;
            repository = groups.repoPath || groups.repoId || groups.repo || 'default';
            if (groups.path || groups.docid) {
              exportCurrentLink(groups.path || groups.docid);
            }
          }
          return serverUrl;
        })
      // eslint-disable-next-line no-shadow
        .then((serverUrl) => {
          const checkAddons = `import groovy.json.JsonOutput;
  import org.nuxeo.connect.packages.PackageManager;
  import org.nuxeo.runtime.api.Framework;

  def pm = Framework.getService(PackageManager.class);
  def addons = pm.listInstalledPackagesNames();

  println JsonOutput.toJson([installed: addons]);`;

          serviceWorker.serverConnector.executeScript(checkAddons)
            .then((text) => {
              let playgroundUrl = '';
              if (JSON.parse(text).installed.includes('nuxeo-api-playground')) {
                playgroundUrl = serverUrl
                  .concat('/playground/#/')
                  .concat(serverUrl);
              } else {
                playgroundUrl = 'http://nuxeo.github.io/api-playground/#/'.concat(
                  serverUrl
                );
              }
              if (!JSON.parse(text).installed.includes('nuxeo-web-ui')) {
                $('#designer-livepreview').hide();
              }
              return registerLink('#api-playground', playgroundUrl);
            });
        });

      registerLink('#nuxeo-status', 'https://status.nuxeo.com/');
      registerLink('#explorer', 'https://explorer.nuxeo.com');
      registerLink('#nxql', 'https://doc.nuxeo.com/nxdoc/nxql/');
      registerLink(
        '#el-scripting',
        'https://doc.nuxeo.com/nxdoc/understand-expression-and-scripting-languages-used-in-nuxeo/'
      );
      registerLink(
        '#mvel',
        'https://doc.nuxeo.com/nxdoc/use-of-mvel-in-automation-chains/'
      );
      registerLink(
        '#workflow-variables',
        'https://doc.nuxeo.com/nxdoc/variables-available-in-the-automation-context/'
      );
      registerLink(
        '#escalation-rules',
        'https://doc.nuxeo.com/nxdoc/escalation-service/'
      );
      registerLink(
        '#nuxeo-elements',
        'https://www.webcomponents.org/author/nuxeo'
      );
      registerLink(
        '#nuxeo-layouts',
        'http://showcase.nuxeo.com/nuxeo/layoutDemo/'
      );
      registerLink(
        '#style-guide',
        'http://showcase.nuxeo.com/nuxeo/styleGuide/'
      );

      let height = $('html').height();

      function showSearchResults(icon, title, path, uid, vMajor, vMinor) {
        const iconLink = serverUrl.concat(icon);
        const iconTag = document.createElement('td');
        const image = document.createElement('img');
        const titleTag = document.createElement('td');
        const jsonTag = document.createElement('td');
        const jsonIcon = $('.json-icon-large').clone();
        const pathTag = document.createElement('td');
        const searchResult = document.createElement('tr');
        const searchResultPath = document.createElement('tr');
        iconTag.setAttribute('colspan', '1');
        iconTag.className = 'icon';
        image.className = 'doc-icon';
        image.setAttribute('src', `${iconLink}`);
        image.setAttribute('alt', 'icon');
        iconTag.appendChild(image);
        titleTag.setAttribute('colspan', '18');
        titleTag.setAttribute('title', 'Open document in another tab');
        titleTag.className = 'doc-title';
        titleTag.id = `${uid}`;
        if (
          typeof vMajor !== 'undefined'
                && typeof vMinor !== 'undefined'
                && (vMajor !== 0 || vMinor !== 0)
        ) {
          titleTag.textContent = `${title} `;
          const span = document.createElement('span');
          span.className = 'version';
          span.textContent = `v${vMajor}.${vMinor}`;
          titleTag.appendChild(span);
        } else {
          titleTag.textContent = `${title}`;
        }
        jsonTag.setAttribute('colspan', '1');
        jsonTag.className = 'icon';
        jsonIcon.removeClass('json-icon-large');
        jsonIcon.addClass('json-icon');
        jsonIcon.attr('id', `${uid}`);
        $('title', jsonIcon).text('View document JSON');
        jsonTag.appendChild(jsonIcon[0]);
        pathTag.setAttribute('colspan', '20');
        pathTag.className = 'doc-path';
        pathTag.textContent = `${path}`;
        searchResult.className = 'search-result';
        searchResult.appendChild(iconTag);
        searchResult.appendChild(titleTag);
        searchResult.appendChild(jsonTag);
        searchResultPath.appendChild(pathTag);
        $('tbody').append(searchResult);
        $('tbody').append(searchResultPath);
      }

      function docSearch(nxqlQuery, input) {
        serviceWorker.serverConnector
          .query({ query: nxqlQuery, sortBy: 'dc:modified' })
          .then((res) => {
            if (res.entries.length > 0) {
              $('.no-result').css('display', 'none');
              $('body').css('overflow-y', 'auto');
              const thead = document.createElement('thead');
              const tr = document.createElement('tr');
              const th = document.createElement('th');
              const tbody = document.createElement('tbody');
              th.setAttribute('colspan', '20');
              th.textContent = 'Search Results:';
              tr.appendChild(th);
              thead.appendChild(tr);
              $('#search-results').append(thead);
              $('#search-results').append(tbody);
              $('table').css('margin-top', '20px');
              res.entries.forEach((doc) => {
                $('html').outerHeight($('html').height());
                const icon = doc.properties['common:icon'];
                const title = doc.properties['dc:title'];
                const re = /^(.*[\/])/;
                const path = re.exec(doc.path)[1];
                const uid = doc.uid;
                const vMajor = doc.properties['uid:major_version'];
                const vMinor = doc.properties['uid:minor_version'];
                showSearchResults(icon, title, path, uid, vMajor, vMinor);
              });
              $('.doc-title').click((event) => {
                const docPath = onUI ? `ui/#!/doc/${event.target.id}` : `nxdoc/default/${event.target.id}/view_documents`;
                serviceWorker.serverLocator.loadNewExtensionTab(docPath, true);
              });
              $('.json-icon').click((event) => {
                event.preventDefault();
                getJsonFromGuid(event.target.id);
              });
            } else {
              const searchTerm = DOMPurify.sanitize(input);
              $('.no-result span').text(searchTerm);
              $('.no-result').css('display', 'block');
            }
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
          })
          .catch((error) => {
            console.error(error);
            error.response.json().then((json) => {
              serviceWorker.desktopNotifier.notify(
                'error',
                json.code,
                json.message,
                '../images/access_denied.png'
              );
              $('#loading-gif').css('display', 'none');
              $('#search').css('text-indent', '5px');
            });
          });
      }

      let openJsonWindow = (jsonObject) => {
        const jsonString = JSON.stringify(jsonObject, undefined, 2);
        serviceWorker.jsonHighlighter.input(DOMPurify.sanitize(jsonString));
        serviceWorker.serverLocator.loadNewExtensionTab('json/index.html');
      };

      $('#restart-button').on('click', () => {
        Swal.fire({
          title: 'Warning!',
          text: 'Are you sure you want to restart the server?',
          showCancelButton: true,
          confirmButtonText: 'Restart',
          cancelButtonText: 'Cancel',
        }).then((result) => {
          if (result.isConfirmed) {
            startLoadingRS()
              .then(() => serviceWorker.serverConnector.restart())
              .then(stopLoading)
              .catch(stopLoading);
          }
        });
      });

      $('#reindex-repo').click(() => {
        $('#reindex-form').css('display', 'none');
        $('#reindex-repo').button('toggle');
      });
      $('#reindex-nxql').click(() => {
        $('#reindex-form').css('display', 'block');
        $('#reindex-repo').button('toggle');
      });
      $('#reindex').click(() => {
        if ($('#reindex-repo').hasClass('active')) {
          serviceWorker.repositoryIndexer
            .reindex();
        } else {
          $('#reindex-form').show();
          const input = $('#reindex-input').val();
          $('#reindex-input').val('');
          const matchGroupId = regexes.uuid.exec(input);
          if (matchGroupId) {
            serviceWorker.repositoryIndexer
              .reindexDocId(input);
          } else {
            serviceWorker.repositoryIndexer
              .reindexNXQL(input);
          }
        }
      });

      $('#nxql-docid').keydown((e) => {
        if (e.which === 13) {
          e.preventDefault();
          $('#reindex-nxql-doc').click();
        }
      });

      $('#traces-button').click(() => {
        serviceWorker.serverConnector
          .executeOperation('Traces.ToggleRecording', { readOnly: false })
          .then((response) => {
            if (response.value) {
              $('#traces-button').addClass('enabled');
              if ($('#traces-button').hasClass('disabled')) {
                $('#traces-button').removeClass('disabled');
              }
            } else {
              $('#traces-button').addClass('disabled');
              if ($('#traces-button').hasClass('enabled')) {
                $('#traces-button').removeClass('enabled');
              }
            }
          })
          .catch(() => {
            serviceWorker.serverConnector
              .executeOperation('Traces.ToggleRecording', { readOnly: true })
              .then((response) => {
                if (response.value) {
                  $('#traces-button').addClass('enabled');
                  $('#traces-button').removeClass('disabled');
                } else {
                  $('#traces-button').addClass('disabled');
                  $('#traces-button').removeClass('enabled');
                }
              });
          });
      });

      $('#search').keydown(() => {
        $('#loading-gif').css({ display: 'inline' });
        $('#search').css('text-indent', '23px');
      });

      $('#search').keyup(
        debounce(() => {
          $('#search-results').empty();
          const pathPattern = /^\//;
          const input = $('#search').val();
          if (input === '') {
            $('.no-result').css('display', 'none');
            $('#search-results').empty();
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
            $('body').css('overflow-y', 'hidden');
            $('html').css('height', 'auto');
          } else if (regexes.uuid.test(input)) {
            getJsonFromGuid(input);
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
          } else if (pathPattern.test(input)) {
            getJsonFromPath(input);
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
          } else if (
            input.toUpperCase().indexOf('SELECT ') !== -1
                    && input.toUpperCase().indexOf(' FROM ') !== -1
          ) {
            const query = input.replace(/'/g, '"');
            docSearch(query, input);
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
          } else {
            let searchTerm = input;
            if (searchTerm.indexOf('_') > -1) {
              searchTerm = searchTerm.replace(/_/g, '&UNDERSCORE');
            }
            if (searchTerm.indexOf('\\') > -1) {
              searchTerm = searchTerm.replace('\\', '&BACKSLASH');
            }
            if (searchTerm.indexOf('"') > -1) {
              searchTerm = searchTerm.replace('"', '\\"');
            }
            if (searchTerm.indexOf("'") > -1) {
              searchTerm = searchTerm.replace("'", "\\'");
            }
            const jsonQuery = `SELECT * FROM Document WHERE ecm:fulltext = "${searchTerm}"`;
            docSearch(jsonQuery, input);
            $('#loading-gif').css('display', 'none');
            $('#search').css('text-indent', '5px');
          }
        }, 1000)
      );

      function konamiCanada(cb) {
        let input = '';
        const key = '38384040373937396665';
        document.addEventListener('keydown', (e) => {
          input += `${e.keyCode}`;
          if (input === key) {
            return cb();
          }
          if (!key.indexOf(input)) return true;
          input = `${e.keyCode}`;
          return true;
        });
      }

      function canada() {
        $('#logo').css('background-image', 'url("../images/icon.png")');
        $('a.button:hover').css('background', '#910B0B');
        $('#search-term').css('color', '#FE0000');
        $('body').css('color', '#FE0000');
        $('body').css('background-color', '#fff');
        $('.server-name').css('color', '#FE0000');
        $('a.button').css('background', '#FE0000');
        $('.useful-links').css('color', '#FE0000');
        $('.useful-link').css('color', '#FE0000');
        $('.nav-link').css('color', '#FE0000');
        $('#search').attr(
          'placeholder',
          'Sorry, please enter a search term, eh?'
        );
        $('::-webkit-input-placeholder').css('color', '#FE0000');
        $('#about').text('About');
      }

      function k() {
        $('#k').css('display', 'block');
        setInterval(() => {
          const imgUrl = $('#k').css('background-image');
          console.log(imgUrl.indexOf('1_'));
          if (imgUrl.indexOf('1_') === -1) {
            $('#k').css('background-image', 'url("../images/1_.png")');
          } else {
            $('#k').css('background-image', 'url("../images/1.png")');
          }
        }, 200);
        setTimeout(() => {
          $('#k').animate({ left: '-150%' }, 500);
          setTimeout(() => {
            canada();
          }, 500);
        }, 2500);
      }

      konamiCanada(() => {
        k();
        console.log('O Canada!');
      });
    });
    return serviceWorker;
  });
}

const serviceWorker = new ServiceWorkerBridge();
serviceWorker
  .asPromise()
  .then((worker) => {
    worker.developmentMode
      .asPromise().then(() => {
        window.reloadPopup = () => serviceWorker.asPromise().then(loadPage);
        window.serviceWorker = worker;
      })
      .catch((error) => console.error(error));
    return worker;
  })
  .then(loadPage)
  .catch((e) => {
    console.error(e);
  });
