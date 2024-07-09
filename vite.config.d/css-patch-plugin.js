import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';

// eslint-disable-next-line no-unused-vars
function patch(patchOptions = {}) {
  return {
    name: 'patch-css',
    apply: 'build',
    writeBundle(bundleOptions, bundle) {
      Object.keys(bundle).forEach((fileName) => {
        const chunk = bundle[fileName];
        if (!(chunk.type === 'asset' && chunk.fileName.endsWith('.css'))) {
          return;
        }
        const filePath = path.join(bundleOptions.dir || '.', chunk.fileName);
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            console.error(`Error reading ${filePath}: ${err}`);
            return;
          }
          // Updated regex to exclude URLs starting with "/images/"
          const urlRegex = /url\("\/(?!images\/)(.*?)"\)/g;
          const magicString = new MagicString(data);
          let hasChanges = false;

          data.replace(urlRegex, (match, p1, offset) => {
            const originalUrl = `url("/${p1}")`;
            const fixedUrl = `url("${p1}")`;
            magicString.overwrite(offset, offset + originalUrl.length, fixedUrl);
            hasChanges = true;
            return fixedUrl;
          });

          if (!hasChanges) {
            return;
          }
          console.log(`Patching URLs in ${filePath}`);
          fs.writeFile(filePath, magicString.toString(), 'utf8', (writeErr) => {
            if (!writeErr) {
              return;
            }
            console.error(`Error writing ${filePath}: ${writeErr}`);
          });
        });
      });
    }
  };
}

export default patch;
