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
