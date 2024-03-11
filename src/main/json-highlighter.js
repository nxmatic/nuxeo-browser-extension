class JsonHighlighter {
  // eslint-disable-next-line no-unused-vars
  constructor(worker) {
    this._input = '';

    // Bind methods
    this.input = this.input.bind(this);
  }

  input(input) {
    if (input) {
      this._input = input;
    }
    return new Promise((resolve, reject) => {
      if (!this.input) {
        reject(new Error('No json input text provided'));
      }
      resolve(this._input);
    });
  }
}

export default JsonHighlighter;
