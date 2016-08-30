// generated on 2016-03-11 using generator-chrome-extension 0.5.4
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';
import {stream as wiredep} from 'wiredep';
import es from 'event-stream';
import concat from 'gulp-concat'

const $ = gulpLoadPlugins();

function pipe(src, transforms, dest) {
	if (typeof transforms === 'string') {
		dest = transforms;
		transforms = null;
	}

	var stream = gulp.src(src);
	transforms && transforms.forEach(function(transform) {
		stream = stream.pipe(transform);
	});

	if (dest) {
		stream = stream.pipe(gulp.dest(dest));
	}

	return stream;
}

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    'app/libs/**',
    '!app/scripts.babel',
    '!app/*.json',
    '!app/*.html',
  ], {
    base: 'app',
    dot: true
  }).pipe(gulp.dest('dist/chrome'))
    .pipe(gulp.dest('dist/firefox'));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format());
  };
}

gulp.task('lint', lint('app/scripts.babel/**/*.js', {
  env: {
    es6: true
  }
}));

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/chrome/images'))
    .pipe(gulp.dest('dist/firefox/images'));
});

gulp.task('background-chrome', () => {
  return gulp.src(['app/bower_components/nuxeo/dist/nuxeo.js', 'app/vendor/chrome/chrome-bkg.js', 'app/scripts/bkg.js'])
    .pipe(concat('background.js'))
    .pipe($.if('*.js$', $.uglify()))
    .pipe(gulp.dest('dist/chrome/scripts/'));
});

gulp.task('background-ff', () => {
  return gulp.src(['app/bower_components/nuxeo/dist/nuxeo.js', 'app/vendor/firefox/ff-bkg.js', 'app/scripts/bkg.js'])
    .pipe(concat('background.js'))
    .pipe($.if('*.js$', $.uglify()))
    .pipe(gulp.dest('dist/firefox/scripts/'));
});

// Copying MANIFEST.JSON TWICE -- when adding again, don't forget 'build' task
gulp.task('chrome', () => {
  return es.merge(
    pipe('app/libs/**/*', 'dist/chrome/libs'),
    pipe('app/images/**/*', 'dist/chrome/images'),
    pipe('app/scripts/**/*', 'dist/chrome/scripts'),
    pipe('app/styles/**/*', 'dist/chrome/styles'),
    pipe('app/vendor/chrome/browser.js', 'dist/chrome/scripts'),
    pipe('app/vendor/chrome/manifest.json', 'dist/chrome')
  );
  // return gulp.src('app/vendor/chrome/*')
  //   .pipe(gulp.dest('dist/chrome'));
});

gulp.task('firefox', () => {
  return es.merge(
    pipe('app/libs/**/*', 'dist/firefox/libs'),
    pipe('app/images/**/*', 'dist/firefox/images'),
    pipe('app/scripts/**/*', 'dist/firefox/scripts'),
    pipe('app/styles/**/*', 'dist/firefox/styles'),
    pipe('app/vendor/firefox/browser.js', 'dist/firefox/scripts'),
    pipe('app/vendor/firefox/index.js', 'dist/firefox'),
    pipe('app/vendor/firefox/manifest.json', 'dist/firefox')
  );
  // return gulp.src('app/vendor/firefox/*')
  //   .pipe(gulp.dest('dist/firefox'));
});

gulp.task('html',  () => {
  return gulp.src('app/*.html')
    .pipe($.sourcemaps.init())
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
    .pipe($.sourcemaps.write())
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
    .pipe(gulp.dest('dist/chrome'))
    .pipe(gulp.dest('dist/firefox'));
});

// gulp.task('content', () => {
//   return gulp.src('scripts/contentscript.js')
//     .pipe(gulp.dest('dist/chrome/scripts'));
// });

gulp.task('bump', () => {
  return gulp.src('app/vendor/chrome/manifest.json')
    .pipe($.chromeManifest({
      buildnumber: true,
      background: {
        target: 'scripts/background.js',
        exclude: [
          'scripts/chromereload.js'
        ]
      }
  }))
  .pipe(gulp.dest('app/vendor/chrome'));
});

gulp.task('release', (cb) => {
  let manifest = require('./app/vendor/chrome/manifest.json');
  let [major, minor, build] = manifest.version.split('\.')
  let version = `${major}.${parseInt(minor) + 1}.0`

  gulp.src('app/vendor/chrome/manifest.json')
    .pipe($.chromeManifest({
      buildnumber: version,
      background: {
        target: 'scripts/background.js',
        exclude: [
          'scripts/chromereload.js'
        ]
      }
  }))
  .pipe(gulp.dest('app/vendor/chrome'));

  runSequence('build', 'package', cb);
});

gulp.task('babel', () => {
  return gulp.src('app/scripts.babel/**/*.js')
      .pipe($.babel({
        presets: ['es2015']
      }))
      .pipe(gulp.dest('app/scripts'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['lint', 'babel', 'html', 'chrome', 'firefox', 'background-chrome', 'background-ff'], () => {
  $.livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/libs/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json',
    'app/vendor/**/*'
  ]).on('change', $.livereload.reload);

  gulp.watch('app/scripts.babel/**/*.js', ['lint', 'babel']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('size', () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('wiredep', () => {
  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app/chrome'))
    .pipe(gulp.dest('app/firefox'));
});

gulp.task('package', ['bump'], function () {
  var manifest = require('./dist/chrome/manifest.json');
  return gulp.src('dist/chrome/**')
      .pipe($.zip('Nuxeo Extension-' + manifest.version + '.zip'))
      .pipe(gulp.dest('package'));
});

gulp.task('build', (cb) => {
  runSequence(
    'lint', 'babel', 'chrome', 'firefox', 'background-chrome', 'background-ff',
    ['html', 'images', 'extras'],
    'size', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
