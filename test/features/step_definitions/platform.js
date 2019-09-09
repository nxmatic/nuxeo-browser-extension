/*
Copyright 2016-2019 Nuxeo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const { Given, Then, When } = require('cucumber');
const chai = require('chai');

const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

When(/^I try to create a document/, () => {
  browser.$('//*[@id="nxw_newDocument_form:nxw_newDocument_link"]').waitForDisplayed();
  browser.$('//*[@id="nxw_newDocument_form:nxw_newDocument_link"]').click();
});

Then(/^I (can't )?see the (.+) document type/, (notVisible, docType) => {
  browser.$('#nxw_newDocument_after_view_box').waitForDisplayed();
  if (notVisible) {
    if (!browser.$(`//*[@id="nxw_newDocument_after_view_fancy_subview:nxw_newDocument_after_view_fancyform:${docType}"]`).isDisplayed()) {
      return true;
    } else {
      return false;
    }
  } else {
    browser.$(`//*[@id="nxw_newDocument_after_view_fancy_subview:nxw_newDocument_after_view_fancyform:${docType}"]`).isDisplayed().should.be.true;
  }
  const tabIds = browser.getWindowHandles();
  return browser.switchToWindow(tabIds[0]);
});

Then(/^the Nuxeo page refreshes/, () => {
  browser.waitUntil(() => {
    return browser.execute(() => {
      return chrome.tabs.reload.called;
    })
  }, 50000);
  const tabIds = browser.getWindowHandles();
  for (let i = 0; i < tabIds.length; i += 1) {
    if (browser.getTitle().indexOf('Nuxeo Platform') === -1) {
      browser.switchToWindow(tabIds[i]);
    } else {
      return browser.refresh();
    }
  }
  return browser.refresh();
});
