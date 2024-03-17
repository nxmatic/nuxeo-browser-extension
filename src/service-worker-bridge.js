/* eslint-disable comma-dangle */

class ServiceWorkerBridge {
  constructor() {
    const services = [
      'buildInfo',
      'browserNavigator',
      'browserStore',
      'chromeNotifier',
      'connectLocator',
      'declarativeNetEngine',
      'designerLivePreview',
      'developmentMode',
      'jsonHighlighter',
      'repositoryIndexer',
      'serverConnector',
      'studioHotReloader',
      'documentBrowser'
    ];

    services.forEach((service) => {
      this[service] = new Proxy({}, {
        get: (target, action) => (...params) => new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              extension: 'nuxeo-web-extension',
              service: `${service}`,
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
    return new Promise((resolve) => resolve(this));
  }
}

export default ServiceWorkerBridge;
