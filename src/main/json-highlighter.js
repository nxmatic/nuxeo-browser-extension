class JsonHighlighter {
  // eslint-disable-next-line no-unused-vars
  constructor(worker) {
    this.inpur = '';
  }

  input(input) {
    if (input) {
      this.input = input;
    }
    return new Promise((resolve, reject) => {
      if (!this.input) {
        reject(new Error('No json input text provided'));
      }
      resolve(this.input);
    });
  }
}

export default JsonHighlighter;
