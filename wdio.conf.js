const nuxeo = require('./test/features/step_definitions/support/client.js').nuxeo;
const path = require('path');

exports.config = {
    //
    // ====================
    // Runner Configuration
    // ====================
    //
    // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
    // on a remote machine).
    runner: 'local',
    //
    // Override default path ('/wd/hub') for chromedriver service.
    // path: '/',
    //
    // ==================
    // Specify Test Files
    // ==================
    // Define which test specs should run. The pattern is relative to the directory
    // from which `wdio` was called. Notice that, if you are calling `wdio` from an
    // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
    // directory is where your package.json resides, so `wdio` will be called from there.
    //
    path: '/wd/hub',
    port: 4444, // default for Selenium Standalone
    specs: [
        './test/features/*.feature'
    ],
    // Patterns to exclude.
    exclude: [
        // 'path/to/excluded/files'
    ],
    //
    // ============
    // Capabilities
    // ============
    // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
    // time. Depending on the number of capabilities, WebdriverIO launches several test
    // sessions. Within your capabilities you can overwrite the spec and exclude options in
    // order to group specific specs to a specific capbility.
    //
    // First, you can define how many instances should be started at the same time. Let's
    // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
    // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
    // files and you set maxInstances to 10, all spec files will get tested at the same time
    // and 30 processes will get spawned. The property handles how many capabilities
    // from the same test should run tests.
    //
    maxInstances: 10,
    //
    // If you have trouble getting all important capabilities together, check out the
    // Sauce Labs platform configurator - a great tool to configure your capabilities:
    // https://docs.saucelabs.com/reference/platforms-configurator
    //
    capabilities: [{
        // maxInstances can get overwritten per capability. So if you have an in-house Selenium
        // grid with only 5 firefox instances available you can make sure that not more than
        // 5 instances get started at a time.
        maxInstances: 1,
        //
        browserName: 'chrome',
        // javascriptEnabled: true,
        // acceptSslCerts: true,
        'goog:chromeOptions': {
          args: [
            '--no-sandbox',
            '--headless',
            '--disable-gpu',
            '--single-process',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
          ],
        }
    }],
    //
    // ===================
    // Test Configurations
    // ===================
    // Define all options that are relevant for the WebdriverIO instance here
    //
    // By default WebdriverIO commands are executed in a synchronous way using
    // the wdio-sync package. If you still want to run your tests in an async way
    // e.g. using promises you can set the sync option to false.
    sync: true,
    //
    // Level of logging verbosity: silent | verbose | command | data | result | error
    logLevel: 'error',
    //
    // Enables colors for log output.
    coloredLogs: true,
    //
    // Warns when a deprecated command is used
    deprecationWarnings: false,
    //
    // If you only want to run your tests until a specific amount of tests have failed use
    // bail (default is 0 - don't bail, run all tests).
    bail: 0,
    //
    // Saves a screenshot to a given path if a command fails.
    screenshotPath: './test/screenshots/',
    //
    // Set a base URL in order to shorten url command calls. If your `url` parameter starts
    // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
    // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
    // gets prepended directly.
    baseUrl: 'http://localhost:8080/nuxeo',
    //
    // Default timeout for all waitFor* commands.
    waitforTimeout: 60000,
    //
    // Default timeout in milliseconds for request
    // if Selenium Grid doesn't send response
    connectionRetryTimeout: 90000,
    //
    // Default request retries count
    connectionRetryCount: 3,
    //
    // Test runner services
    // Services take over a specific job you don't want to take care of. They enhance
    // your test setup with almost no effort. Unlike plugins, they don't add new
    // commands. Instead, they hook themselves up into the test process.
    services: ['selenium-standalone'],
    // options
    // chromeDriverArgs: ['--port=4321', '--url-base=\'/\''], // default for ChromeDriver
    seleniumArgs: {
      version : "3.141.59",
      drivers : {
        chrome : {
          version : "74.0.3729.6",
          arch    : process.arch,
        }
      }
    },
    seleniumInstallArgs: {
      version : "3.141.59",
      baseURL : "https://selenium-release.storage.googleapis.com",
      drivers : {
        chrome : {
          version : "74.0.3729.6",
          arch    : process.arch,
          baseURL : "https://chromedriver.storage.googleapis.com",
        }
      }
    },
    seleniumLogs: './',
    // Framework you want to run your specs with.
    // The following are supported: Mocha, Jasmine, and Cucumber
    // see also: https://webdriver.io/docs/frameworks.html
    //
    // Make sure you have the wdio adapter package for the specific framework installed
    // before running any tests.
    framework: 'cucumber',
    //
    // The number of times to retry the entire specfile when it fails as a whole
    // specFileRetries: 1,
    //
    // Test reporter for stdout.
    // The only one supported by default is 'dot'
    // see also: https://webdriver.io/docs/dot-reporter.html
    reporters: [ 'spec',
        [ 'cucumberjs-json', {
            jsonFolder: './ftest/target/cucumber-reports',
            },
        ],
    ],
 //
    // If you are using Cucumber you need to specify the location of your step definitions.
    cucumberOpts: {
        require: ['./test/features/step_definitions/*.js'],        // <string[]> (file/dir) require files before executing features
        backtrace: true,   // <boolean> show full backtrace for errors
        compiler: [],       // <string[]> ("extension:module") require files with the given EXTENSION after requiring MODULE (repeatable)
        dryRun: false,      // <boolean> invoke formatters without executing steps
        failFast: false,    // <boolean> abort the run on first failure
        format: ['pretty'], // <string[]> (type[:path]) specify the output format, optionally supply PATH to redirect formatter output (repeatable)
        colors: true,       // <boolean> disable colors in formatter output
        snippets: true,     // <boolean> hide step definition snippets for pending steps
        source: true,       // <boolean> hide source uris
        profile: [],        // <string[]> (name) specify the profile to use
        strict: false,      // <boolean> fail if there are any undefined or pending steps
        tags: [],           // <string[]> (expression) only execute the features or scenarios with tags matching the expression
        timeout: 60000,     // <number> timeout for step definitions
        ignoreUndefinedDefinitions: false, // <boolean> Enable this config to treat undefined definitions as warnings.
    },

    //
    // =====
    // Hooks
    // =====
    // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
    // it and to build services around it. You can either apply a single function or an array of
    // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
    // resolved to continue.
    //
    // onPrepare: function (config, capabilities) {
    // },
    //
    // Gets executed just before initialising the webdriver session and test framework. It allows you
    // to manipulate configurations depending on the capability or spec.
    beforeSession: function (config, capabilities, specs) {
      const chrome = require('sinon-chrome');
      global.liveDocuments = [];
      global.connectUsr = process.env.connectUsr;
      global.connectPsw = process.env.connectPsw;

      // Assume we are always working on localhost:8080
      chrome.tabs.query.yields([{
        url: 'http://localhost:8080/nuxeo/view_documents.faces?conversationId=0NXMAIN',
        id: 1
      }]);
    },
    //
    // Gets executed before test execution begins. At this point you can access to all global
    // variables like `browser`. It is the perfect place to define custom commands.
    //
    // before: function (capabilities, specs) {
    // },
    //
    // Runs before a WebdriverIO command gets executed.
    // @param {String} commandName hook command name
    // @param {Array} args arguments that command would receive
    //
    // beforeCommand: function (commandName, args) {
    // },

    //
    // Runs before a Cucumber feature
    // @param {Object} feature feature details
    //
    // beforeFeature: function (feature) {
    // },
    //
    // Runs before a Cucumber scenario
    // @param {Object} scenario scenario details
    //
    beforeScenario: function (scenario) {
      //
      // This function runs in the browser context
      // @param {string|Array<string>} selectors
      // @return {?Element}
      //
    },
    /**
     * Runs before a Cucumber step
     * @param {Object} step step details
     */
    // beforeStep: function (step) {
    // },
    //
    // Runs after a Cucumber step
    // @param {Object} stepResult step result
    //
    // afterStep: function (stepResult) {
    // },
    //
    // Runs after a Cucumber scenario
    // @param {Object} scenario scenario details
    //
    afterScenario: function (scenario) {
      // Delete all documents
      const userWorkspaces = '/default-domain/UserWorkspaces/';
      return Promise.all(liveDocuments
        .filter(doc => path.dirname(doc) === '/default-domain')
        .map(doc => {
          nuxeo.repository()
            .delete(doc)
            .catch((err) => {
              console.log(err);
            });
        }))
        .then(() => {
          return liveDocuments = [];
        })
        .then(() => {
          return nuxeo.repository().delete(userWorkspaces).catch((err) => {
            // No user workspaces
          });
        });
    },
    /**
     * Runs after a Cucumber feature
     * @param {Object} feature feature details
     */
    // afterFeature: function (feature) {
    // },

    /**
     * Runs after a WebdriverIO command gets executed
     * @param {String} commandName hook command name
     * @param {Array} args arguments that command would receive
     * @param {Number} result 0 - command success, 1 - command error
     * @param {Object} error error object if any
     */
    // afterCommand: function (commandName, args, result, error) {
    // },
    /**
     * Gets executed after all tests are done. You still have access to all global variables from
     * the test.
     * @param {Number} result 0 - test pass, 1 - test fail
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    // after: function (result, capabilities, specs) {
    // },
    /**
     * Gets executed right after terminating the webdriver session.
     * @param {Object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    // afterSession: function (config, capabilities, specs) {
    // },
    /**
     * Gets executed after all workers got shut down and the process is about to exit.
     * @param {Object} exitCode 0 - success, 1 - fail
     * @param {Object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     */
    // onComplete: function(exitCode, config, capabilities) {
    // }
}
