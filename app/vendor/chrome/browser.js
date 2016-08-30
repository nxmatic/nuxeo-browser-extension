;(function (window) {
	var app = window.app = window.app || {};

	app.browser = {
		name: 'Chrome',

		getBackgroundPage: function(cb) {
			return chrome.runtime.getBackgroundPage(cb);
		},

		createTabs: function(url, tabId) {
			return chrome.tabs.create({
				url: url,
				openerTabId: tabId
			});
		},
		
		adjustJsonSearchIndent: function() {
			return $('#json-search').css('text-indent', '7px');
		}
	};
})(window);
