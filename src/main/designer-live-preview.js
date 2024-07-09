/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable max-classes-per-file */
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

import DeclarativeNetComponents from './declarative-net-engine';
import ServiceWorkerComponent from './service-worker-component';

const BasicAuthenticationHeaderRule = DeclarativeNetComponents.BasicAuthenticationHeaderRule;
const CookieHeaderRule = DeclarativeNetComponents.CookieHeaderRule;
const RedirectRule = DeclarativeNetComponents.RedirectRule;

class DesignerLivePreview extends ServiceWorkerComponent {
  // eslint-disable-next-line no-unused-vars
  constructor(worker) {
    super(worker);

    // Set defaukt properties for the class
    this.undoByProjectNames = new Map();

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  pushAuthentication(url, credentials) {
    if (!credentials) {
      return Promise.resolve();
    }
    return this.worker.declarativeNetEngine.push(new BasicAuthenticationHeaderRule(url, credentials));
  }

  pushCookieHeaderOf(url) {
    return this.worker.cookieManager.cookieHeaderOf(url)
      .then(({ domain, cookieHeader }) => this.worker
        .declarativeNetEngine.push(new CookieHeaderRule(domain, cookieHeader)));
  }

  pushRedirectionsOf(json, credentials = undefined, runtimeInfo = this.worker.serverConnector.runtimeInfo) {
    const { serverUrl: serverLocation, connectRegistration: { connectUrl: connectLocation } } = runtimeInfo;
    const serverUrl = new URL(serverLocation);
    const connectUrl = new URL(connectLocation);
    const nuxeoBase = serverUrl.href.endsWith('/') ? serverUrl.href : `${serverUrl.href}/`;

    const promises = Object.keys(json).flatMap((basePath) => {
      const nuxeoBasePath = basePath.replace(
        /^\/(nuxeo\.war\/?\/)?/,
        ''
      );
      if (!basePath || basePath.length === 0 || !json[basePath]) {
        return [];
      }
      const files = Object.keys(json[basePath]);
      return files.map((resourcePath) => {
        const resourceNuxeoUrl = new URL(`${nuxeoBasePath}/${resourcePath}`, nuxeoBase);
        const resourceConnectUrl = new URL(json[basePath][resourcePath]);
        const updatedResourceConnectUrl = new URL(`${resourceConnectUrl.pathname}${resourceConnectUrl.search}${resourceConnectUrl.hash}`, connectUrl);

        if (credentials) {
          this.pushAuthentication(updatedResourceConnectUrl, credentials);
        }
        return this.pushRedirection(resourceNuxeoUrl, updatedResourceConnectUrl);
      });
    });

    return Promise.all(promises);
  }

  addRedirectionsOf(details) {
    // Detects when Studio users save changes to a new resource in Designer
    if (details.method !== 'POST') {
      return Promise.resolve();
    }

    const resourcePaths = details.requestBody.formData.path;
    const promises = resourcePaths.map((resourcePath) => {
      resourcePath = resourcePath.replace(/\/\//, '/');
      const connectResource = `${details.url}${resourcePath}`;
      resourcePath = resourcePath.replace(/^\/(nuxeo\.war\/?\/)?/, '');
      const nuxeoResource = `${this.serverUrl}${resourcePath}`;
      return this.pushRedirection(nuxeoResource, connectResource);
    });

    return Promise.all(promises).then(() => this.flush());
  }

  removeRedirectionsOf(details) {
    // Detects when Studio users revert their customizations to default
    if (details.method !== 'DELETE') {
      return Promise.resolve();
    }
    return this
      .popRedirection(details.url)
      .then(() => this.flush());
  }

  pushRedirection(from, to) {
    const patchUrlForUIPath = (url) => {
      const fragments = url.pathname.split('/');
      if (fragments[2] !== 'ui') {
        return url;
      }
      fragments.splice(3, 0, ''); // Insert '*' after 'ui'
      // Create a new URL with the modified pathname
      const modifiedUrl = new URL(url.toString());
      modifiedUrl.pathname = fragments.join('/');
      return modifiedUrl;
    };
    from = patchUrlForUIPath(from); // Update 'from' with the modified URL string
    return this.worker.declarativeNetEngine
      .push(new RedirectRule(from, to));
  }

  popRedirection(from) {
    return this.worker.declarativeNetEngine
      .pop(from)
      .then(() => this.modifyUrlForUIPath(from))
      .then((modifiedFrom) => {
        if (modifiedFrom === from) return;
        this.worker.declarativeNetEngine.pop(modifiedFrom);
      });
  }

  toggle(projectName) {
    return this.isEnabled(projectName)
      .then((enabled) => {
        const action = enabled ? this.disable : this.enable;
        return action.apply(this, [projectName]);
      });
  }

  asWorkspace(projectName) {
    return this.worker.connectLocator
      .asRegistration()
      .then(({ location, credentials }) => {
        const url = new URL(`studio/v2/project/${projectName}/workspace/ws.resources`, location);
        return { url, credentials };
      })
      .then(({ url: workspaceUrl, credentials }) => fetch(workspaceUrl, {
        credentials: 'include',
      })
        .then((response) => ({ workspaceUrl, response, credentials })))
      .then(({ workspaceUrl, response, credentials }) => {
        const errorOf = (message) => {
          const error = new Error(message);
          error.response = response;
          throw error;
        };
        // Check if the request was successful
        if (!response.ok) {
          // If the status code is 401, the user is not authenticated
          if (response.status === 401) {
            throw errorOf('Not authenticated on studio.');
          }
          // If the status code is anything else, there was another type of error
          throw errorOf(`Request failed with status ${response.status}`);
        }

        // Check if a redirect occurred
        if (response.url.toString() !== workspaceUrl.toString()) {
          throw errorOf(`Redirected from ${workspaceUrl} to ${response.url}, possibly due to not being authenticated.`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw errorOf('Unexpected content type');
        }
        return response.json().then((json) => ({ workspaceUrl, json, credentials }));
      });
  }

  enable(projectName) {
    return this.asWorkspace(projectName)
      // eslint-disable-next-line no-unused-vars
      .then(({ workspaceUrl, credentials, json }) =>
        this.disable()
          .then(() => this.pushCookieHeaderOf(workspaceUrl))
          .then(() => this.pushRedirectionsOf(json, credentials))
          .then(() => this.worker.declarativeNetEngine.flush())
          .then((undo) => this.undoByProjectNames.set(projectName, undo))
          .then(() => true));
  }

  // eslint-disable-next-line no-unused-vars
  disable(projectName) {
    return Promise.resolve()
      .then(() => this.undoByProjectNames.get(projectName))
      .then((undo) => {
        if (!undo) return;
        undo.apply();
      })
      .then(() => this.undoByProjectNames.delete(projectName))
      .then(() => false);
  }

  isEnabled(projectName) {
    return this.asWorkspace(projectName)
      .then(() => this.undoByProjectNames.has(projectName));
  }
}

export default DesignerLivePreview;
