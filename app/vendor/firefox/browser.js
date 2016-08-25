;(function (window, self) {
	var app = window.app = window.app || {};

	app.browser = {
		name: 'Firefox',

		getBackgroundPage: function(cb) {
			return extension.getBackgroundPage(cb);
		},

		getUrl: function (url) {
			return self.options.rootUrl + url;
		},

		createTabs: function(createProperties) {
			return browser.tabs.create(createProperties);
		}

	};
})(window, self);