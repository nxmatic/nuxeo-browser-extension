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
}

export default { RuntimeBuildInfo, DevelopmentMode };
