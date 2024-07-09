import fs from 'fs';
import path from 'path';
import * as rimraf from 'rimraf';
import MagicString from 'magic-string';

function reparentHtml(htmlOptions = {}) {
  const { browserVendor, buildEntry, outputDir } = htmlOptions;
  let isReparented = false; 
  return {
    name: 'reparent-bundles',
    apply: 'build',
    generateBundle(_, chunks) {
      if (!buildEntry.input.endsWith('.html')) return; // Process only html entry points

      console.log(`Reparenting html entry ${buildEntry.root} ...`);
      Object.keys(chunks).forEach((name) => {
        const file = chunks[name];
        file.fileName = file.fileName.replace('index/', '');
        console.log(`  - ${file.fileName}...`);
        isReparented = true;
      });
    },
    // eslint-disable-next-line no-unused-vars
    writeBundle(options, bundle) {
      if (!isReparented) return; // Only process if html bundles were reparented  

      const resolvePath = (filePath) => path.resolve(outputDir, `${buildEntry.root}/${filePath}`);
      // Move index.html to root and update script source
      const htmlFilePath = resolvePath(`src/${buildEntry.root}/index.html`);
      fs.promises.readFile(htmlFilePath, 'utf-8')
        .then((data) => {
          const magicString = new MagicString(data);
          const matches = [...data.matchAll(/"\/(index[^"]*)"/g)];
          matches.forEach((match) => {
            const start = match.index;
            const end = start + match[0].length;
            magicString.overwrite(start, end, `"./${match[1]}"`);
          });
          return magicString.toString(); // Use the modified content
        })
        .then((modifiedHtmlContent) => {
          fs.promises.writeFile(resolvePath('index.html'), modifiedHtmlContent);
          return fs.promises.unlink(htmlFilePath);
        })
        .then(() => {
          // Remove src directory
          rimraf.sync(resolvePath('src'));
        })
        .catch((err) => {
          console.error(`Got an error trying to read or write the file: ${err.message}`);
        });
    }
  };
}

export default reparentHtml;
