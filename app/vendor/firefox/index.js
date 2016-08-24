var { ToggleButton } = require('sdk/ui/button/toggle');
var panels = require("sdk/panel");
var self = require("sdk/self");

var button = ToggleButton({
  id: "nuxeo-ff-dev-tools",
  label: "Nuxeo FF Dev Tools",
  icon: {
    "16": "./../images/nuxeo-16.png",
    "32": "./../images/nuxeo-32.png",
    "64": "./../images/nuxeo-64.png"
  },
  onChange: handleChange
});

var panel = panels.Panel({
  width: 510,
  height: 520,
  contentURL: self.data.url("../popup.html"),
  contentScriptFile: self.data.url("../scripts/popup.js"),
  onHide: handleHide
});

function handleChange(state) {
  if (state.checked) {
    panel.show({
      position: button
    });
  }
}

function handleHide() {
  button.state('window', {checked: false});
}