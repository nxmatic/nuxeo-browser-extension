/* eslint-disable function-paren-newline */
/* eslint-disable comma-dangle */
/* eslint-disable no-sequences */
import CryptoJS from 'crypto-js';
import ServiceWorkerComponent from './service-worker-component';

class ConnectLocator extends ServiceWorkerComponent {
  constructor(worker) {
    super(worker);

    this._decodeBasicAuth = (basic) => atob(basic).split(':');

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });

    // Declare functors
    this.credentialsKeyOf = (location) => {
      const hash = CryptoJS
        .SHA512(location.toString())
        .toString();
      return `connect-locator.${hash}`;
    };
  }

  withUrl(input) {
    if (input) {
      const { location, credentials } = this.extractCredentialsAndCleanUrl(input);
      return this.worker.browserStore
        .set({ 'connect-locator.url': location, [this.credentialsKeyOf(location)]: credentials })
        .then((store) => {
          this.worker.developmentMode
            .asConsole()
            .then((console) => console
              .log(`ConnectLocator.withUrl(${input})`, store));
          return store;
        })
        .then(() => this.withUrl());
    }
    return this.worker.browserStore
      .get({ 'connect-locator.url': 'https://connect.nuxeo.com/' })
      .then((store) => {
        const location = new URL(store['connect-locator.url']);
        location.pathname = location.pathname.replace(/\/?$/, '/');
        return location;
      })
      .then((location) => ({ location, key: this.credentialsKeyOf(location) }))
      .then(({ location, key }) => this.worker.browserStore.get({ [key]: undefined })
        .then((credentialsStore) => {
          if (!(credentialsStore && credentialsStore[key])) {
            return { location, credentials: null };
          }
          return { location, credentials: credentialsStore[key] };
        }));
  }

  // eslint-disable-next-line class-methods-use-this
  extractCredentialsAndCleanUrl(input) {
    const location = typeof input === 'string' ? new URL(input) : input;
    let credentials = null;
    if (location.username || location.password) {
      credentials = btoa(`${location.username}:${location.password}`);
      location.username = '';
      location.password = '';
    }
    location.pathname = location.pathname.replace(/\/$/, '').toLowerCase();
    return { location: location.toString(), credentials };
  }

  list() {
    return this.worker.browserStore
      .list()
      .then((store) => Object.keys(store)
        .filter((key) => key.startsWith('connect-locator.'))
        .reduce((obj, key) => {
          obj[key] = store[key];
          return obj;
        }, {}));
  }

  withDevelopedProjects() {
    return this.withUrl()
      .then(({ credentials: basicAuth }) => this._decodeBasicAuth(basicAuth))
      .then((parms) => this.worker.serverConnector
        .executeScript('get-developed-studio-projects', parms))
      .then((projects) => Promise
        .all(projects
          .map(({ projectName, isRegistered }) => this.worker.designerLivePreview
            .isEnabled(projectName)
            .then((designerLivePreviewEnabled) => ({
              projectName,
              registered: isRegistered,
              designerLivePreviewEnabled,
            }))
            .catch((error) => (
              {
                projectName,
                registered: isRegistered,
                designerLivePreviewEnabled: false,
                inError: {
                  message: error.message,
                  stack: error.stack,
                }
              })
            )
          )
        )
      );
  }

  registerDevelopedProject(projectName) {
    return this.withUrl()
      .then(({ credentials: basicAuth }) => this._decodeBasicAuth(basicAuth))
      .theb((parms) => (parms.push(projectName), parms))
      .then((parms) => this.worker.serverConnector
        .executeScript('register-developed-studio-project', parms));
  }
}

export default ConnectLocator;
