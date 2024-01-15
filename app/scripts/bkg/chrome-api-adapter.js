// Higher-order function to select the correct version of a function
function selectVersion(v2Function, v3Function) {
  return chrome.runtime.getManifest().manifest_version === 2
    ? v2Function
    : v3Function;
}

// Create a wrapper function for chrome.storage.sync.get that returns a Promise
function getFromStoragePromiseWrapper(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// Use chrome.storage.sync.get that returns a Promise
function getFromStoragePromise(key) {
  return chrome.storage.sync.get(key);
}

// Export the correct functions based on the manifest version
window.getFromStorage = selectVersion(
  getFromStoragePromiseWrapper,
  getFromStoragePromise,
);

// Create a wrapper function for chrome.storage.sync.set that returns a Promise
function setToStoragePromiseWrapper(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(obj, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Use chrome.storage.sync.set that returns a Promise
function setToStoragePromise(obj) {
  return chrome.storage.sync.set(obj);
}

// Export the correct functions based on the manifest version
window.setToStorage = selectVersion(
  setToStoragePromiseWrapper,
  setToStoragePromise,
);

// Create a wrapper function for chrome.notifications.create that returns a Promise
function createNotificationPromiseWrapper(id, options) {
  return new Promise((resolve, reject) => {
    chrome.notifications.create(id, options, (notificationId) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(notificationId);
      }
    });
  });
}

// Use chrome.notifications.create that returns a Promise
function createNotificationPromise(id, options) {
  return chrome.notifications.create(id, options);
}

window.createNotification = selectVersion(
  createNotificationPromiseWrapper,
  createNotificationPromise,
);

// Create a wrapper function for chrome.tabs.query that returns a Promise
function queryTabsPromiseWrapper(queryInfo) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tabs);
      }
    });
  });
}

// Use chrome.tabs.query that returns a Promise
function queryTabsPromise(queryInfo) {
  return chrome.tabs.query(queryInfo);
}

window.queryTabs = selectVersion(queryTabsPromiseWrapper, queryTabsPromise);

// V2 version of addNotificationClickListener
function addNotificationClickListenerWithNotifactions(clickHandler) {
  chrome.notifications.onClicked.addListener((notificationId) => {
    clickHandler(notificationId);
  });
}

// V3 version of addNotificationClickListener
function addNotificationClickListenerWithAction(clickHandler) {
  chrome.action.onClicked.addListener((tab) => {
    clickHandler(tab.id);
  });
}

// Export the correct function based on the manifest version
// eslint-disable-next-line max-len
window.addNotificationClickListener = selectVersion(
  addNotificationClickListenerWithNotifactions,
  addNotificationClickListenerWithAction,
);
