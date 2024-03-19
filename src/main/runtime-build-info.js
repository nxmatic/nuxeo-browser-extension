/* eslint-disable max-classes-per-file */
import ServiceWorkerComponent from './service-worker-component';

class RuntimeBuildInfo extends ServiceWorkerComponent {
  constructor(worker, buildTime, buildVersion, browserVendor) {
    super(worker);

    this._developer = 'NOS Team <nuxeo>';
    this._browserVendor = browserVendor;
    this._buildTime = buildTime;
    this._buildVersion = buildVersion;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  developer() {
    return this._developer;
  }

  browserVendor() {
    return this._browserVendor;
  }

  buildTime() {
    return this._buildtime;
  }

  buildVersion() {
    return this._version;
  }
}

class DevelopmentMode extends ServiceWorkerComponent {
  constructor(worker, isEnabled) {
    super(worker);
    this._isEnabled = isEnabled;

    // bind this methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });

    // rebind isEnabled to checkAvailability for asPromise enforcing
    this.checkAvailability = this.isEnabled;
  }

  isEnabled() {
    return this._isEnabled;
  }

  toggle() {
    this._isEnabled = !this._isEnabled;
  }

  asConsole() {
    return this.asPromise();
      .then(() => console)
      .catch(() => {
        const noop = () => {};
        return {
          log: noop, error: noop, warn: noop, info: noop,
        };
      });
  }
}

export default { RuntimeBuildInfo, DevelopmentMode };
