// eslint-disable-next-line no-unused-vars
function debug(debugOptions = {}) {
  return {
    name: 'extended-debug-build',
    generateBundle(options, bundle) {
      console.log('--- generateBundle ---');
      this.bundleState = {};

      Object.keys(bundle).forEach((name) => {
        const file = bundle[name];
        console.log(`  - ${file.fileName}`);

        if (file.fileName.endsWith('.map')) {
          console.log(`    - Source map size: ${file.source.length}`);
          console.log(`    - Source map content: ${file.source.slice(0, 100)}...`); // Log first 100 characters for brevity
        }

        this.bundleState[file.fileName] = {
          code: file.code,
          sourceMap: file.source,
        };
      });
    },
    writeBundle(options, bundle) {
      console.log('--- writeBundle ---');

      Object.keys(bundle).forEach((name) => {
        const file = bundle[name];
        console.log(`  - ${file.fileName}`);

        if (file.fileName.endsWith('.map')) {
          const originalSourceMap = this.bundleState[file.fileName]?.sourceMap;
          const currentSourceMap = file.source;

          if (originalSourceMap !== currentSourceMap) {
            console.log(`    - Source map has changed for ${file.fileName}`);
            console.log(`    - Original source map content: ${originalSourceMap?.slice(0, 100)}...`);
            console.log(`    - Current source map content: ${currentSourceMap.slice(0, 100)}...`);
          } else {
            console.log(`    - Source map has not changed for ${file.fileName}`);
          }

          console.log(`    - Current source map size: ${currentSourceMap.length}`);
        }

        const originalCode = this.bundleState[file.fileName]?.code;
        const currentCode = file.code;

        if (originalCode !== currentCode) {
          console.log(`    - Code has changed for ${file.fileName}`);
          console.log(`    - Original code size: ${originalCode?.length}`);
          console.log(`    - Current code size: ${currentCode.length}`);
        } else {
          console.log(`    - Code has not changed for ${file.fileName}`);
        }
      });
    }
  };
}

export default debug;
