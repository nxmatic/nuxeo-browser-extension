/* eslint-disable no-sequences */
/* eslint-disable comma-dangle */
/* eslint-disable max-classes-per-file */
import Nuxeo from 'nuxeo';
import ServiceWorkerComponent from './service-worker-component';
import scripts from './groovy';

class GroovyScriptManager {
  constructor() {
    this.scripts = scripts;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  interpolate(name, ...args) {
    if (!this.scripts[name]) {
      throw new Error(`Script ${name} does not exist`);
    }
    const scriptBody = this.scripts[name].call(this.scripts, ...args);
    return Promise.resolve(scriptBody);
  }
}

class ServerConnector extends ServiceWorkerComponent {
  constructor(worker) {
    super(worker);

    this.groovyScriptManager = new GroovyScriptManager();

    // Define properties
    this.disconnect = () => {};
    this.nuxeo = undefined;
    this.rootUrl = undefined;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  cbeckAvailability() {
    return Promise.resolve().then(() => {
      if (!this.isConnected) {
        throw new Error('Not connected to Nuxeo');
      }
      return this;
    });
  }

  onNewServer(rootUrl) {
    if (!rootUrl) {
      return this.disconnect();
    }
    return this.isConnected()
      .then((connected) => {
        if (connected) return this.disconnect();
        return true;
      })
      .then(() => this.connect(rootUrl));
  }

  connect(rootUrl) {
    this.rootUrl = rootUrl;
    this.nuxeo = new Nuxeo({ baseURL: this.rootUrl });
    return this.nuxeo
      .login()
      .then(() => {
        chrome.omnibox.onInputChanged.addListener(this.onInputChanged = this.suggestDocument);
      })
      .then(() => () => {
        this.disconnect = undefined;
        this.rootUrl = undefined;
        this.nuxeo = undefined;
        chrome.omnibox.onInputChanged.removeListener(this.suggestDocument);
      })
      .then((disconnect) => {
        this.disconnect = disconnect.bind(this);
        return this.disconnect;
      })
      .catch((cause) => {
        if (cause.response) {
          this.handleErrors(cause, this.defaultServerError);
          return () => {};
        }
        throw cause;
      });
  }

  isConnected() {
    return Promise.resolve(this.rootUrl != null);
  }

  runtimeInfo() {
    return Promise.all([
      this.installedAddons(),
      this.developedStudioProjects()])
      .then(([installedAddons, developedStudioProjects]) => ({
        rootUrl: this.rootUrl,
        nuxeo: this.nuxeo,
        installedAddons,
        developedStudioProjects,
      }));
  }

  registeredStudioProject() {
    return this.executeScript('get-registered-studio-project');
  }

  installedAddons() {
    return this.executeScript('get-installed-addons');
  }

  developedStudioProjects() {
    return this.executeScript('get-developed-studio-projects');
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
      return error.response;
    });
  }

  executeScript(name, parms = [], outputType = 'application/json') {
    return this.groovyScriptManager
      .interpolate(name, ...parms)
      .then((scriptBody) => this.executeScriptBody(name, scriptBody, outputType));
  }

  executeScriptBody(name, body, outputType = 'application/json') {
    const blob = new Nuxeo.Blob({
      content: new Blob([body], {
        type: 'text/plain',
      }),
      name,
      mymeType: 'text/plain',
    });
    return this
      .executeOperation('RunInputScript', { type: 'groovy' }, blob, outputType);
  }

  executeOperation(operationId, params = {}, input = undefined, outputType = 'application/json') {
    return this.withNuxeo().then((nuxeo) => nuxeo
      .operation(operationId)
      .params(params)
      .input(input)
      .execute()
      .then((response) => {
        if (!(response instanceof Response)) {
          return response;
        }
        if (outputType !== 'application/json') {
          return response;
        }
        return response.json();
      })
      .catch((cause) => {
        if (!cause.response) {
          throw cause;
        }
        return this.handleErrors(cause, this.defaultServerError);
      }));
  }

  query(input, schemas = ['dublincore', 'common', 'uid']) {
    return this.withNuxeo()
      .then((nuxeo) => {
        const userid = nuxeo.user.id;
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

  listStudioProjects() {
    return this.withNuxeo().then((nuxeo) => nuxeo
      .operation('Studio.ListProjects')
      .execute()
      .catch((cause) => {
        if (!cause.response) {
          throw cause;
        }
        return this.handleErrors(cause, this.defaultServerError);
      }));
  }

  restart() {
    const notifyRestart = (context) => new Promise((resolve) => {
      this.worker.desktopNotifier.notify('reload', {
        title: 'Restarting server...',
        message: 'Attempting to restart Nuxeo server.',
        iconUrl: '../images/nuxeo-128.png',
        requireInteraction: false,
      })
        .then(() => this.worker.tabNavigationHandler.reloadServerTab(context, 10000))
        .then(() => this.worker.desktopNotifier.cancel('reload'))
        .then(() => resolve());
    });

    const notifyError = (error) => new Promise((resolve) => {
      console.error(`Error restarting server '${error.message}'`, error);
      this.worker.desktopNotifier.notify('error', {
        title: 'Something went wrong...',
        message: 'An error occurred.',
        iconUrl: '../images/access_denied.png',
        requireInteraction: false,
      });
      resolve();
    });

    const rootUrl = this.rootUrl;
    const restartUrl = `${this.rootUrl}/site/connectClient/uninstall/restart`;
    return this.worker.tabNavigationHandler.disableTabExtension()
      .then((tabInfo) => this
        .withNuxeo()
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
            return notifyRestart({ rootUrl, tabInfo });
          } else {
          // Handle errors for 8.10 and FT up to 9.3
            return notifyError(res);
          }
        })
        .catch((e) => {
          notifyError(e);
        }));
  }
}

export default ServerConnector;
