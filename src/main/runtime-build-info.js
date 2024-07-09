/* eslint-disable no-return-assign */
/* eslint-disable max-classes-per-file */
import ServiceWorkerComponent from './service-worker-component';

class DevelopmentMode extends ServiceWorkerComponent {
  constructor(worker, isEnabled) {
    super(worker);
    const noopConsoleProvider = () => {
      const noop = () => {};
      return {
        log: noop, error: noop, warn: noop, info: noop
      };
    };
    this._isEnabled = isEnabled;
    this._featureFlags = { };
    this._console = isEnabled ? console : noopConsoleProvider();

    // bind this methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });

    // rebind isEnabled to checkAvailability for asPromise enforcing
    this.isAvailable = this.isEnabled;
  }

  isEnabled() {
    return this._isEnabled;
  }

  toggle() {
    return this._isEnabled = !this._isEnabled;
  }

  setFeatureFlag(flag, value) {
    return this._featureFlags[flag] = value;
  }

  isFeatureFlagSet(flag) {
    if (!this._featureFlags[flag]) {
      return false;
    }
    return this._featureFlags[flag];
  }

  toggleFeatureFlag(flag) {
    return this._featureFlags[flag] = !this._featureFlags[flag];
  }

  asConsole(options = { force: false }) {
    return this.asPromise()
      .then(() => (options.force ? console : this._console));
  }

  asExecutor() {
    return this._isEnabled ? Promise.reject() : Promise.resolve();
  }
}

class RuntimeBuildInfo extends ServiceWorkerComponent {
  constructor(worker, buildTime, buildVersion, browserVendor, developmentMode) {
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

    worker.developmentMode = new DevelopmentMode(worker, developmentMode);
  }

  developer() {
    return Promise.resolve(this._developer);
  }

  browserVendor() {
    return Promise.resolve(this._browserVendor);
  }

  buildTime() {
    return Promise.resolve(this._buildtime);
  }

  buildVersion() {
    return Promise.resolve(this._version);
  }
}

export default { RuntimeBuildInfo, DevelopmentMode };
