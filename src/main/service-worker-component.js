class ServiceWorkerComponent {
  constructor(worker = this) {
    this.worker = worker;
  }

  static handler = {
    // eslint-disable-next-line no-unused-vars
    get(target, propKey, receiver) {
      const origProperty = target[propKey];
      if (propKey === 'worker' && origProperty instanceof ServiceWorkerComponent) {
        // If the 'worker' property is accessed and its value is an instance of ServiceWorkerComponent,
        // return a proxied version of the worker
        return new Proxy(origProperty, ServiceWorkerComponent.handler);
      }
      if (typeof origProperty === 'function') {
        return function (...args) {
          const result = origProperty.apply(this, args);
          // If the result is already a Promise, return it directly
          if (result instanceof Promise) {
            return result;
          }
          // Otherwise, wrap it in a Promise
          return Promise.resolve(result);
        };
      }
      // If the original property is already a Promise, return it directly
      if (origProperty instanceof Promise) {
        return origProperty;
      }
      // Otherwise, wrap it in a Promise
      return Promise.resolve(origProperty);
    },
  };

  // eslint-disable-next-line no-unused-vars
  walkComponents(object = this, path = '', recursive = false, action = (componentInput, pathInput) => {}) {
    Object.getOwnPropertyNames(object)
      .filter((prop) => prop !== 'worker' && object[prop] instanceof ServiceWorkerComponent)
      .forEach((prop) => {
        const component = object[prop];
        const newPath = path ? `${path}.${prop}` : prop;
        action(component, newPath);
        if (recursive) {
          this.walkComponents(component, newPath, true, action);
        }
      });
  }

  componentsOf(object = this, recursive = false) {
    const components = [];
    this.walkComponents(object, '', recursive, (component) => {
      components.push(component);
    });
    return components;
  }

  componentNamesOf(object = this, recursive = false) {
    const componentNames = [];
    this.walkComponents(object, '', recursive, (component, path) => {
      componentNames.push(path);
    });
    return componentNames;
  }

  // eslint-disable-next-line class-methods-use-this
  toJSON() {
    return {}; // avoid circular dependencies on components
  }

  // overidden in components which need to check for availability
  // eslint-disable-next-line class-methods-use-this
  isAvailable() {
    return true;
  }

  // bootstrapping asynch logic
  asPromise() {
    const isProxyKey = Symbol(`${this.constructor.name}:isProxy`);
    if (this[isProxyKey]) {
      return Promise.resolve(this);
    }
    if (this._proxy) {
      return Promise.resolve(this._proxy);
    }
    const checkAvailabilityOn = (target, key) => Promise.resolve()
      .then(() => {
        if (!target.isAvailable()) {
          return Promise.reject(new Error(`${target.constructor.name}.${key} unavailale`));
        }
        return Promise.resolve();
      });
    this._proxy = new Proxy(this, {
      // eslint-disable-next-line no-unused-vars
      get(target, propKey, receiver) {
        if (propKey === isProxyKey) {
          return true;
        }
        if (propKey === 'then' || propKey === 'catch' || propKey === 'finally') {
          const origMethod = Reflect.get(target, propKey, receiver);
          return typeof origMethod === 'function' ? origMethod.bind(target) : origMethod;
        }
        if (target.constructor.name === 'DevelopmentMode') {
          if (propKey === 'toJSON') {
            const origMethod = Reflect.get(target, propKey, receiver);
            return typeof origMethod === 'function' ? origMethod.bind(target) : origMethod;
          }
        }
        const origProperty = target[propKey];
        const promise = checkAvailabilityOn(target, propKey);
        if (typeof origProperty === 'function') {
          return function (...args) {
            return promise
              .then(() => origProperty.apply(target, args));
          };
        }
        // Wrap property in a Promise
        return promise.then(() => origProperty);
      },
      // eslint-disable-next-line no-unused-vars
      set(target, propKey, value, receiver) {
        if (propKey === isProxyKey) {
          return false;
        }
        checkAvailabilityOn(target, value)
          .then(() => ({ previous: target[propKey], next: value }))
          .then(({ previous, next }) => {
            target[propKey] = value;
            return { previous, next };
          })
          .then(({ previous, next }) => {
            target
              .asConsole()
              .then((console) => {
                console.log(`Setting value '${value}' to property '${target.constructor.name}.${propKey}'`);
              });
            return { previous, next };
          });
        return true; // Indicates that the assignment succeeded
      },
    });
    return Promise.resolve(this._proxy);
  }

  asDevelopmentMode() {
    return this.worker.developmentMode.asPromise();
  }

  asConsole(options = { force: false }) {
    return this.worker.developmentMode.asConsole(options);
  }
}

export default ServiceWorkerComponent;
