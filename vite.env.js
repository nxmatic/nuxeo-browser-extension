// vite.env.mjs
import fs from 'fs';
import path from 'path';

const browserVendor = process.argv[2];
const browserManifestPath = path.resolve(process.cwd(), `src/main/manifest-${browserVendor}.json`);

const buildVersion = JSON.parse(fs.readFileSync(browserManifestPath, 'utf-8')).version;

const env = {
  VITE_BROWSER_VENDOR: browserVendor,
  VITE_BUILD_TIMESTAMP: Date.now(),
  VITE_BUILD_VERSION: buildVersion,
  VITE_DEVELOPMENT_MODE: process.env.NODE_ENV === 'development',
};

const content = Object.entries(env)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(path.resolve(process.cwd(), `.env.${browserVendor}`), content);
