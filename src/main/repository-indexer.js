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

class RepositoryIndexer {
  constructor(worker) {
    this.worker = worker;

    // Bind methods
    this.withNuxeo = this.withNuxeo.bind(this);
    this.reindex = this.reindex.bind(this);
    this.reindexNXQL = this.reindexNXQL.bind(this);
    this.reindexDocId = this.reindexDocId.bind(this);
  }

  withNuxeo() {
    return this.worker.browserStore.get('server').then((server) => server.nuxeo);
  }

  reindex() {
    this.withNuxeo((nuxeo) => {
      nuxeo
        .operation('Elasticsearch.Index')
        .execute()
        .then(() => {
          this.worker.desktopNotifier.notify('success', {
            title: 'Success!',
            message: 'Your repository index is rebuilding.',
            iconUrl: '../images/nuxeo-128.png',
          });
        })
        .catch((e) => {
          console.error(e);
          this.worker.desktopNotifier.notify('error', {
            title: 'Something went wrong...',
            message: 'Please try again later.',
            iconUrl: '../images/access_denied.png',
          });
        });
    });
  }

  reindexNXQL(input) {
    this.nuxeo
      .operation('Elasticsearch.Index')
      .input(input)
      .execute()
      .then(() => {
        this.worker.desktopNotifier.notify('success', {
          title: 'Success!',
          message: 'Your repository index is rebuilding.',
          iconUrl: '../images/nuxeo-128.png',
        });
      })
      .catch((e) => {
        console.error(e);
        this.worker.desktopNotifier.notify('error', {
          title: 'Something went wrong...',
          message: 'Please try again later.',
          iconUrl: '../images/access_denied.png',
        });
      });
  }

  reindexDocId(input) {
    this.worker.browserStore.get(['server']).then((entries) => {
      const url = entries.server.url;
      const nuxeo = this.newNuxeo({
        baseURL: url,
      });
      nuxeo
        .operation('Elasticsearch.Index')
        .input(input)
        .execute()
        .then(() => {
          this.worker.desktopNotifier.notify('success', {
            title: 'Success!',
            message: 'Your repository index is rebuilding.',
            iconUrl: '../images/nuxeo-128.png',
          });
        })
        .catch((e) => {
          console.error(e);
          this.worker.desktopNotifier.notify('error', {
            title: 'Something went wrong...',
            message: 'Please try again later.',
            iconUrl: '../images/access_denied.png',
          });
        });
    });
  }
}

export default RepositoryIndexer;
