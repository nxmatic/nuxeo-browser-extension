;(function (window, self) {
	var app = window.app = window.app || {};

	app.browser = {
		name: 'Firefox',

		getBackgroundPage: function(bkg) {
			return bkg(chrome.extension.getBackgroundPage());
		},

		createTabs: function(url, tabId) {
			return chrome.tabs.create({
				url: url
			});
		}

	};
})(window, self);