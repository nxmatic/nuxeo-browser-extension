/* eslint-disable max-classes-per-file */
/* eslint-disable comma-dangle */
import BrowserStore from './browser-store';
import ConnectLocator from './connect-locator';
import DesignerLivePreview from './designer-live-preview';
import DesktopNotifier from './desktop-notifier';
import DocumentBrowser from './document-browser';
import JSONHighlighter from './json-highlighter';
import RepositoryIndexer from './repository-indexer';
import RuntimeBuildComponent from './runtime-build-info';
import ServerConnector from './server-connector';
import ServerLocator from './server-locator';
import StudioHotReloader from './studio-hot-reloader';

class ServiceWorkerMessageHandler {
  constructor(worker) {
    this.worker = worker;

    // binds methods to this
    this.handle = this.handle.bind(this);
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
        return Promise.reject(new Error(`Invalid action ${JSON.stringify(request)}`));
      }
      if (typeof service[request.action] !== 'function') {
        return Promise.reject(new Error(`Invalid action ${JSON.stringify(request)}`));
      }
      return Promise.resolve(service[request.action](...request.params));
    };

    withConnectedWorker(this.worker)
      .then((worker) => {
        console.log(`ServiceWorkerMessageHandler.handle(${JSON.stringify(request)}) called`);
        return handleRequest(worker);
      })
      .then((result) => {
        sendResponse(result);
        setTimeout(() => console.log(`${JSON.stringify(result)} <- ServiceWorkerMessageHandler.handle(${JSON.stringify(request)})`), 0);

        return result;
      })
      .catch((error) => {
        sendResponse({
          error: error.toString(),
          errorCode: error.code,
          stack: error.stack
        });
      });

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
    this.designerLivePreview = new DesignerLivePreview(this);
    this.desktopNotifier = new DesktopNotifier(this);
    this.jsonHighlighter = new JSONHighlighter(this);
    this.repositoryIndexer = new RepositoryIndexer(this);
    this.serverLocator = new ServerLocator(this);
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

    cleanupFunctions.push(this.serverLocator.listenToChromeEvents());
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
