module.exports = function () {
  this.After(() => {
    const tabIds = browser.getTabIds();
    if (tabIds.length > 1) {
      browser.close(tabIds[0]);
    }
  });
};
