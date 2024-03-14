class ConnectLocator {
  constructor(worker) {
    this.worker = worker;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  withUrl(value) {
    const method = this.worker.browserStore[value ? 'set' : 'get'];
    const data = value ? { 'connect-url': value.toString() } : { 'connect-url': 'https://connect.nuxeo.com' };

    return method.apply(this.worker.browserStore, [data])
      .then((store) => store['connect-url'])
      .then((location) => new URL(location));
  }
}

export default ConnectLocator;
