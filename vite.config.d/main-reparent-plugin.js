import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import * as rimraf from 'rimraf';

function mainReparent(reparentOptions = {}) {
  const {
    browserVendor, buildEntry: { root: buildEntry }, sourceDir, outputDir
  } = reparentOptions;
  const mainDir = path.resolve(outputDir, 'main');
  return {
    name: 'rename-main-service',
    generateBundle(options, chunks) {
      if (buildEntry !== 'main') return; // Only process the main entry

      console.log(`Renaming service_worker for ${browserVendor}... `);

      const manifestPath = path.resolve(sourceDir, `main/manifest-${browserVendor}.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const mainRegex = new RegExp('^main-.*.js$');

      Object.keys(chunks).forEach((name) => {
        const file = chunks[name];

        console.log(`Processing ${file.fileName}...`);

        if (mainRegex.test(file.fileName)) {
          // Update the manifest with the new service worker file name
          console.log(`Updating manifest for ${file.fileName}...`);
          manifest.background.service_worker = file.fileName;
          manifest.version = process.env.VITE_BUILD_VERSION;
          manifest.version_name = process.env.VITE_BUILD_VERSION_NAME;
        }
      });

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });
    },
    writeBundle() {
      if (buildEntry !== 'main') return; // Only process the main entry

      // Move contents of main directory to root
      fse.copySync(mainDir, outputDir);
      rimraf.sync(mainDir);
    }
  };
}

export default mainReparent;
