;(function (window) {
	var app = window.app = window.app || {};

	app.browser = {
		name: 'Chrome',

		getBackgroundPage: function(cb) {
			return chrome.runtime.getBackgroundPage(cb);
		},

		getUrl: function (url) {
			return chrome.extension.getURL(url);
		},

		createTabs: function(createProperties) {
			return chrome.tabs.create(createProperties);
		}
	};
})(window);
