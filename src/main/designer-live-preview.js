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

class DesignerLivePreview {
  // eslint-disable-next-line no-unused-vars
  constructor(worker) {
    this.worker = worker;

    // Set defaukt properties for the class
    this.userCookies = '';
    this.redirectedUrls = {};

    // Bind methods
    this.addCookieHeaderForConnectRequest = this.addCookieHeaderForConnectRequest.bind(this);
    this.addNewResources = this.addNewResources.bind(this);
    this.disable = this.disable.bind(this);
    this.enable = this.enable.bind(this);
    this.isEnabled = this.isEnabled.bind(this);
    this.redirectRequestToConnectIfNeeded = this.redirectRequestToConnectIfNeeded.bind(this);
    this.revertToDefault = this.revertToDefault.bind(this);
    this.storeRedirectedUrlsLocally = this.storeRedirectedUrlsLocally.bind(this);
  }

  storeRedirectedUrlsLocally(rootUrl, json) {
    Object.keys(json).forEach((basePath) => {
      const nuxeoInstanceBasePath = basePath.replace(
        /^\/(nuxeo\.war\/?\/)?/,
        ''
      );

      const files = Object.keys(json[basePath]);
      if (files.length > 0) {
        files.forEach((resource) => {
          const nuxeoInstanceResource = `${rootUrl}${nuxeoInstanceBasePath}/${resource}`;
          // FIXME Warning this replace should be removed (needs fixing on connect side)
          const connectResource = json[basePath][resource].replace(
            /http:\/\//,
            'https://'
          );

          this.redirectedUrls[nuxeoInstanceResource] = connectResource;
        });
      }
    });
  }

  redirectRequestToConnectIfNeeded(details) {
    // Sometimes, URLs contain '//' which would prevent us from finding the url for redirect
    const nuxeoInstanceUrl = details.url.replace(/([^:])\/\/+/g, '$1/');
    const redirectUrl = this.redirectedUrls[nuxeoInstanceUrl];

    if (!redirectUrl) {
      return {};
    }

    return {
      redirectUrl,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  addCookieHeaderForConnectRequest(details) {
    const requestHeaders = details.requestHeaders;

    // FIXME: behavior chrome/firefox not equivalent here. Chrome does not seem to send cookies
    //        with requests originated from html imports
    const cookieHeader = requestHeaders.filter((h) => h.name === 'Cookie');
    if (cookieHeader.length > 0) {
      // Cookies are already set by the browser, we have nothing to do.
      return Promise.resolve({});
    }

    // We need to add cookies as they are stripped by browser
    requestHeaders.push({
      name: 'Cookie',
      value: this.userCookies,
    });
    return {
      requestHeaders,
    };
  }

  addNewResources(details) {
    // Detects when Studio users save changes to a new resource in Designer
    if (details.method !== 'POST') {
      return;
    }
    const resourcePaths = details.requestBody.formData.path;
    resourcePaths.forEach((resourcePath) => {
      resourcePath = resourcePath.replace(/\/\//, '/');
      const connectResource = `${details.url}${resourcePath}`;
      resourcePath = resourcePath.replace(/^\/(nuxeo\.war\/?\/)?/, '');
      const nuxeoResource = `${this.nuxeo.baseUrl}${resourcePath}`;
      // If there is no redirected URL to the customized resource yet, add one
      if (!(nuxeoResource in this.redirectedUrls)) {
        this.redirectedUrls[nuxeoResource] = connectResource;
        console.log(`New resource added: ${resourcePath}`);
      }
    });
  }

  revertToDefault(details) {
    // Detects when Studio users revert their customizations to default
    if (details.method !== 'DELETE') {
      return;
    }
    const key = Object.keys(this.redirectedUrls).find(
      (k) => this.redirectedUrls[k] === details.url
    );
    // Removes redirected URLs to reverted customizations to avoid 404 in Web UI on refresh
    if (key) {
      delete this.redirectedUrls[key];
      console.log(`Reverted to default: ${key}`);
    }
  }

  enable(projectName) {
    const cleanupFunctions = [];
    const connectLoader = (connectUrl) => chrome.cookies
      .getAll({ domain: connectUrl.hostname })
      .then((cookies) => cookies
        .map((x) => `${x.name}=${x.value}`)
        .join('; '))
      .then((cookieHeader) => {
        this.userCookies = cookieHeader;
      })
      .then(() => new URL(
        `/nuxeo/site/studio/v2/project/${projectName}/workspace/ws.resources`,
        connectUrl
      ))
      .then((workspaceUrl) => ([connectUrl.toString(), workspaceUrl.toString()]));

    return Promise
      .all([
        this.disable(), // Ensure we don't have multiple listeners
        this.worker.connectLocator // Retrieve workspace location
          .url()
          .then(connectLoader),
        Promise.resolve(this.worker.serverConnector.rootUrl) // Provide nuxeo location
      ])
      // eslint-disable-next-line no-unused-vars
      .then(([_, [connectLocation, workspaceLocation], nuxeoLocation]) => Promise
        .resolve()
        .then(() => { // redirect connect requests to nuxeo side
          chrome.webRequest.onBeforeRequest.addListener(
            this.redirectRequestToConnectIfNeeded,
            {
              urls: [`${connectLocation}/*`],
            },
            ['blocking']
          );
          cleanupFunctions.push(() => chrome
            .webRequest
            .onBeforeRequest
            .removeListener(this.redirectRequestToConnectIfNeeded));
        })
        .then(() => { // add new resources to be redirected
          chrome.webRequest.onBeforeRequest.addListener(
            this.addNewResources,
            {
              urls: [workspaceLocation],
            },
            ['requestBody']
          );
          cleanupFunctions.push(() => chrome
            .webRequest
            .onBeforeRequest
            .removeListener(this.addNewResources));
        })
        .then(() => { // add cookie header for connect request
          const extraInfoSpec = ['blocking', 'requestHeaders'];
          if (
            Object.prototype.hasOwnProperty.call(
              chrome.webRequest.OnBeforeSendHeadersOptions,
              'EXTRA_HEADERS'
            )
          ) {
            extraInfoSpec.push('extraHeaders');
          }
          // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/vYIaeezZwfQ
          chrome.webRequest.onBeforeSendHeaders.addListener(
            this.addCookieHeaderForConnectRequest,
            {
              urls: [`${connectLocation}/*`],
            },
            extraInfoSpec
          );
          cleanupFunctions.push(() => chrome
            .webRequest
            .onBeforeSendHeaders
            .removeListener(this.addCookieHeaderForConnectRequest));
        })
        .then(() => { // restore default
          chrome.webRequest.onCompleted.addListener(
            this.revertToDefault,
            {
              urls: [`${connectLocation}/*`],
            },
            ['responseHeaders']
          );
          cleanupFunctions.push(() => chrome
            .webRequest
            .onCompleted
            .removeListener(this.revertToDefault));
        })
        .then(() => fetch( // fetch connect workspace to get redirected URLs
          workspaceLocation, {
            credentials: 'include',
          }
        ))
        .then((response) => {
          if (!response.ok || response.url !== workspaceLocation) {
            throw new Error('Not logged in to connect.');
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Unexpected content type');
          }
          return response.json();
        })
        .then((jsonData) => {
          console.log(`Retrieved ${JSON.stringify(jsonData)} from ${workspaceLocation}`);
          this.storeRedirectedUrlsLocally(nuxeoLocation, jsonData);
        })
        .then(() => {
          console.log(`Enabled Designer Live Preview for ${projectName} from ${connectLocation} to ${nuxeoLocation}`);
          return true;
        })
        .then((status) => {
          this.cleanupFunctions = cleanupFunctions;
          return status;
        }));
  }

  // eslint-disable-next-line no-unused-vars
  disable(projectName) {
    return new Promise((resolve) => {
      if (!this.cleanupFunctions) {
        return resolve();
      }
      while (this.cleanupFunctions.length > 0) {
        const cleanupFunction = this.cleanupFunctions.pop();
        cleanupFunction();
      }
      this.cleanupFunctions = null;
      return resolve();
    });
  }

  isEnabled() {
    return Promise.resolve(Object.keys(this.redirectedUrls).length !== 0);
  }
}

export default DesignerLivePreview;
