import MagicString from 'magic-string';

// eslint-disable-next-line no-unused-vars
function patchCss(options = {}) {
  return {
    name: 'patch-css',
    transform(code, id) {
      const allowedSuffixes = ['.js', '.ts'];
      const fileSuffix = id.slice(id.lastIndexOf('.'));
      if (!allowedSuffixes.some((suffix) => fileSuffix === suffix)) {
        return null; // Skip transformation for non-JS/TS files
      }
      // Separate function to handle CSS imports
      function handleCSSImports() {
        const cssImportRegex = /import\s+['"](.+\.css)['"]/g;
        code.replace(cssImportRegex, (match, cssPath, offset) => {
          const start = offset;
          const end = start + match.length;
          const replacementText = `import('${cssPath}').then(css => css.default)`;
          magicString.overwrite(start, end, replacementText);
          return replacementText; // This return value is not used since we're modifying magicString directly
        });
      }

      console.log(`Processing CSS imports in ${id}...`);

      const magicString = new MagicString(code);

      // Call the separate functions
      handleCSSImports(magicString);

      return {
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true })
      };
    }
  };
}

export default patchCss;
