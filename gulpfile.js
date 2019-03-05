const gulp = require("gulp"),
  sass = require("gulp-sass"),
  browserSync = require("browser-sync").create(),
  imagemin = require("gulp-imagemin"),
  htmlmin = require("gulp-htmlmin"),
  removeEmptyLines = require("gulp-remove-empty-lines"),
  del = require("del"),
  concat = require("gulp-concat"),
  sourcemaps = require("gulp-sourcemaps"),
  cache = require("gulp-cache"),
  gcmq = require("gulp-group-css-media-queries"),
  plumber = require("gulp-plumber"),
  uglify = require("gulp-uglify"),
  order = require("gulp-order"),
  rename = require("gulp-rename"),
  htmlhint = require("gulp-htmlhint"),
  inject = require("gulp-inject"),
  runSequence = require("run-sequence"),
  postcss = require("gulp-postcss"),
  csso = require("postcss-csso"),
  sassGlob = require("gulp-sass-glob"),
  postcssFallback = require("postcss-color-rgba-fallback"),
  postcssFlexBugsFixes = require("postcss-flexbugs-fixes"),
  autoprefixer = require("autoprefixer"),
  svgstore = require("gulp-svgstore"),
  mozjpeg = require("imagemin-mozjpeg"),
  webp = require("gulp-webp"),
  pngquant = require("imagemin-pngquant"),
  cssnano = require("cssnano"),
  watch = require("gulp-watch");

// Server connect
gulp.task("browserSync", function () {
  browserSync.init({
    server: "./src",
    injectChanges: true,
    notify: false,
    open: false
  });
});

gulp.task("clean", ["cache"], function () {
  del.sync([
    "./docs/*"
  ], { force: true });
});

gulp.task("cache", function () {
  return cache.clearAll();
});

gulp.task("default", ["clean", "html", "js", "sass"], function () {
  gulp.start("watch");
});

// html
gulp.task("html", function () {
  return gulp.src("./src/*.html")
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(htmlhint.reporter());
});

// inject
gulp.task("inject", function () {
  const sources = gulp.src(["./src/js/*.js", "./src/css/*.css"], { read: false });

  return gulp.src("./src/*.html")
    .pipe(inject(sources, {
      relative: false,
      ignorePath: "/src",
      addRootSlash: false
    }))
    .pipe(gulp.dest("./src"))
});

// sass
gulp.task("sass", function () {
  const plugins = [
    postcssFlexBugsFixes(),
    postcssFallback(),
    autoprefixer({
      browsers: ["last 2 versions"],
      cascade: false
    }),
    cssnano()
  ];

  return gulp.src("./src/scss/style.scss")
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass.sync({
      outputStyle: "expanded"
    }).on("error", sass.logError))
    .pipe(gcmq())
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./src/css"))
    .pipe(browserSync.stream());
});

// js
gulp.task("js", function () {
  return gulp.src(["!./src/js/*.js", "./src/js/**/*.js"])
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(order([
      "libs/*.js",
      "plugins/*.js",
      "components/*.js"
    ]))
    .pipe(concat("main.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./src/js"));
});

gulp.task("webp", function () {
  return gulp.src("./src/img/**/*.+(png|jpg|jpeg)")
    .pipe(webp({ quality: 90 }))
    .pipe(gulp.dest("./src/img"));
});

gulp.task("image", function () {
  return gulp.src("./src/img/**/*.+(jpg|jpeg|png)")
    .pipe(imagemin([
      mozjpeg({ quality: 85 }),
      pngquant({ quality: [0.8, 0.9] })
    ]))
    .pipe(gulp.dest("./src/img"));
});

gulp.task("svg", function () {
  return gulp.src("./src/img/**/icon-*.svg")
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("./src/img"));
});

gulp.task("img", ["image", "webp"], function () {
  return gulp.src("./src/img/**/*.+(png|jpg|jpeg|svg|gif)")
    .pipe(imagemin([
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.jpegtran({ progressive: true }),
      imagemin.gifsicle({ interlaced: true }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(gulp.dest("./src/img"));
});


// build
gulp.task("build", ["clean", "copy", "html", "js", "sass", "img"], function () {
  runSequence("css:build", "js:build", "html:build");
});

// fonts
gulp.task("fonts", function () {
  return gulp.src(["./src/fonts/**/*.+(woff|woff2|ttf|eot)"])
    .pipe(gulp.dest("./docs/fonts"));
});

gulp.task("copy", ["fonts"], function () {
  return gulp.src([
    "!./src/*.html",
    "./src/*.*",
    "./src/img/**/*.+(png|jpg|jpeg|svg|gif)"
  ], {
      base: "./src"
    })
    .pipe(gulp.dest("./docs"));
});

gulp.task("css:build", function () {
  const plugins = [
    csso()
  ];
  return gulp.src("./src/css/*.css")
    .pipe(postcss(plugins))
    .pipe(gulp.dest("./docs/css"));
});

gulp.task("js:build", function () {
  return gulp.src("./src/js/*.js")
    .pipe(uglify())
    .pipe(gulp.dest("./docs/js"));
});

gulp.task("html:build", function () {
  return gulp.src("./src/*.html")
    .pipe(htmlmin({
      sortClassName: true,
      sortAttributes: true,
      caseSensitive: true,
      removeComments: true,
      collapseWhitespace: true
    }))
    .pipe(removeEmptyLines())
    .pipe(gulp.dest("./docs"));
});

// watch
gulp.task("watch", ["browserSync", "inject"], function () {
  watch("./src/*.html", function () {
    gulp.start("html");
    browserSync.reload();
  });

  watch("./src/js/**/*.js", function () {
    gulp.start("js");
    browserSync.reload();
  });

  watch("./src/scss/**/*.scss", function () {
    setTimeout(function () {
      gulp.start("sass");
      browserSync.reload();
    }, 100);
  });
});
