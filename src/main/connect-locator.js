/* eslint-disable function-paren-newline */
/* eslint-disable comma-dangle */
/* eslint-disable no-sequences */
import CryptoJS from 'crypto-js';
import ServiceWorkerComponent from './service-worker-component';

class ConnectLocator extends ServiceWorkerComponent {
  constructor(worker) {
    super(worker);

    this.decodeBasicAuth = (basic) => atob(basic).split(':');

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

  asRegistration(url) {
    if (url) {
      const { location, credentials } = this.extractCredentialsAndCleanUrl(url);
      return this.worker.browserStore
        .set({ 'connect-locator.url': location, [this.credentialsKeyOf(location)]: credentials })
        .then((store) => {
          this.worker.developmentMode
            .asConsole()
            .then((console) => console
              .log(`ConnectLocator.asRegistration(${url})`, store));
          return store;
        })
        .then(() => this.asRegistration());
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
}

export default ConnectLocator;
