
// Use chrome.storage.sync.get that returns a Promise
function getFromStorage(key) {
  return chrome.storage.sync.get(key);
}

// Use chrome.storage.sync.set that returns a Promise
function setToStorage(obj) {
  return chrome.storage.sync.set(obj);
}

// Use chrome.notifications.create that returns a Promise
function createNotification(id, options) {
  return chrome.notifications.create(id, options);
}

// Use chrome.tabs.query that returns a Promise
function queryTabs(queryInfo) {
  return chrome.tabs.query(queryInfo);
}

// V3 version of addNotificationClickListener
function addNotification(clickHandler) {
  chrome.action.onClicked.addListener((tab) => {
    clickHandler(tab.id);
  });
}