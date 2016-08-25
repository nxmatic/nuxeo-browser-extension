
;(function (window) {
	var app = window.app = window.app || {};

	app.browser = {
		name: 'Chrome',

		getBackgroundPage: function() {
			return chrome.runtime.getBackgroundPage;
		}

		getUrl: function (url) {
			return chrome.extension.getURL(url);
		}

		createTabs: function() {
			return chrome.tabs.create;
		}
	};
})(window);
console.log("YOYOYO");