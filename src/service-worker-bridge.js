/* eslint-disable max-classes-per-file */
/* eslint-disable comma-dangle */

class ServiceWorkerBridge {
  bootstrap({ name, entrypoint }) {
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
    })
      .then((worker) => {
        worker[name] = entrypoint;
        // Determine the global scope more cleanly
        // eslint-disable-next-line no-restricted-globals, no-undef
        const globalScope = typeof window !== 'undefined' ? window : self;
        // First, check and set the development mode
        return worker.asDevelopmentMode()
          .then(() => {
            globalScope.nuxeoWebExtension = worker;
            // After setting the development mode, execute the entrypoint function
            return entrypoint(worker);
          })
          .catch(() => entrypoint(worker))
          .then(() => worker); // Return the worker after all operations are complete
      });
  }

  createProxies(components) {
    components.forEach((component) => {
      this[component] = new Proxy({}, {
        get: (target, action) => async (...params) => {
          const request = {
            extension: 'nuxeo-web-extension',
            component,
            action,
            params,
          };
          const awaitedResponse = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              request,
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else if (response && response.error) {
                  reject(this.componentErrorOf(component, request, response.error));
                } else {
                  resolve(response);
                }
              }
            );
          });
          return awaitedResponse;
        },
      });
    });
  }

  asPromise() {
    return Promise.resolve(this);
  }

  asDevelopmentMode() {
    return this.developmentMode.asPromise();
  }

  asConsole() {
    return this.developmentMode.asConsole().catch(() => {});
  }

  // eslint-disable-next-line class-methods-use-this
  componentErrorOf(component, request, json) {
    class ComponentError extends Error {
      constructor() {
        super('component request error, use \'component,request,json\' accessors');
      }

      // eslint-disable-next-line class-methods-use-this
      component() {
        return component;
      }

      // eslint-disable-next-line class-methods-use-this
      request() {
        return request;
      }

      // eslint-disable-next-line class-methods-use-this
      json() {
        return json;
      }
    }
    return new ComponentError();
  }

  // eslint-disable-next-line class-methods-use-this
  isComponentError(error) {
    return error.constructor && error.constructor.name === 'ComponentError';
  }

  isDevelopmentModeError(error) {
    return this.isComponentError(error) &&
      error.component() === 'developmentMode';
  }
}

export default ServiceWorkerBridge;
