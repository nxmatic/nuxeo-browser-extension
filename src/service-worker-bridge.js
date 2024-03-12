/* eslint-disable comma-dangle */

class ServiceWorkerBridge {
  constructor() {
    const services = [
      'buildInfo',
      'browserStore',
      'chromeNotifier',
      'connectLocator',
      'declarativeNetEngine',
      'designerLivePreview',
      'developmentMode',
      'jsonHighlighter',
      'repositoryIndexer',
      'serverLocator',
      'serverConnector',
      'studioHotReloader',
      'documentBrowser'
    ];
    this.queue = Promise.resolve();

    services.forEach((service) => {
      this[service] = new Proxy({}, {
        get: (target, action) => (...params) => {
          this.queue = this.queue.then(() => new Promise((resolve, reject) => {
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
                } else {
                  resolve(response);
                }
              }
            );
          }));

          return this.queue;
        },
      });
    });
  }

  asPromise() {
    return new Promise((resolve) => resolve(this));
  }
}

export default ServiceWorkerBridge;
