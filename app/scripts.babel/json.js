chrome.runtime.getBackgroundPage(function(bkg) {
  document.getElementById('json-string').innerHTML = bkg._text;
  hljs.initHighlighting();
});
