import babel from 'gulp-babel';
import cheerio from 'gulp-cheerio';
import concat from 'gulp-concat';
import del from 'del';
import eslint from 'gulp-eslint';
import filter from 'gulp-filter';
import fs from 'fs';
import gulp from 'gulp';
import insert from 'gulp-insert';
import jsonEditor from 'gulp-json-editor';
import livereload from 'gulp-livereload';
import minimist from 'minimist';
import modifyFile from 'gulp-modify-file';
import moment from 'moment';
import path from 'path';
import prettier from 'gulp-prettier';
import replace from 'gulp-replace';
import size from 'gulp-size';
import sourcemaps from 'gulp-sourcemaps';
import terser from 'gulp-terser';
import through2 from 'through2';
import util from 'gulp-util';
import zip from 'gulp-zip';

const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'test' },
};
const options = minimist(process.argv.slice(2), knownOptions);
const test = options.env;
const copyrighted = [
  'app/*.html',
  'app/scripts/*.js',
  'app/scripts/bkg/*.js',
  'app/vendor/chrome/*.js',
  'app/vendor/firefox/*.js',
  'test/features/step_definitions/*.js',
  'test/*.js',
  './LICENSE.txt',
];

// Insert a comment when mangling files
function insertEOFComment() {
  return insert.transform((contents, file) => `${contents}\n\n/* EOF path=${path.basename(file.path)} */\n\n`);
}

let version = '0.0.0';

// Create WIP build version based on date and time
function buildNumber() {
  // Ensure build number is the same if FF and Chrome are built together.
  return moment.utc().format('DDMM.HHmm');
}

// Get version from manifest
function readVersion(vendor) {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.resolve(`./app/vendor/${vendor}/manifest.json`),
      'utf8',
    ),
  );
  return manifest.version.split('.');
}

// Get version from tag
function readTagVersion() {
  // Read the version from the env variable
  const tagVersion = process.env.TAG_VERSION;
  // Remove the tag prefix to keep only the 'X.X.X'
  const regEx = /[0-9]+.[0-9]+.[0-9]+/g;
  return tagVersion.match(regEx)[0];
}

// Create timestamped build version
function buildVersion(vendor) {
  const [major, minor] = readVersion(vendor);
  return `${major}.${minor}.${buildNumber()}`;
}

// Increment fix version
// eslint-disable-next-line no-unused-vars
function fixVersion(vendor) {
  const [major, minor, build] = readVersion(vendor);
  return `${major}.${minor}.${parseInt(build) + 1}`;
}

// Increment minor version
// eslint-disable-next-line no-unused-vars
function minorVersion(vendor) {
  const [major, minor] = readVersion(vendor);
  return `${major}.${parseInt(minor) + 1}.0`;
}

// Increment major version
// eslint-disable-next-line no-unused-vars

function majorVersion(vendor) {
  const [major] = readVersion(vendor);
  return `${parseInt(major) + 1}.0.0`;
}

// Google manifest v2 elements
function googleManifestV2() {
  return {
    manifest_version: 2,
    background: {
      scripts: ['scripts/background.js'],
      persistent: true,
    },
  };
}

// Google manifest v3 elements
function googleManifestV3() {
  return {
    manifest_version: 3,
    background: {
      service_worker: 'scripts/background.js',
    },
  };
}

function lint(files) {
  try {
    fs.mkdirSync('build');
    fs.writeFileSync('checkstyle-result.xml');
  } catch (err) {
    return;
  } finally {
    // eslint-disable-next-line consistent-return, no-unsafe-finally
    return () => gulp.src(files)
      .pipe(eslint({
        configFile: '.eslintrc',
      }))
      .pipe(eslint.format());
  }
}

// eslint-disable-next-line no-unused-vars
function prependScript(node, file) {
  node.prepend(`<script src="${file}"></script>`);
}

function appendScript(node, file) {
  node.append(`<script src="${file}"></script>`);
}

function updateCopyright(source) {
  const year = new Date().getFullYear();
  const dest = source.substring(0, source.lastIndexOf('/')) || './';
  return gulp
    .src(source)
    .pipe(replace(/Copyright ?(.+) Nuxeo/g, `Copyright 2016-${year} Nuxeo`))
    .pipe(gulp.dest(dest));
}

gulp.task('copyright', (done) => {
  copyrighted.forEach((file) => updateCopyright(file));
  done();
});

gulp.task(
  'lint',
  lint([
    'app/scripts/*.js',
    'app/vendor/**/*.js',
    'test*/features/step_definitions/*.js',
    'test*/features/step_definitions/support/**/*.js',
  ]),
);

gulp.task('extras', () => gulp
  .src(
    [
      'app/*.*',
      'app/_locales/**',
      '!app/vendor',
      '!app/scripts',
      '!app/*.json',
      '!app/*.html',
    ],
    {
      base: 'app',
      dot: true,
    },
  )
  .pipe(gulp.dest('build/base')));

gulp.task('libs', () => gulp
  .src(
    [
      'libs/**',
      '!libs/highlight.js',
    ],
    {
      base: 'libs',
      dot: true,
    },
  )
  .pipe(gulp.dest('build/base')));

gulp.task('styles', () => gulp.src('app/styles/*.css').pipe(gulp.dest('build/base/styles')));

gulp.task('images', () => gulp.src('app/images/*').pipe(gulp.dest('build/base/images')));

gulp.task('babel:bkg', () => gulp
  .src('app/scripts/bkg/*.js')
  .pipe(insertEOFComment())
  .pipe(concat('bkg.js'))
  .pipe(
    babel({
      presets: ['@babel/env'],
    }),
  )
  .pipe(prettier({ singleQuote: true }))
  .pipe(gulp.dest('build/base.babel')));

gulp.task('babel:base', gulp.series('babel:bkg', () => gulp
  .src('app/scripts/*.js')
  .pipe(
    babel({
      presets: ['@babel/env'],
    }),
  )
  .pipe(prettier({ singleQuote: true }))
  .pipe(gulp.dest('build/base.babel'))));

gulp.task('babel:vendor:chrome', () => gulp
  .src('app/vendor/chrome/*.js')
  .pipe(
    babel({
      presets: ['@babel/env'],
    }),
  )
  .pipe(prettier({ singleQuote: true }))
  .pipe(gulp.dest('build/chrome.babel')));

gulp.task('babel:vendor:firefox', () => gulp
  .src('app/vendor/firefox/*. js')
  .pipe(
    babel({
      presets: ['@babel/env'],
    }),
  )
  .pipe(prettier({ singleQuote: true }))
  .pipe(gulp.dest('build/firefox.babel')));

gulp.task('manifest:firefox', () => gulp
  .src('app/vendor/firefox/manifest.json')
  .pipe(
    jsonEditor((json) => {
      // Choose the correct function based on MANIFEST_VERSION
      const updateFunction = process.env.MANIFEST_VERSION === 'v2'
        ? googleManifestV2
        : googleManifestV3;

      // Merge the changes into the existing JSON
      return {
        ...json,
        ...updateFunction(json),
      };
    }),
  )
  .pipe(gulp.dest('build/firefox')));

gulp.task('manifest:chrome', () => gulp
  .src('app/vendor/chrome/manifest.json')
  .pipe(
    jsonEditor((json) => {
      // Choose the correct function based on MANIFEST_VERSION
      const updateFunction = process.env.MANIFEST_VERSION === 'v2'
        ? googleManifestV2
        : googleManifestV3;

      // Merge the changes into the existing JSON
      return {
        ...json,
        ...updateFunction(json),
      };
    }),
  )
  .pipe(gulp.dest('build/chrome')));

gulp.task('manifest', gulp.parallel('manifest:firefox', 'manifest:chrome'));

gulp.task(
  'babel:vendor',
  gulp.parallel('babel:vendor:chrome', 'babel:vendor:firefox', 'manifest'),
);

gulp.task(
  'babel',
  gulp.series('lint', gulp.parallel('babel:base', 'babel:vendor')),
);

gulp.task('vendor:chrome', () => gulp
  .src(['app/vendor/chrome/browser.js', 'build/base.babel/*.js'])
  .pipe(gulp.dest('build/chrome/scripts')));

gulp.task('vendor:firefox', () => gulp
  .src(['app/vendor/firefox/browser.js', 'build/base.babel/*.js'])
  .pipe(gulp.dest('build/firefox/scripts')));

gulp.task('html', () => gulp.src('app/*.html').pipe(gulp.dest('build/base')));

gulp.task('background:chrome', () => (
  gulp
    .src([
      './node_modules/webextension-polyfill/dist/browser-polyfill.js',
      './node_modules/nuxeo/nuxeo.js',
      './node_modules/purify/lib/purify.js',
      './app/vendor/chrome/bkg.js',
      './build/base.babel/bkg.js',
    ])
    .pipe(insertEOFComment())
    .pipe(sourcemaps.init())
    .pipe(concat('background.js'))
  // .pipe(terser.default())
  // .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/chrome/scripts'))
));

gulp.task('background:firefox', () => gulp
  .src([
    'node_modules/nuxeo/nuxeo.js',
    'app/vendor/firefox/bkg.js',
    'build/base.babel/bkg.js',
  ])
  .pipe(insertEOFComment())
  .pipe(sourcemaps.init())
  .pipe(concat('background.js'))
  .pipe(terser.default())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('build/firefox/scripts')));

gulp.task(
  'build:base',
  gulp.series(
    'babel',
    gulp.parallel('background:chrome', 'background:firefox'),
    gulp.parallel('vendor:chrome', 'vendor:firefox'),
    gulp.parallel('libs', 'images', 'extras', 'styles', 'html'),
  ),
);

gulp.task('build:chrome:version', (done) => {
  version = buildVersion('chrome');
  done();
});

gulp.task('build:chrome:base', () => {
  util.log(`Building Chrome Extension: ${version}`);
  return gulp
    .src('build/base/**/*')
    .pipe(filter(['**', '!**/bkg.js']))
    .pipe(filter(['**', '!**/about.html']))
    .pipe(filter(['**', '!**/json.html']))
    .pipe(gulp.dest('build/chrome'));
});

gulp.task('build:chrome:about', () => gulp
  .src('build/base/about.html')
  .pipe(
    cheerio(($) => {
      $('#version').text(`Version ${version}`);
    }),
  )
  .pipe(gulp.dest('build/chrome')));

gulp.task('build:chrome:json', () => gulp
  .src('build/base/json.html')
  .pipe(
    cheerio(($) => {
      const $body = $('body');
      appendScript($body, 'libs/highlight.js');
    }),
  )
  .pipe(gulp.dest('build/chrome')));

gulp.task('build:chrome:highlight', () => gulp.src('libs/highlight.js').pipe(gulp.dest('build/chrome/libs')));

gulp.task(
  'build:chrome',
  gulp.series(
    'build:chrome:base',
    'build:chrome:about',
    'build:chrome:json',
    'build:chrome:highlight',
  ),
);

gulp.task('build:firefox:version', (done) => {
  version = buildVersion('firefox');
  done();
});

gulp.task('build:firefox:base', () => {
  if (version.length < 1) {
    version = buildVersion('firefox');
  }
  util.log(`Building Firefox Extension: ${version}`);
  return gulp
    .src('build/base/**/*')
    .pipe(filter(['**', '!**/bkg.js']))
    .pipe(filter(['**', '!**/about.html']))
    .pipe(gulp.dest('build/firefox'));
});

gulp.task('build:firefox:about', () => gulp
  .src('build/base/about.html')
  .pipe(
    cheerio(($) => {
      $('#version').text(`Version ${version}`);
    }),
  )
  .pipe(gulp.dest('build/firefox')));

gulp.task(
  'build:firefox',
  gulp.series('build:firefox:base', 'build:firefox:about'),
);

gulp.task('version:chrome', () => gulp
  .src('build/chrome/manifest.json')
  .pipe(jsonEditor({ version }))
  .pipe(gulp.dest('build/chrome')));

gulp.task('version:firefox', () => gulp
  .src('build/firefox/manifest.json')
  .pipe(jsonEditor({ version }))
  .pipe(gulp.dest('build/firefox')));

gulp.task('zip:chrome', () => {
  const filename = `BrowserDeveloperExtension-Chrome-${version}.zip`;
  util.log(`Building file: ${filename}`);
  return gulp
    .src('build/chrome/**')
    .pipe(zip(filename))
    .pipe(gulp.dest('dist'));
});

gulp.task('zip:firefox', () => {
  const filename = `BrowserDeveloperExtension-Firefox-${version}.zip`;
  util.log(`Building file: ${filename}`);
  return gulp
    .src('build/firefox/**')
    .pipe(zip(filename))
    .pipe(gulp.dest('dist'));
});

gulp.task(
  'release:chrome',
  gulp.series('build:chrome', 'version:chrome', 'zip:chrome'),
);

gulp.task(
  'release:firefox',
  gulp.series('build:firefox', 'version:firefox', 'zip:firefox'),
);

gulp.task('clean', () => del(['.tmp', 'build', 'dist', 'test*/screenshots/*.png']));

gulp.task('size', () => gulp.src('build/**/*').pipe(
  size({
    title: 'build',
    gzip: true,
  }),
));

gulp.task(
  'build',
  gulp.series(
    'build:base',
    gulp.parallel('build:firefox', 'build:chrome'),
    gulp.parallel('build:firefox:version', 'build:chrome:version'),
    'size',
  ),
);

gulp.task('watch:tasks', (done) => {
  livereload.listen();
  gulp
    .watch([
      'app/*.html',
      'libs/**/*.js',
      'app/images/**/*',
      'app/styles/**/*',
      'app/_locales/**/*.json',
      'app/vendor/**/*.js',
      'app/scripts/*.js',
      'app/scripts/bkg/*.js',
    ])
    .on(
      'change',
      gulp.series(
        'clean',
        'build:base',
        'build:chrome:version',
        'build:chrome',
      ),
    );
  gulp.watch(['build/chrome/**/']).on('change', () => {
    livereload.reload;
  });
  done();
});

gulp.task('watch:lint', (done) => {
  livereload.listen();
  gulp
    .watch([
      'app/*.html',
      'libs/**/*.js',
      'app/images/**/*',
      'app/styles/**/*',
      'app/_locales/**/*.json',
      'app/vendor/**/*.js',
      'app/scripts/*.js',
      'app/scripts/bkg/*.js',
      'test*/features/step_definitions/*.js',
      'test*/features/step_definitions/support/**/*.js',
    ])
    .on('change', gulp.series('lint'));
  done();
});

gulp.task(
  'watch',
  gulp.series(
    'build:base',
    'build:chrome:version',
    'build:chrome',
    'watch:tasks',
  ),
);

gulp.task('package:chrome', gulp.series('build:chrome', 'zip:chrome'));

gulp.task('package:firefox', gulp.series('build:firefox', 'zip:firefox'));

gulp.task('version:tagVersion', (done) => {
  version = readTagVersion();
  done();
});

gulp.task('default', gulp.series('clean', 'build'));

gulp.task(
  'package',
  gulp.series('build:base', gulp.parallel('package:chrome', 'package:firefox')),
);

gulp.task(
  'release',
  gulp.series(
    'clean',
    'build:base',
    'version:tagVersion',
    gulp.parallel('release:chrome', 'release:firefox'),
  ),
);

gulp.task('zip:source', () => {
  const filename = `BrowserDeveloperExtension-SourceCode-${version}.zip`;
  util.log(`Building file: ${filename}`);
  return gulp
    .src(['./**', '!/dist/**', '!/build/**', '!./node_modules/**', '!.git*', '!./.git/**'])
    .pipe(zip(filename))
    .pipe(gulp.dest('dist'));
});

gulp.task('create-source-archive', gulp.series('clean', 'zip:source'));
