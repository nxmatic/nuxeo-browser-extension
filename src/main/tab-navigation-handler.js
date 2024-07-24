/* eslint-disable no-return-assign */
/* eslint-disable no-sequences */
/* eslint-disable comma-dangle */
import ServiceWorkerComponent from './service-worker-component';

class TabNavigationHandler extends ServiceWorkerComponent {
  constructor(worker) {
    super(worker);

    // Define properties
    this.tabInfo = null;

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  isTabExtensionEnabled() {
    return this.tabInfo !== null;
  }

  enableTabExtension(input) {
    return Promise.resolve(input)
      .then((tabInfo) => (this.tabInfo = tabInfo, tabInfo))
      .then((tabInfo) => Promise.resolve(tabInfo.id)
        .then((tabId) => (chrome.action.enable(tabId), tabId))
        .then((tabId) => (chrome.action.setBadgeText({ tabId, text: '' }), tabId))
        .then(() => tabInfo));
  }

  disableTabExtension(input = this.tabInfo) {
    return Promise.resolve(input)
      .then((tabInfo) => (this.tabInfo = null, tabInfo))
      .then((tabInfo) => Promise.resolve(tabInfo.id)
        .then((tabId) => (chrome.action.disable(tabId), tabId))
        .then((tabId) => (chrome.action.setBadgeText({ tabId, text: 'D' }), tabId))
        .then((tabId) => (chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF7F7F' }), tabId))
        .then(() => tabInfo));
  }

  // eslint-disable-next-line class-methods-use-this
  asTabInfo(input) {
    if (input) {
      return Promise.resolve(input);
    }
    return chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tabInfo]) => tabInfo);
  }

  reloadServerTab(overrideOptions = {}) {
    const defaultOptions = {
      rootUrl: this.worker.serverConnector.serverUrl,
      tabInfo: this.tabInfo,
      maxAttempts: 1,
      waitingTime: 4000,
      bypassCache: false
    };
    const {
      rootUrl, tabInfo, maxAttempts, waitingTime, bypassCache
    } = { ...defaultOptions, ...overrideOptions };
    if (!tabInfo) {
      return Promise.reject(new Error('No nuxeo server tab info selected'));
    }
    const runningStatusUrl = `${rootUrl}/runningstatus`;
    let attempts = 0;
    const checkStatus = () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        throw new Error(`Maximum number of attempts reached on ${rootUrl}...`);
      }
      return fetch(runningStatusUrl)
        .then((response) => {
          if (!response.ok) {
            // If the status page is not available, check again after a delay
            return new Promise((resolve) => setTimeout(resolve, waitingTime))
              .then(checkStatus);
          }
          chrome.tabs.reload(tabInfo.id, { bypassCache });
          return response;
        })
        .catch(() => new Promise((resolve) => setTimeout(resolve, waitingTime))
          .then(checkStatus));
    };
    // Start checking the status
    return checkStatus();
  }

  updateServerTab(inputUrl, appendNuxeBasePath = false) {
    return this.asTabParams(inputUrl, appendNuxeBasePath)
      .then((tabParams) => chrome.tabs
        .update(tabParams.openerTabId, {
          url: tabParams.url,
          active: true,
          highlighted: true,
        }));
  }

  loadNewExtensionTab(inputUrl, appendNuxeBasePath = false) {
    return this.asTabParams(inputUrl, appendNuxeBasePath)
      .then((tabParams) => chrome.tabs.create({
        url: tabParams.url,
        openerTabId: tabParams.openerTabId,
        selected: false
      }));
  }

  asTabParams(inputUrl, appendNuxeBasePath = false) {
    return this.asTabInfo()
      .then((tabInfo) => {
        if (!appendNuxeBasePath) return { url: inputUrl, openerTabId: tabInfo.id };
        if (!inputUrl) return { url: tabInfo.url, openerTabId: tabInfo.id };
        return this.worker.serverConnector.asPromise()
          .then((serverConnector) => serverConnector.serverUrl)
          .then((serverUrl) => ({
            url: `${serverUrl}/${inputUrl}`,
            openerTabId: tabInfo.id
          }));
      });
  }
}

export default TabNavigationHandler;
