/* eslint-disable comma-dangle */
import DOMPurify from 'dompurify';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pathPattern = /^\//;
const selectFromPattern = /SELECT .* FROM /i;
const webuiPattern = /nuxeo\/ui\/#!\//;

class DocumentBrowser {
  constructor(worker) {
    this.worker = worker;

    // Bind methods
    this.jsonOf = this.jsonOf.bind(this);
    this.openDocument = this.openDocument.bind(this);
    this.openDocFromId = this.openDocFromId.bind(this);
    this.openDocFromPath = this.openDocFromPath.bind(this);
    this.doOpenDoc = this.doOpenDoc.bind(this);
    this.suggestDocument = this.suggestDocument.bind(this);
  }

  listenToChromeEvents() {
    const cleanupFunctions = [];

    chrome.omnibox.onInputEntered.addListener(this.openDocument);
    cleanupFunctions.push(() => chrome.omnibox.onInputEntered.removeListener(this.openDocument));

    chrome.omnibox.onInputChanged.addListener(this.suggestDocument);
    cleanupFunctions.push(() => chrome.omnibox.onInputChanged.removeListener(this.suggestDocument));

    return () => {
      while (cleanupFunctions.length > 0) {
        const cleanupFunction = cleanupFunctions.pop();
        cleanupFunction();
      }
    };
  }

  onWebUI() {
    return webuiPattern.exec(this.worker.serverConnector._nuxeo._baseURL);
  }

  openDocument(input) {
    if (uuidPattern.test(input)) {
      this.openDocFromId(input);
    } else if (pathPattern.test(input)) {
      this.openDocFromPath(input);
    } else {
      console.error(`Invalid input ${input}`);
    }
  }

  openDocFromId(id) {
    this.worker.serverConnector.withNuxeo()
      .then((nuxeo) => nuxeo.request(`/id/${id}`))
      .then((request) => this.doOpenDoc(request));
  }

  openDocFromPath(path) {
    this.worker.serverConnector.withNuxeo()
      .then((nuxeo) => nuxeo.request(`/path/${path}`))
      .then((request) => this.doOpenDoc(request));
  }

  doOpenDoc(request) {
    request
      .schemas('*')
      .enrichers({ document: ['acls', 'permissions'] })
      .get()
      .then((doc) => {
        function pathOf(uid) {
          if (this.onWebUI()) {
            return `ui/#!/doc/${uid}`;
          }
          return `nxdoc/default/${uid}/view_documents`;
        }
        this.serverLocator.loadNewExtensionTab(pathOf(doc.uid), true);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  suggestDocument(text, suggest) {
    if (uuidPattern.test(text)) {
      this.openDocFromId(text);
      return;
    }
    if (pathPattern.test(text)) {
      this.openDocFromPath(text);
      return;
    }
    const jsonQueryOf = (query) => {
      if (selectFromPattern.test(query)) {
        return text;
      }
      return `SELECT * FROM Document WHERE ecm:fulltext = "${text}"`;
    };
    const query = jsonQueryOf(text).replace(/'/g, '"');
    const suggestions = [];
    this.nuxeo
      .repository()
      .schemas(['dublincore', 'common', 'uid'])
      .query({
        query,
        sortBy: 'dc:modified',
      })
      .then((res) => {
        if (res.entries.length > 0) {
          res.entries.forEach((doc) => {
            const sanitizedDoc = DOMPurify.sanitize(
              `<match>${doc.title}</match> <dim>${doc.path}</dim>`,
              { ALLOWED_TAGS: ['match', 'dim'] }
            );
            suggestions.push({
              content: doc.uid,
              description: sanitizedDoc,
            });
          });
        }
        if (res.entries.length > 5) {
          const sanitizedDoc = DOMPurify.sanitize(
            '<dim>Want more results? Try the</dim> <match>fulltext searchbox</match> <dim>from the Nuxeo Dev Tools extension window.</dim>',
            { ALLOWED_TAGS: ['match', 'dim'] }
          );
          chrome.omnibox.setDefaultSuggestion({
            description: sanitizedDoc,
          });
        }
        suggest(suggestions);
      });
  }

  jsonOf(repository, path) {
    return this.worker.serverConnector.withNuxeo()
      .then((nuxeo) => nuxeo
        .request(`/repo/${repository}/${path}`)
        .schemas('*')
        .enrichers({ document: ['acls', 'permissions'] })
        .get({ resolveWithFullResponse: true })
        .then((result) => result.json()));
  }
}

export default DocumentBrowser;
