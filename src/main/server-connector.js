/* eslint-disable comma-dangle */
/* eslint-disable max-classes-per-file */
import Nuxeo from 'nuxeo';

class ServerConnector {
  constructor(worker) {
    this.worker = worker;
    this.rootUrl = undefined;
    this.nuxeo = undefined;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });

    // listeners
    this.onInputChanged = null;
  }

  onNewServer(rootUrl) {
    return new Promise((resolve, reject) => {
      try {
        if (rootUrl) {
          if (this.isConnected()) {
            this.disconnect();
          }
          this.connect(rootUrl, resolve, reject);
        } else {
          this.disconnect();
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  connect(rootUrl, resolve, reject) {
    this.rootUrl = rootUrl;
    this.nuxeo = new Nuxeo({ baseURL: this.rootUrl });
    this.nuxeo.login()
      .then(() => {
        chrome.omnibox.onInputChanged.addListener(this.onInputChanged = this.suggestDocument);
      })
      .then(() => resolve())
      .catch((error) => {
        if (error.response) {
          this.handleErrors(error, this.defaultServerError);
          return null;
        }
        return reject(error);
      });
  }

  disconnect() {
    chrome.omnibox.onInputChanged.removeListener(this.onInputChanged);

    this.nuxeo = null;
    this.rootUrl = null;
    this.onInputChanged = null;
  }

  isConnected() {
    return this.rootUrl != null;
  }

  runtimeInfo() {
    return { rootUrl: this.rootUrl, nuxeo: this.nuxeo };
    // return this.worker.browserStore
    //   .get('serverInfo')
    //   // eslint-disable-next-line arrow-body-style
    //   .then((store) => {
    //     return store.serverInfo;
    //   });
  }

  withNuxeo() {
    return new Promise((resolve, reject) => {
      if (this.nuxeo) {
        resolve(this.nuxeo);
      } else {
        reject(new Error('Not connected to Nuxeo'));
      }
    });
  }

  defaultServerError = {
    id: 'server_error',
    title: 'Server Error',
    message: 'Please ensure that Dev Mode is activated.',
    imageUrl: '../images/access_denied.png',
    interaction: false,
  };

  handleErrors(error, serverError) {
    error.response.json().then((json) => {
      const msg = json.message;
      const err = error.response.status;
      if (msg == null) {
        this.worker.desktopNotifier.notify('no_hot_reload', {
          title: 'Hot Reload Operation not found.',
          message: 'Your current version of Nuxeo does not support the Hot Reload function.',
          iconUrl: '../images/access_denied.png',
          requireInteraction: false
        });
      } else if (err === 401) {
        this.worker.desktopNotifier.notify('access_denied', {
          title: 'Access denied!',
          message: 'You must have Administrator rights to perform this function.',
          iconUrl: '../images/access_denied.png',
          requireInteraction: false
        });
      } else if (err >= 500) {
        this.worker.desktopNotifier.notify(serverError.id, {
          title: serverError.title,
          message: serverError.message,
          iconUrl: serverError.imageUrl,
          requireInteraction: serverError.interaction
        });
      } else if (err >= 300 && err < 500) {
        this.worker.desktopNotifier.notify('bad_login', {
          title: 'Bad Login',
          message: 'Your Login and/or Password are incorrect',
          iconUrl: '../images/access_denied.png',
          requireInteraction: false
        });
      } else {
        this.worker.desktopNotifier.notify('unknown_error', {
          title: 'Unknown Error',
          message: 'An unknown error has occurred. Please try again later.',
          iconUrl: '../images/access_denied.png',
          requireInteraction: false
        });
      }
    });
  }

  executeScript(script) {
    const blob = new Nuxeo.Blob({
      content: new Blob([script], {
        type: 'text/plain',
      }),
      name: 'readPackage.groovy',
      mymeType: 'text/plain',
    });
    return this.withNuxeo().then((nuxeo) => nuxeo
      .operation('RunInputScript')
      .params({
        type: 'groovy',
      })
      .input(blob)
      .execute()
      .then((res) => res.text()));
  }

  executeOperation(operationId, params) {
    return this.withNuxeo().then((nuxeo) => nuxeo
      .operation(operationId)
      .params(params)
      .execute()
      .catch((e) => {
        if (e.response) {
          this.handleErrors(e, this.defaultServerError);
        } else {
          throw e;
        }
      }));
  }

  query(input, schemas = ['dublincore', 'common', 'uid']) {
    return Promise.all([this.runtimeInfo(), this.withNuxeo()])
      .then(([runtimeInfo, nuxeo]) => {
        const userid = runtimeInfo.nuxeo.user.id;
        const defaultSelectClause = '* FROM Document';
        const defaultWhereClause = `ecm:path STARTSWITH "/default-domain/UserWorkspaces/${userid}"`;
        const defaultQuery = `SELECT ${defaultSelectClause} WHERE ${defaultWhereClause}"`;
        const defaultSortBy = 'dc:modified DESC';

        if (!input || (typeof input === 'object' && !input.query)) {
          input.query = defaultQuery;
        }
        if (!input.sortBy) {
          input.sortBy = defaultSortBy;
        }

        return nuxeo
          .repository()
          .schemas(schemas)
          .query(input);
      });
  }

  restart() {
    const notifyRestart = () => new Promise((resolve) => {
      this.worker.desktopNotifier.notify('reload', {
        title: 'Restarting server...',
        message: 'Attempting to restart Nuxeo server.',
        iconUrl: '../images/nuxeo-128.png',
        requireInteraction: false,
      })
        .then(() => this.worker.browserNavigator.reloadServerTab())
        .then(() => this.worker.desktopNotifier.cancel('reload'))
        .then(() => resolve());
    });

    const notifyError = (error) => new Promise((resolve) => {
      console.error(`Error restarting server ${error}`);
      this.worker.desktopNotifier.notify('error', {
        title: 'Something went wrong...',
        message: 'An error occurred.',
        iconUrl: '../images/access_denied.png',
        requireInteraction: false,
      });
      resolve();
    });

    const restartUrl = `${this.rootUrl}/site/connectClient/uninstall/restart`;
    return this.worker.browserNavigator.disableExtension()
      .then(this.withNuxeo)
      .then((nuxeo) => nuxeo
        ._http({
          method: 'POST',
          schemas: [],
          enrichers: [],
          fetchProperties: [],
          url: restartUrl,
        }))
      .then((res) => {
        // Handle restart success since 9.10
        if (res.status && res.status >= 200 && res.status < 300) {
          return notifyRestart();
        } else {
          // Handle errors for 8.10 and FT up to 9.3
          return notifyError(res);
        }
      })
      .then(() => {
        setTimeout(() => {
          this.worker.browserNavigator.reloadTab();
        }, 5000);
      })
      .catch((e) => {
        notifyError(e);
      });
  }
}

export default ServerConnector;
