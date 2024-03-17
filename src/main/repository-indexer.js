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
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  reindex(input) {
    return this.worker.serverConnector
      .withNuxeo()
      .then((nuxeo) => {
        const operation = nuxeo.operation('Elasticsearch.Index');
        if (input) {
          operation.input(input);
        }
        return operation.execute();
      })
      .then(() => {
        this.worker.desktopNotifier.notify('success', {
          title: 'Success!',
          message: `Your repository index is rebuilding for ${input ? JSON.stringify(input) : 'all documents'}.`,
          iconUrl: '../images/nuxeo-128.png',
        });
      })
      .catch((cause) => {
        this.worker.desktopNotifier.notify('error', {
          title: 'Something went wrong...',
          message: `${cause.message}\nPlease try again later.`,
          iconUrl: '../images/access_denied.png',
        });
      });
  }
}

export default RepositoryIndexer;
