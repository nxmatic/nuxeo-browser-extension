/* eslint-disable comma-dangle */
class Navigator {
  constructor(worker) {
    this.worker = worker;
    this.tabInfo = null;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });

    // ...
    this.nuxeoUrlOf = (tabInfo) => {
      // eslint-disable-next-line operator-linebreak
      // Regular expression pattern
      const nxPattern = new RegExp([
        '(^https?:\\/\\/[A-Za-z_\\.0-9:-]+\\/[A-Za-z_\\.0-9-]+)', // Match the start of a URL
        '(',
        '\\/(?:',
        '(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\\/[A-Za-z_\\.0-9-]+)\\/[A-Za-z_\\.0-9-]+|',
        'view_documents\\.faces|ui\\/|ui\\/#!\\/|view_domains\\.faces|home\\.html|view_home\\.faces',
        '))'
      ].join(''));
      // match and reject non matching URLs
      const matchGroups = nxPattern.exec(tabInfo.url);
      const isMatching = Boolean(matchGroups && matchGroups[2]);
      const [, extractedLocation] = isMatching ? matchGroups : [];

      return isMatching ? new URL(extractedLocation) : undefined;
    };
  }

  listenToChromeEvents() {
    const cleanupFunctions = [];

    // onInstalled event
    const onInstalledHandle = () => chrome.action.disable();
    chrome.runtime.onInstalled.addListener(onInstalledHandle);
    cleanupFunctions.push(() => chrome.runtime.onInstalled.removeListener(onInstalledHandle));

    // tab activation handle
    const tabActivatedHandle = (activeInfo) => chrome
      .tabs.get(activeInfo.tabId, (tabInfo) => this
        .enableExtensionIfNuxeoServerTab(tabInfo));
    chrome.tabs.onActivated.addListener(tabActivatedHandle);
    cleanupFunctions.push(() => chrome.tabs.onActivated.removeListener(tabActivatedHandle));

    // tab update handle
    const tabUpdatedHandle = (tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'complete') return;

      this.enableExtensionIfNuxeoServerTab(tab);
    };
    chrome.tabs.onUpdated.addListener(tabUpdatedHandle);
    cleanupFunctions.push(() => chrome.tabs.onUpdated.removeListener(tabUpdatedHandle));

    // windows focus handle
    const windowFocusHandle = (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      chrome.tabs.query({ active: true, windowId }, (tabs) => {
        if (!tabs || tabs.length === 0) return;

        this.enableExtensionIfNuxeoServerTab(tabs[0]);
      });
    };
    chrome.windows.onFocusChanged.addListener(windowFocusHandle);
    cleanupFunctions.push(() => chrome.windows.onFocusChanged.removeListener(windowFocusHandle));

    // tab removed handle
    // eslint-disable-next-line no-unused-vars
    const tabRemovedHandle = (tabId, removeInfo) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;

        this.enableExtensionIfNuxeoServerTab(tabs[0]);
      });
    };
    chrome.tabs.onRemoved.addListener(tabRemovedHandle);
    cleanupFunctions.push(() => chrome.tabs.onRemoved.removeListener(tabRemovedHandle));

    return () => {
      while (cleanupFunctions.length > 0) {
        const cleanupFunction = cleanupFunctions.pop();
        cleanupFunction();
      }
    };
  }

  enableExtensionIfNuxeoServerTab(info) {
    return this.isNuxeoServerTab(info)
      .then((rootUrl) => {
        if (rootUrl) return rootUrl;
        return chrome.action
          .disable(info.tabId)
          .then(() => chrome.action.isEnabled(info.id))
          .then(() => undefined);
      })
      .then((rootUrl) => {
        if (!rootUrl) return undefined;
        return this.worker.serverConnector
          .onNewServer(rootUrl, info)
          .then(() => {
            chrome.action.enable(info.id)
              .then(() => chrome.action.isEnabled(info.id))
              .then((isEnabled) => {
                if (!isEnabled) return;
                this.tabInfo = info;
              });
          })
          .then(() => rootUrl);
      })
      .then((rootUrl) => chrome.action.isEnabled(info.id)
        .then((isEnabled) => this.worker.developmentMode.asConsole()
          .then((console) => console
            .log(`Handled activation of ${JSON.stringify(info)} <- rootUrl=${rootUrl}, extension=${isEnabled ? 'enabled' : 'disabled'}`))))
      .catch((error) => this.worker.developmentMode.asConsole((console) => {
        console.warn(error);
        console.warn(`Caught error (see previous error) <- Navigator.enableExtensionIfNuxeoServerTab(${JSON.stringify(info)})`);
      }));
  }

  isNuxeoServerTab(info) {
    const rootUrl = this.nuxeoUrlOf(info);
    if (!rootUrl) return Promise.resolve(undefined);
    return Promise.resolve()
      .then(() => fetch(`${rootUrl}/site/automation`, {
        method: 'GET',
        credentials: 'include', // Include cookies in the request
      }))
      .then((response) => {
        if (response.ok || response.status !== 401) return response;
        this.worker.desktopNotifier.notify('unauthenticated', {
          title: `Not logged in page: ${info.url}...`,
          message: 'You are not authenticated. Please log in and try again.',
          iconUrl: '../images/access_denied.png',
        });
        this.reloadServerTab(info, 0);
        throw new Error(`Not logged in : ${info.url}...`);
      })
      .then((response) => {
        if (response.ok) return response;
        response.text().then((errorText) => {
          this.worker.desktopNotifier.notify('error', {
            title: `Not a Nuxeo server tab : ${info.url}...`,
            message: `Got errors while accessing automation status page at ${response.url}. Error: ${errorText}`,
            iconUrl: '../images/access_denied.png',
          });
        });
        throw new Error(`Not a nuxeo server tab : ${info.url}...`);
      })
      .then(() => {
        this.worker.desktopNotifier.cancel('unauthenticated');
        return rootUrl;
      });
  }

  disableExtension() {
    return new Promise((resolve, reject) => {
      if (!this.tabInfo) return reject(new Error('No tab info found'));
      chrome.action.disable(this.tabInfo.id);
      this.tabInfo = null;
      return resolve();
    });
  }

  reloadServerTab(tabInfo, waitingTime = 4000) {
    return new Promise((resolve) => setTimeout(() => {
      this.tabInfo = null;
      chrome.tabs.reload(tabInfo.id);
      resolve();
    }), waitingTime);
  }

  loadNewExtensionTab(url, appendNuxeBasePath = false) {
    return new Promise((resolve, reject) => {
      if (!this.tabInfo) return reject(new Error('No nuxeo server tab info selected'));
      return resolve(this.tabInfo);
    })
      .then((tabInfo) => {
        if (!this.worker.serverConnector.isConnected()) {
          throw new Error('Not connected to Nuxeo');
        }
        const serverInfo = this.worker.serverConnector.runtimeInfo();
        if (appendNuxeBasePath) {
          url = `${serverInfo.rootUrl}/${url}`;
        }
        return { url, openerTabId: tabInfo.id };
      })
      .then((tabParams) => {
        chrome.tabs.create({
          url: tabParams.url,
          openerTabId: tabParams.openerTabId,
          selected: false
        });
      })
      .catch((error) => console.error(error));
  }
}

export default Navigator;
