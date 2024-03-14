class BrowserStore {
  constructor(namespace = 'nuxeo-browser-extension.') {
    this.namespace = namespace;

    this.keysOf = (data) => {
      if (Array.isArray(data)) {
        return data;
      }
      return Object.keys(data);
    };

    this.namespacedKeysOf = (data) => this.keysOf(data).map((key) => this.namespace + key);

    this.namespacedEntriesOf = (entries) => {
      const namespacedEntries = {};
      Object.keys(entries).forEach((key) => {
        namespacedEntries[this.namespace + key] = entries[key];
      });
      return namespacedEntries;
    };

    this.defaultsValueOf = (data, key) => {
      if (Array.isArray(data)) {
        return undefined;
      }
      if (typeof data[key] !== 'function') {
        // return the value as is
        return data[key];
      }
      // call the function to get the default value
      return data[key]();
    };

    // Bind methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  get(input) {
    // Prepend namespace to keys
    const namespacedKeys = this.namespacedKeysOf(input);

    // Retrieve from storage
    return chrome.storage.local.get(namespacedKeys).then((result) => {
      const data = {};
      const undefinedData = {};

      Object.keys(input).forEach((key) => {
        const strippedKey = key.substring(this.namespace.length);
        if (Object.prototype.hasOwnProperty.call(result, this.namespace + key)) {
          // If the key exists in the result, just strip the namespace and return
          data[strippedKey] = result[this.namespace + key];
        } else if (typeof input === 'object') {
          // If the key doesn't exist in the result and input is an object, set it to the default value
          data[strippedKey] = this.defaultsValueOf(input, strippedKey);

          // Add the key-value pair to the undefinedKeys object
          undefinedData[this.namespace + key] = data[strippedKey];
        }
      });

      // Set undefined keys and returns the completed data
      return Object.keys(undefinedData).length > 0
        ? chrome.storage.local.set(undefinedData).then(() => data)
        : Promise.resolve(data);
    });
  }

  set(entries) {
    // Prepend namespace to keys
    const namespacedEntries = this.namespacedEntriesOf(entries);

    // Save to storage
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(namespacedEntries, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Resolve the Promise with the stored data
          resolve(entries);
        }
      });
    });
  }

  remove(input) {
    // Prepend namespace to keys
    const namespacedKeys = this.namespacedKeysOf(input);
    // Get from storage
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(namespacedKeys, (items) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Get the keys that were actually found in storage
          const foundKeys = Object.keys(items);
          const itemsWithoutNamespace = {};

          // Remove from storage
          foundKeys.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(items, key)) {
              itemsWithoutNamespace[key.replace(this.namespace, '')] = items[key];
            }
          });

          chrome.storage.local.remove(foundKeys, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              // Resolve the Promise with the removed data
              resolve(itemsWithoutNamespace);
            }
          });
        }
      });
    });
  }
}

export default BrowserStore;
