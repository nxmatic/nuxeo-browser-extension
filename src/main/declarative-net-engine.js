/* eslint-disable max-classes-per-file */

class BaseRule {
  constructor() {
    this.id = -1;
    this.priority = 1;
  }
}

class CookieHeaderRule extends BaseRule {
  constructor(rootUrl = 'https://connect.nuxeo.com', cookieHeader) {
    super();
    this.cookieHeader = cookieHeader;
    this.rootUrl = rootUrl;
  }

  // eslint-disable-next-line class-methods-use-this
  keyOf() {
    return 'cookieHeader';
  }

  toJson(id = 1, priority = 1) {
    this.id = id;
    this.priority = priority;
    return {
      id: this.id,
      priority: this.priority,
      condition: {
        urls: [`${this.rootUrl}/*`],
      },
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Cookie',
            operation: 'set',
            value: this.cookieHeader,
          },
        ],
      },
    };
  }
}

class RedirectRule extends BaseRule {
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
  }

  keyOf() {
    return this.from;
  }

  toJson(id = 1, priority = 1) {
    return {
      id,
      priority,
      condition: {
        urlFilter: this.from,
        resourceTypes: ['main_frame', 'sub_frame'],
      },
      action: {
        type: 'redirect',
        redirect: { url: this.to },
      },
    };
  }
}

class DeclarativeNetEngine {
  constructor(worker) {
    this.worker = worker;
    this.rules = {};
    this.rulesToAdd = [];
    this.rulesToRemove = [];
    this.nextId = 1;

    // Bind methods
    this.clear = this.clear.bind(this);
    this.push = this.push.bind(this);
    this.pop = this.pop.bind(this);
    this.flush = this.flush.bind(this);
    this.flushed = this.flushed.bind(this);
    this.pending = this.pending.bind(this);
    this.reset = this.reset.bind(this);

    // Initialize the engine
    this.reset();
  }

  push(rule) {
    rule.id = this.nextId;
    this.rules[rule.keyOf()] = rule;
    this.rulesToAdd.push(rule);
    this.nextId += 1;
    this.worker.developmentMode.asConsole().then((console) => console.log(`Pushed rule: ${JSON.stringify(rule.toJson())}`));
  }

  pop(key) {
    const rule = this.rules[key];
    delete this.rules[key];
    this.rulesToRemove.push(rule);
    this.worker.developmentMode.asConsole().then((console) => console.log(`Popped rule: ${JSON.stringify(rule.toJson())}`));
    return rule;
  }

  flush() {
    return this.pending()
      .then((pending) => chrome.declarativeNetRequest
        .updateDynamicRules(pending))
      .then(() => {
        // Clear the lists after the changes have been submitted
        this.rulesToAdd = [];
        this.rulesToRemove = [];
      })
      .then(() => this.flushed())
      .catch((error) => console.error('Failed to flush rules:', error));
  }

  flushed() {
    return Promise.resolve()
      .then(() => chrome.declarativeNetRequest.getDynamicRules())
      .then((rules) => {
        this.worker.developmentMode.asConsole()
          .then((console) => console.log(`Flushed rules: ${JSON.stringify(rules)}`));
        return rules;
      });
  }

  pending() {
    return Promise.resolve({
      addRules: this.rulesToAdd.map((rule) => rule.toJson()),
      removeRuleIds: this.rulesToRemove.map((rule) => rule.id),
    })
      .then((pending) => {
        this.worker.developmentMode.asConsole()
          .then((console) => console.log(`Pending rules: ${JSON.stringify(pending)}`));
        return pending;
      });
  }

  clear() {
    this.rulesToRemove.push(...Object.values(this.rules));
    this.rules = {};
    return this.flush();
  }

  reset() {
    this.rules = {};
    this.rulesToAdd = [];
    this.rulesToRemove = [];
    this.nextId = 1;
    return chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
      const ruleIds = rules.map((rule) => rule.id);
      return chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIds });
    }).catch((error) => {
      console.error('Failed to remove dynamic rules:', error);
    });
  }
}

export default { CookieHeaderRule, RedirectRule, DeclarativeNetEngine };
