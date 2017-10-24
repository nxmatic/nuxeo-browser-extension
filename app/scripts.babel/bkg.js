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

const nxPattern = /(^https?:\/\/[A-Za-z_\.0-9:-]+\/[A-Za-z_\.0-9-]+\/)(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/[A-Za-z_\.0-9-]+)\/[A-Za-z_\.0-9-]+|view_documents\.faces|ui\/#!\/\w+\/?|view_domains\.faces|home\.html|view_home\.faces)/;

const window = window || {}; // eslint-disable-line no-use-before-define
window.app = window.app || {};
const studioExt = window.studioExt = window.studioExt || {};

let dependencyMismatch = false;
let dependencies;

const notification = window.notification = (idP, titleP, messageP, img, interaction) => {
  try {
    chrome.notifications.create(idP, {
      type: 'basic',
      title: titleP,
      message: messageP,
      iconUrl: img,
      requireInteraction: interaction,
    }, () => {
      console.log(chrome.runtime.lastError);
    });
  } catch (err) {
    chrome.notifications.create(idP, {
      type: 'basic',
      title: titleP,
      message: messageP,
      iconUrl: img,
    }, () => {
      console.log(chrome.runtime.lastError);
    });
  }
};

/**
 * XXX Temp solution in order to be able to force Auth
 */
const newNuxeo = window.newNuxeo = (opts) => {
  const _opts = opts || {};
  if (window.app.auth) {
    _opts.auth = window.app.auth;
  }

  return new Nuxeo(_opts);
};

const checkDependencies = `import groovy.json.JsonOutput;
  import org.nuxeo.connect.packages.PackageManager;
  import org.nuxeo.connect.packages.dependencies.TargetPlatformFilterHelper;
  import org.nuxeo.connect.client.we.StudioSnapshotHelper;
  import org.nuxeo.ecm.admin.runtime.PlatformVersionHelper;
  import org.nuxeo.ecm.admin.runtime.RuntimeInstrospection;
  import org.nuxeo.runtime.api.Framework;

  def pm = Framework.getLocalService(PackageManager.class);
  def snapshotPkg = StudioSnapshotHelper.getSnapshot(pm.listRemoteAssociatedStudioPackages());
  def nxInstance = PlatformVersionHelper.getPlatformFilter();

  def pkgName = snapshotPkg == null ? null : snapshotPkg.getName();
  def targetPlatform = snapshotPkg == null ? null : snapshotPkg.getTargetPlatforms();
  def match = true;
  if (!TargetPlatformFilterHelper.isCompatibleWithTargetPlatform(snapshotPkg, nxInstance)) {
    match = false;
  }
  def dependencies = snapshotPkg == null ? null : snapshotPkg.getDependencies();

  println JsonOutput.toJson([studio: pkgName, nx: nxInstance, studioDistrib: targetPlatform, match: match, deps: dependencies]);`;

const defaultServerError = {
  id: 'server_error',
  title: 'Server Error',
  message: 'Please ensure that Dev Mode is activated.',
  imageUrl: '../images/access_denied.png',
  interaction: false,
};

const getCurrentTabUrl = window.getCurrentTabUrl = (callback) => {
  const queryInfo = {
    active: true,
    currentWindow: true,
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    const [tab] = tabs;
    const matchGroups = nxPattern.exec(tab.url);
    if (!matchGroups) {
      callback(null);
      return;
    }

    const [, url] = matchGroups;
    window.studioExt.server = {
      url,
      tabId: tab.id,
    };

    callback(url);
  });
};

function newDefaultNuxeo() { return newNuxeo({ baseURL: window.studioExt.server.url }); }

function handleErrors(error, serverError) {
  error.response.json().then((json) => {
    const msg = json.message;
    const err = error.response.status;
    if (msg == null) {
      notification('no_hot_reload',
        'Hot Reload Operation not found.',
        'Your current version of Nuxeo does not support the Hot Reload function.',
        '../images/access_denied.png',
        false);
    } else if (err === 401) {
      notification('access_denied',
        'Access denied!',
        'You must have Administrator rights to perform this function.',
        '../images/access_denied.png',
        false);
    } else if (err >= 500) {
      notification(serverError.id,
        serverError.title,
        serverError.message,
        serverError.imageUrl,
        serverError.interaction);
    } else if (err >= 300 && err < 500) {
      notification('bad_login',
        'Bad Login',
        'Your Login and/or Password are incorrect',
        '../images/access_denied.png',
        false);
    } else {
      notification('unknown_error',
        'Unknown Error',
        'An unknown error has occurred. Please try again later.',
        '../images/access_denied.png',
        false);
    }
  });
}

window.executeScript = (script, stopSearch, callback) => {
  const blob = new Nuxeo.Blob({
    content: new Blob([script], {
      type: 'text/plain',
    }),
    name: 'readPackage.groovy',
    mymeType: 'text/plain',
  });

  newDefaultNuxeo().operation('RunInputScript').params({
    type: 'groovy',
  }).input(blob)
    .execute()
    .then(res => res.text())
    .then(callback)
    .catch((e) => {
      if (stopSearch) {
        stopSearch();
      }
      console.error(e);
    });
};

window.bkgHotReload = (startLoading, stopLoading, validate, showDependencyError) => {
  let nuxeo;
  getCurrentTabUrl((url) => {
    nuxeo = newNuxeo({
      baseURL: url,
    });
    startLoading();
    nuxeo.operation('Service.HotReloadStudioSnapshot')
      .params({
        validate,
      })
      .execute()
      .then((res) => {
        // Error handling for Nuxeo 9.3 and later
        stopLoading();
        if (res.length > 0 && res[0].status && res[0].status === 'success') {
          notification(res[0].status, 'Success!', res[0].message, '../images/nuxeo-128.png', false);
          chrome.tabs.reload(window.studioExt.server.tabId);
        } else if (res.length > 0 && res[0].status && res[0].status === 'error') {
          notification(res[0].status, 'Error', res[0].message, '../images/access_denied.png', false);
        } else if (res.length > 0 && res[0].status && res[0].status === 'updateInProgress') {
          notification(res[0].status, 'Error', res[0].message, '../images/access_denied.png', false);
        } else if (res.length > 0 && res[0].status && res[0].status === 'dependencyMismatch') {
          dependencies = res[0].deps;
          showDependencyError(dependencies);
          dependencyMismatch = true;
        }
      })
      .catch((e) => {
        // Error handling for Nuxeo 9.2 and older
        window.executeScript(checkDependencies, null, (text) => {
          const checkDeps = JSON.parse(text).match;
          let message = '';
          let dependencyError = {};
          if (JSON.parse(text).nx !== JSON.parse(text).studioDistrib[0]) {
            message += `${JSON.parse(text).studio} - ${JSON.parse(text).studioDistrib[0]} cannot be installed on Nuxeo ${JSON.parse(text).nx}.`;
            dependencyError = {
              id: 'dependencyMismatch',
              title: 'Dependency Mismatch',
              message,
              imageUrl: '../images/access_denied.png',
              interaction: true,
            };
          } else {
            dependencyError = defaultServerError;
          }
          if (!checkDeps) {
            stopLoading();
            handleErrors(e, dependencyError);
            const deps = JSON.parse(text).deps;
            if (deps.length > 0) {
              const items = [];
              deps.forEach((dep) => {
                items.push({ title: '', message: dep.name });
              });
              chrome.notifications.create('dependency_check', {
                type: 'list',
                title: 'Check Dependencies',
                message: 'Please check that the following dependencies are installed:',
                items,
                iconUrl: '../images/access_denied.png',
                requireInteraction: true,
              }, () => {
                console.log(chrome.runtime.lastError);
              });
            }
          } else {
            console.log(e);
            startLoading();
            nuxeo.operation('Service.HotReloadStudioSnapshot').execute()
              .then(() => {
                notification('success', 'Success!', 'A Hot Reload has successfully been completed.', '../images/nuxeo-128.png', false);
                chrome.tabs.reload(window.studioExt.server.tabId);
              })
              .catch((er) => {
                handleErrors(er, defaultServerError);
              });
            stopLoading();
          }
        });
      });
  });
};

window.restart = function (startLoadingRS, stopLoading) {
  disableTabExtension();
  let nuxeo;
  getCurrentTabUrl((url) => {
    nuxeo = newNuxeo({
      baseURL: url,
    });
    startLoadingRS();
    nuxeo._http({
      method: 'POST',
      schemas: [],
      enrichers: [],
      fetchProperties: [],
      url: nuxeo._baseURL.concat('site/connectClient/uninstall/restart'),
    })
      .then(() => {
        stopLoading();
        notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png', false);
      })
      .catch((e) => {
        console.log(e);
        e.response.json().then((json) => {
          stopLoading();
          const msg = json.message;
          const err = e.response.status;
          if (msg == null) {
            notification('success', 'Success!', 'Nuxeo server is restarting...', '../images/nuxeo-128.png', false);
            setTimeout(() => {
              chrome.tabs.reload(studioExt.server.tabId);
            }, 4000);
          } else if (err === 401) {
            notification('access_denied',
              'Access denied!',
              'You must have Administrator rights to perform this function.',
              '../images/access_denied.png',
              false);
          } else if (err >= 500) {
            notification('server_error',
              'Server Error',
              'Please check Studio project and/or dependencies for mismatch and ensure that Dev Mode is activated.',
              '../images/access_denied.png',
              false);
          } else {
            notification('unknown_error',
              'Unknown Error',
              'An unknown error has occurred. Please try again later.',
              '../images/access_denied.png',
              false);
          }
        });
      });
  });
};

window.reindex = function () {
  let nuxeo;
  getCurrentTabUrl((url) => {
    nuxeo = newNuxeo({
      baseURL: url,
    });
    nuxeo.operation('Elasticsearch.Index').execute()
      .then(() => {
        notification('success', 'Success!', 'Your repository index is rebuilding.', '../images/nuxeo-128.png', false);
      })
      .catch((e) => {
        console.error(e);
        notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png', false);
      });
  });
};

window.reindexNXQL = function (input) {
  let nuxeo;
  getCurrentTabUrl((url) => {
    nuxeo = newNuxeo({
      baseURL: url,
    });
    nuxeo.operation('Elasticsearch.Index')
      .input(input)
      .execute()
      .then(() => {
        notification('success', 'Success!', 'Your repository index is rebuilding.', '../images/nuxeo-128.png', false);
      })
      .catch((e) => {
        console.error(e);
        notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png', false);
      });
  });
};

window.reindexDocId = function (input) {
  let nuxeo;
  getCurrentTabUrl((url) => {
    nuxeo = newNuxeo({
      baseURL: url,
    });
    nuxeo.operation('Elasticsearch.Index')
      .input(input)
      .execute()
      .then(() => {
        notification('success', 'Success!', 'Your repository index is rebuilding.', '../images/nuxeo-128.png', false);
      })
      .catch((e) => {
        console.error(e);
        notification('error', 'Something went wrong...', 'Please try again later.', '../images/access_denied.png', false);
      });
  });
};

