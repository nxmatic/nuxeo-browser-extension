/* eslint-disable comma-dangle */

class ServiceWorkerBridge {
  bootstrap() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          extension: 'nuxeo-web-extension',
          component: 'componentInventory',
          action: 'list',
          params: [],
        },
        (response) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          if (response && response.error) {
            return reject(response.error);
          }
          this.createProxies(response);
          return resolve(this);
        }
      );
    });
  }

  createProxies(components) {
    components.forEach((component) => {
      this[component] = new Proxy({}, {
        get: (target, action) => (...params) => new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              extension: 'nuxeo-web-extension',
              component: `${component}`,
              action,
              params,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (response && response.error) {
                const error = new Error(response.error.message);
                error.name = response.error.name;
                error.stack = response.error.stack;
                error.originalError = response.error; // Include the original error
                reject(error);
              } else {
                resolve(response);
              }
            }
          );
        }),
      });
    });
  }

  asPromise() {
    return Promise.resolve(this);
  }
}

export default ServiceWorkerBridge;
