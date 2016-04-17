import gulp from 'gulp';
import shell from 'gulp-shell';

gulp.task('watch', () => {
  gulp.watch('src/**/*.js', [ 'build' ]);
});

gulp.task('watch-report', () => {
  gulp.watch('src/**/*.js', ['lcov']);
});

gulp.task('lcov', shell.task([ 'npm run test-report' ]));

gulp.task('build', shell.task([ 'npm test' ]));
