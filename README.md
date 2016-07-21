Nuxeo Chrome Dev Tools
======================

# About

This project aims to put some of the more commonly performed actions in the Nuxeo
Platform at the administrator's fingertips in a convenient popup window.

Features include:
* Hot Reload on related Studio project
* Link to Studio project
* Link to Automation Documentation
* Restart server
* Rebuild Elasticsearch Index
* Connect to API Playground
* Toggle Automation Call Tracing
* Useful Links menu
* Export JSON (search with path, GUID or file name)
* One-click JSON export of document in current active tab

# Installation

- From the Chrome Web Store: install [Nuxeo Chrome Extension](https://chrome.google.com/webstore/detail/nuxeo-extension/kncphbjdicjganncpalklkllihdidcmh).

## Requirements

* Nuxeo 8.2

## Limitations

* Multiple Nuxeo projects are not supported.
* The extension is only active when a Nuxeo instance in the current active tab.
* The Hot Reload and Go To Studio buttons are only active when a Studio project is associated with the current Nuxeo server.
* [CORS config](https://doc.nuxeo.com/pages/viewpage.action?pageId=14257084) must be activated in your Nuxeo server to connect to your repository on API Playground.

## Build

- From GitHub:
```
$ git clone git@github.com:nuxeo/nuxeo-chrome-extension.git
$ cd nuxeo-chrome-extension
$ npm install && bower install
$ gulp build
```

# Contributing / Reporting issues

https://jira.nuxeo.com/browse/CHROME/

# License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

# About Nuxeo

The [Nuxeo Platform](http://www.nuxeo.com/products/content-management-platform/) is an open source customizable and extensible content management platform for building business applications. It provides the foundation for developing [document management](http://www.nuxeo.com/solutions/document-management/), [digital asset management](http://www.nuxeo.com/solutions/digital-asset-management/), [case management application](http://www.nuxeo.com/solutions/case-management/) and [knowledge management](http://www.nuxeo.com/solutions/advanced-knowledge-base/). You can easily add features using ready-to-use addons or by extending the platform using its extension point system.

The Nuxeo Platform is developed and supported by Nuxeo, with contributions from the community.

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with
SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Netflix, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris.
More information is available at [www.nuxeo.com](http://www.nuxeo.com).
