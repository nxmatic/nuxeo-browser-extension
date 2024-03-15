/* eslint-disable max-classes-per-file */
/* eslint-disable comma-dangle */
import BrowserStore from './browser-store';
import ConnectLocator from './connect-locator';
import DeclararactiveNetCompoments from './declarative-net-engine';
import DesignerLivePreview from './designer-live-preview';
import DesktopNotifier from './desktop-notifier';
import DocumentBrowser from './document-browser';
import JSONHighlighter from './json-highlighter';
import RepositoryIndexer from './repository-indexer';
import RuntimeBuildComponent from './runtime-build-info';
import ServerConnector from './server-connector';
import TabActivator from './tab-activator';
import StudioHotReloader from './studio-hot-reloader';

const DeclarativeNetEngine = DeclararactiveNetCompoments.DeclarativeNetEngine;

class ServiceWorkerMessageHandler {
  constructor(worker) {
    this.worker = worker;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  handle(request, sender, sendResponse) {
    if (request.extension !== 'nuxeo-web-extension') {
      return undefined;
    }

    const withConnectedWorker = (worker) => {
      if (worker.serverConnector.isConnected()) {
        // If the worker already connected, return a promise that resolves immediately
        return Promise.resolve(worker);
      }
      // If the worker isn't connected, return a promise that rejects
      return Promise.reject(new Error('Worker not connected'));
    };

    const handleRequest = (worker) => {
      function getNestedProperty(obj, path) {
        return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : null), obj);
      }
      const service = getNestedProperty(worker, request.service);
      if (!service) {
        return Promise.reject(new Error(`Invalid service ${JSON.stringify(request)}`));
      }
      if (typeof service[request.action] !== 'function') {
        return Promise.reject(new Error(`Invalid action ${JSON.stringify(request)}`));
      }
      this.worker.developmentMode
        .asConsole()
        .then((console) => console
          .log(`ServiceWorkerMessageHandler.handle(${JSON.stringify(request)}) called`));
      return Promise
        .resolve(service[request.action](...request.params))
        .then((result) => {
          this.worker.developmentMode
            .asConsole()
            .then((console) => console
              .log(`${JSON.stringify(result)} <- ServiceWorkerMessageHandler.handle(${JSON.stringify(request)})`));
          return result;
        })
        .catch((error) => this.worker.developmentMode
          .asConsole()
          .then((console) => {
            console.error(error);
            console.warn(`Caught error (see previous error) <- ServiceWorkerMessageHandler.handle(${JSON.stringify(request)})`);
            return Promise.resolve({ error: { message: error.message, name: error.name, stack: error.stack } });
          }));
    };

    withConnectedWorker(this.worker)
      .then(handleRequest)
      .then(sendResponse)
      .catch((error) => console.error(`Caught error while handling ${JSON.stringify(request)}: ${error}`));

    return true; // This is necessary to indicate that you will send a response asynchronously
  }
}

class ServiceWorker {
  constructor(developmentMode, buildTime, buildVersion, browserVendor) {
    // sub-componments takes reference to the worker
    // in order to invoke other services. The order is important as
    // services may be invoked while constructing.
    this.buildInfo = new RuntimeBuildComponent
      .RuntimeBuildInfo(buildTime, buildVersion, browserVendor);
    this.developmentMode = new RuntimeBuildComponent.DevelopmentMode(developmentMode);
    this.browserStore = new BrowserStore(this);
    this.connectLocator = new ConnectLocator(this);
    this.declarativeNetEngine = new DeclarativeNetEngine(this);
    this.designerLivePreview = new DesignerLivePreview(this);
    this.desktopNotifier = new DesktopNotifier(this);
    this.jsonHighlighter = new JSONHighlighter(this);
    this.repositoryIndexer = new RepositoryIndexer(this);
    this.tabActivator = new TabActivator(this);
    this.serverConnector = new ServerConnector(this);
    this.studioHotReloader = new StudioHotReloader(this);
    this.documentBrowser = new DocumentBrowser(this);

    // binds methods to this
    this.listenToChromeEvents = this.listenToChromeEvents.bind(this);
  }

  listenToChromeEvents() {
    const cleanupFunctions = []; // Initialize the stack
    if (typeof cleanupFunctions.push !== 'function') {
      throw new Error('cleanupFunctions must have a push method');
    }
    const messageHandle = new ServiceWorkerMessageHandler(this).handle;
    chrome.runtime.onMessage.addListener(messageHandle);
    cleanupFunctions.push(() => chrome.runtime.onMessage.removeListener(messageHandle));

    cleanupFunctions.push(this.tabActivator.listenToChromeEvents());
    cleanupFunctions.push(this.documentBrowser.listenToChromeEvents());
    cleanupFunctions.push(() => this.designerLivePreview.disable());

    return () => {
      while (cleanupFunctions.length > 0) {
        const cleanupFunction = cleanupFunctions.pop();
        cleanupFunction();
      }
    };
  }
}

export default ServiceWorker;
