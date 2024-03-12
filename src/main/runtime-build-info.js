/* eslint-disable max-classes-per-file */

class RuntimeBuildInfo {
  constructor(buildTime, buildVersion, browserVendor) {
    this._developer = 'NOS Team <nuxeo>';
    this._browserVendor = browserVendor;
    this._buildTime = buildTime;
    this._buildVersion = buildVersion;

    // binds methods to this
    this.developer = this.developer.bind(this);
    this.browserVendor = this.browserVendor.bind(this);
    this.buildTime = this.buildTime.bind(this);
    this.buildVersion = this.buildVersion.bind(this);
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

class DevelopmentMode {
  constructor(isEnabled) {
    this._isEnabled = isEnabled;

    // bind this methods
    this.asConsole = this.asConsole.bind(this);
    this.asPromise = this.asPromise.bind(this);
    this.isEnabled = this.isEnabled.bind(this);
    this.toggle = this.toggle.bind(this);
  }

  isEnabled() {
    return this.asPromise()
      .then(() => true);
  }

  toggle() {
    return new Promise((resolve) => {
      this._isEnabled = !this._isEnabled;
      resolve(this._isEnabled);
    });
  }

  asPromise() {
    return new Promise((resolve, reject) => {
      if (this._isEnabled) {
        resolve(this);
      } else {
        reject(new Error('DevelopmentMode is not available in production mode'));
      }
    });
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
