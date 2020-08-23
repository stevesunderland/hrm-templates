var $           = require('gulp-load-plugins')();
var browser     = require('browser-sync');
var gulp        = require('gulp');
var data        = require('gulp-data');
var rimraf      = require('rimraf');
var sequence    = require('run-sequence');
var fs          = require('fs')
var pug         = require('gulp-pug');
var rename      = require('gulp-rename');
var cleanCSS    = require('gulp-clean-css');
var uglify      = require('gulp-uglify');
var faker       = require('faker');



// Check for --production flag
var isProduction = true;

// Port to use for the development server.
var PORT = 8000;

// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

// File paths to various assets are defined here.
var PATHS = {
  assets: [
    'src/**/*',
    '!src/{javascript,scss,templates,content}/**/*',
    '!src/{javascript,scss,templates,content}',
    '!src/*.json'
  ],
  sass: [
    'node_modules/foundation-sites/scss',
  ],
  javascript: [
    'node_modules/jquery/dist/jquery.js',
    'node_modules/foundation-sites/dist/js/foundation.js',
    'src/javascript/app.js',
  ]
};

// Delete the "dist" folder
// This happens every time a build starts
gulp.task('clean', function(done) {
  rimraf('dist', done);
});

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
gulp.task('copy', function() {
  return gulp.src(PATHS.assets)
  .pipe(gulp.dest('dist'));
});



gulp.task('templates', function() {
  gulp.src(['src/templates/**/*.pug', '!src/templates/**/_*.pug'])
  .pipe(data(function(file) {
      return JSON.parse(fs.readFileSync('src/content.json'))
  }))
  .pipe(pug({
    locals: {
      faker: faker,
    },
    pretty: true,
  }))
  .on('error', onError)
  .pipe(gulp.dest('./dist/'))
  .on('finish', browser.reload)
});


// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', function() {

  var minifycss = $.if(isProduction, cleanCSS());

  return gulp.src('src/scss/app.scss')
  .pipe($.sourcemaps.init())
  .pipe($.sass({
    includePaths: PATHS.sass,
    // indentedSyntax: true,
    outputStyle: 'expanded'
  })
  .on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: COMPATIBILITY
  }))
  // .pipe($.if(!isProduction, $.sourcemaps.write()))
  .pipe(gulp.dest('dist/css'))
  .pipe(minifycss)
  .pipe(rename('app.min.css'))
  .pipe(gulp.dest('dist/css'))
  .pipe(browser.reload({ stream: true }))
  .on('finish', browser.reload);
});

// Combine JavaScript into one file
// In production, the file is minified
gulp.task('javascript', function() {

  return gulp.src(PATHS.javascript)
    .pipe($.sourcemaps.init())
    .pipe($.concat('app.js'))
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .on('error', onError)
    .pipe(gulp.dest('dist/js'))
    .pipe(uglify())
    .pipe(rename('app.min.js'))
    .pipe(gulp.dest('dist/js'))
    .on('error', function(err) {
      console.error('Error in compress task', err.toString());
    })
    .on('finish', browser.reload);
});


// Build the "dist" folder by running all of the above tasks
gulp.task('build', function(done) {
  sequence('clean', ['templates', 'sass', 'javascript', 'copy'], done);
});

// Start a server with LiveReload to preview the site in
gulp.task('server', ['build'], function() {

  browser.init({
    server: {
      baseDir: './dist',
      serveStaticOptions: {
        extensions: ['html']
      }
    },
    port: PORT,
    open: false,
  });
});


function onError(err) {
  console.log('ERROR')
  console.log(err);
  this.emit('end');
}


// Build the site, run the server, and watch for file changes
gulp.task('default', ['build', 'server'], function() {
  gulp.watch(PATHS.assets, ['copy']);
  gulp.watch(['src/**/*.pug'], ['templates']);
  gulp.watch(['src/scss/**/{*.scss, *.sass}'], ['sass']);
  gulp.watch(['src/javascript/**/*.js'], ['javascript']);
})
