/* eslint-disable comma-dangle */
class ServerLocator {
  constructor(worker) {
    this.worker = worker;
    this.nuxeoUrlOf = (tabInfo) => {
      // eslint-disable-next-line operator-linebreak
      // Regular expression pattern
      const nxPattern = new RegExp([
        // Match the start of a URL, including the protocol (http or https)
        // the domain, and one segment after the domain
        '(^https?:\\/\\/[A-Za-z_\\.0-9:-]+\\/[A-Za-z_\\.0-9-]+)',

        // Non-capturing group for the rest of the URL
        '(?:',

        // Match a variety of possible segments that could follow the first segment in the URL
        '\\/(?:',

        // Match specific segments like "nxdoc", "nxpath", "nxsearch", etc.
        '(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\\/[A-Za-z_\\.0-9-]+)\\/[A-Za-z_\\.0-9-]+|',

        // Match specific pages like "view_documents.faces", "ui/#!/", etc.
        'view_documents\\.faces|ui\\/#!\\/|[a-zA-Z0-9_%]+\\/?|view_domains\\.faces|home\\.html|view_home\\.faces',

        // Close the groups
        '))'
      ].join(''));
      const matchGroups = nxPattern.exec(tabInfo.url);
      if (!matchGroups) return null;
      const [, extractedUrl] = matchGroups;
      console.log(`ServerLocator.nuxeoUrlOf(${tabInfo.url}) -> ${extractedUrl}`);
      return extractedUrl;
    };

    this.tabInfo = null;

    // Bind  methods
    this.listenToChromeEvents = this.listenToChromeEvents.bind(this);
    this.enableExtensionIfNuxeoServerTab = this.enableExtensionIfNuxeoServerTab.bind(this);
    this.disableExtension = this.disableExtension.bind(this);
    this.loadNewExtensionTab = this.loadNewExtensionTab.bind(this);
    this.getCurrentTabUrl = this.getCurrentTabUrl.bind(this);
    this.reloadServerTab = this.reloadServerTab.bind(this);
  }

  listenToChromeEvents() {
    const cleanupFunctions = [];

    // tab activation handle
    const tabActivatedHandle = (activeInfo) => chrome
      .tabs.get(activeInfo.tabId, (tab) => this
        .enableExtensionIfNuxeoServerTab(tab));

    chrome.tabs.onActivated.addListener(tabActivatedHandle);
    cleanupFunctions.push(() => chrome.tabs.onActivated.removeListener(tabActivatedHandle));

    // tab update handle
    const tabUpdatedHandle = (tabId, changeInfo, tab) => {
      if (!(tab.active && changeInfo.url)) return;

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

    return () => {
      while (cleanupFunctions.length > 0) {
        const cleanupFunction = cleanupFunctions.pop();
        cleanupFunction();
      }
    };
  }

  enableExtensionIfNuxeoServerTab(tabInfo) {
    return new Promise((resolve, reject) => {
      // If the tab is not a Nuxeo server tab, disable the extension
      chrome.action.disable(tabInfo.id);

      const rootUrl = this.nuxeoUrlOf(tabInfo);
      if (!rootUrl) {
        return resolve(); // Not a Nuxeo server tab
      }
      this.tabInfo = tabInfo;
      const automationReportUrl = `${rootUrl}/site/automation`;
      return fetch(automationReportUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies in the request
      }).then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            this.worker.desktopNotifier.notify('unauthenticated', {
              title: `Not logged in page: ${tabInfo.url}...`,
              message: 'You are not authenticated. Please log in and try again.',
              iconUrl: '../images/access_denied.png',
              requireInteraction: false
            });
            return this.reloadServerTab(0);
          }
          response.text().then((errorText) => {
            this.worker.desktopNotifier.notify('error', {
              title: `Not a Nuxeo server tab : ${tabInfo.url}...`,
              message: `Got errors while accessing automation status page at ${automationReportUrl}. Error: ${errorText}`,
              iconUrl: '../images/access_denied.png',
              requireInteraction: false
            });
          });
          return reject(new Error(`Not a Nuxeo server tab : ${tabInfo.url}...`));
        }
        this.worker.desktopNotifier.cancel('unauthenticated');
        // eslint-disable-next-line consistent-return
        return this.worker.serverConnector
          .onNewServer(rootUrl, tabInfo)
          .then(() => this.worker.browserStore
            .set(tabInfo)
            .then(() => {
              chrome.action.enable(tabInfo.id);
            })
            .then(() => resolve()))
          .catch((error) => reject(error));
      }).catch((error) => reject(error));
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

  reloadServerTab(waitingTime = 4000) {
    return new Promise((resolve) => setTimeout(() => {
      const tabId = this.tabInfo.tabId;
      this.tabInfo = null;
      chrome.tabs.reload(tabId);
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

        return { tabInfo, serverInfo };
      })
      .then((store) => {
        if (!store.serverInfo) throw new Error('No server info found');
        return store;
      })
      .then((store) => {
        if (appendNuxeBasePath) {
          url = `${store.serverInfo.rootUrl}/${url}`;
        }
        chrome.tabs.create({
          url,
          openerTabId: store.tabInfo.tabId,
          selected: false
        });
      })
      .catch((error) => console.error(error));
  }

  getCurrentTabUrl() {
    return new Promise((resolve, reject) => {
      chrome.tabs
        .query({
          active: true,
          currentWindow: true,
        })
        .then((tabs) => {
          if (!tabs || tabs.length === 0) {
            resolve(null);
            return;
          }
          const nxPattern = /(^https?:\/\/[A-Za-z_\.0-9:-]+\/[A-Za-z_\.0-9-]+\/)(?:(?:nxdoc|nxpath|nxsearch|nxadmin|nxhome|nxdam|nxdamid|site\/[A-Za-z_\.0-9-]+)\/[A-Za-z_\.0-9-]+|view_documents\.faces|ui\/#!\/|[a-zA-Z0-9_%]+\/?|view_domains\.faces|home\.html|view_home\.faces)/;
          const [tab] = tabs;
          const matchGroups = nxPattern.exec(tab.url);
          if (!matchGroups) {
            resolve(null);
            return;
          }
          const [, url] = matchGroups;
          this.worker.browserStore
            .set({ server: { url, tabId: tab.id } })
            .then((store) => {
              this.server = store.server;
              this.worker.serverConnector.onNewServer(this.server);
              return this.server;
            })
            .then((server) => resolve(server.url))
            .catch((error) => {
              console.error(error);
              reject(error);
            });
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    });
  }
}

export default ServerLocator;
