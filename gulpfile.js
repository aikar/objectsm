const gulp = require('gulp');
const babel = require("gulp-babel");
const path = require('path');
const rmrf = require('rimraf');
const plugins = require("gulp-load-plugins")();
const chalk = require("chalk");

const jsFiles = [
    'src/**/*.js'
];
const exampleJsFiles = [
    'example/**/*.js'
];
const allJsFiles = jsFiles.concat(exampleJsFiles);

const dist = path.join(__dirname, 'dist');

gulp.task('clean', (cb) => {
    rmrf(dist, cb);
});

gulp.task('build', gulp.series('clean', function build(cb) {
    gulp.src(jsFiles)
      .pipe(plugins.sourcemaps.init())
      .pipe(babel(require("./babel.config")))
      .pipe(plugins.sourcemaps.write('.'))
      .pipe(gulp.dest(dist))
      .on('end', () => copyFlowDefs(jsFiles, dist, cb));
}));

gulp.task('validate', () => {
    return pipeEslint(gulp.src(allJsFiles));
});

gulp.task('validate:watch', gulp.series('validate', () => {
    return gulp.watch(allJsFiles, () => {
        return pipeEslint(gulp.src(jsFiles)
          .pipe(plugins.changedInPlace()));
    });
}));

gulp.task('default', gulp.series('validate:watch'));


function copyFlowDefs(src, dest, cb) {
    gulp.src(src)
      .pipe(plugins.rename((p) => {
          p.extname += ".flow";
      }))
      .pipe(gulp.dest(dest))
      .on('end', () => {
          cb && cb();
      });
}

function pipeEslint(pipe) {
    const eslint = require('gulp-eslint');
    const log = require('gulp-util').log;
    return pipe.pipe(eslint())
      .on('end', () => {
          log(chalk.cyan('─────────────────────────────'));
          log(chalk.cyan('Validating with ESLint / Flow'));
      })
      .pipe(eslint.format())
      .pipe(eslint.results(results => {
          if (results.warningCount > 0) {
              log(chalk.yellow(`Total Warnings: ${results.warningCount}`));
          }
          if (results.errorCount > 0) {
              log(chalk.red(`Total Errors: ${results.errorCount}`));
          }
          if (results.errorCount === 0 && results.warningCount === 0) {
              log(chalk.green('Successfully validated'));
          }
          log(chalk.cyan('─────────────────────────────'));
      }));

}
