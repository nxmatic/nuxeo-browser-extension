/* eslint-disable no-return-assign */
/* eslint-disable no-sequences */

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
  checkAvailability(self = this) {
    return Promise.resolve(self);
  }

  // bootstrapping asynch logic
  asPromise() {
    if (!this._isProxy) return Promise.resolve(this);
    const proxy = new Proxy(this, {
      // eslint-disable-next-line no-unused-vars
      get(target, propKey, receiver) {
        const origProperty = target[propKey];
        if (typeof origProperty === 'function') {
          return function (...args) {
            return Promise.resolve(origProperty.apply(this, args));
          };
        }
        // Wrap property in a Promise
        return Promise.resolve(origProperty);
      },
      set(target, propKey, value, receiver) {
        Promise.resolve({ previous: target[propKey], next: value })
          .then(({ previous, next }) => (target[propKey] = value, { previous, next }))
          .then(({ previous, next }) => (receiver.worker.developmentMode
            .asConsole()
            .then((console) => console
              .log(`Setting value '${value}' to property '${propKey}'`)), { previous, next }));
        return true; // Indicates that the assignment succeeded
      },
    });
    proxy._isProxy = true;
    return Promise.resolve(proxy);
  }
}

export default ServiceWorkerComponent;
