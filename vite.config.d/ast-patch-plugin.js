import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as parser from '@babel/parser';
import * as types from '@babel/types';

// eslint-disable-next-line no-unused-vars
function patch(options = {}) {
  const { buildEntry: { root: buildEntry } } = options;
  return {
    name: 'ast-patcher',
    apply: 'build',
    renderChunk(code, chunk) {
      // Parse the code into an AST
      const ast = parser.parse(code, { sourceType: 'module' });

      let isModified = false;

      // Traverse the AST to find and modify the `assetsURL` function
      traverse.default(ast, {
        ImportDeclaration(path) {
          const { code: nodeCode } = generate.default(path.node);
          console.log(`Considering ${nodeCode} for CSS imports in ${chunk.fileName}`);
          const sourceValue = path.node.source.value;
          // Check if the import is a CSS file
          if (!sourceValue.endsWith('.css')) {
            return;
          }
          // Create a dynamic import expression
          const dynamicImport = types.callExpression(
            types.import(),
            [types.stringLiteral(sourceValue)]
          );
          // Wrap the dynamic import in a .then() to extract the default export
          const thenExpression = types.callExpression(
            types.memberExpression(dynamicImport, types.identifier('then')),
            [types.arrowFunctionExpression(
              [types.identifier('css')],
              types.memberExpression(types.identifier('css'), types.identifier('default'))
            )]
          );
          // Replace the original import declaration with the dynamic import expression
          path.replaceWith(thenExpression);

          console.log(`Modified dynamic CSS import in ${chunk.fileName}`);
          isModified = true;
        },
        VariableDeclarator(path) {
          const { code: nodeCode } = generate.default(path.node);
          console.log(`Considering ${nodeCode} for assetsURL in ${chunk.fileName}`);
          if (!(
            path.node.id &&
            path.node.id.name === 'assetsURL' &&
            types.isFunctionExpression(path.node.init)
          )) {
            return;
          }

          // Replace the function body directly
          path.node.init.body = types.blockStatement([
            types.returnStatement(types.identifier('dep'))
          ]);

          console.log(`Modified assetsURL function in ${chunk.fileName}`);
          isModified = true;
        },
        exit(path) {
          if (buildEntry !== 'main') return;
          try {
            if (!(
              path.isIdentifier({ name: 'window' }) &&
              path.scope.hasGlobal('window') &&
              (path.parent.type === 'MemberExpression' || path.parent.type === 'ThisExpression')
            )) {
              return;
            }
            path.node.name = 'self';
            console.log(`Modified window variable in ${chunk.fileName}`);
          } catch (error) {
            console.error(`Error generating code for node type: ${path.node.type} at position: ${path.node.start}`);
            console.error(error);
          }
        },
      });

      // Log the modification status
      if (!isModified) {
        console.log(`No modifications applied in ${chunk.fileName}`);
        return null;
      }

      // Generate the modified code from the AST
      const { code: newCode, map } = generate.default(ast, {
        sourceMaps: true,
        sourceFileName: chunk.fileName,
      });

      // Return the modified code and source map
      return { code: newCode, map };
    },
  };
}

export default patch;
