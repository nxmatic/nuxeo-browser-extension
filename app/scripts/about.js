/*
Copyright 2016-2024 Nuxeo

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

$(() => {
  const date = new Date().getFullYear();
  $('#copyright').append(`${date} Nuxeo`);
  app.browser.getBackgroundPage((bkg) => {
    $('#apache').click(() => {
      app.browser.createTabs('http://www.apache.org/licenses/LICENSE-2.0', bkg.studioExt.server.tabId);
    });
    $('#feedback').click(() => {
      app.browser.createTabs('https://portal.prodpad.com/40c295d6-739d-11e7-9e52-06df22ffaf6f', bkg.studioExt.server.tabId);
    });
  });
});
