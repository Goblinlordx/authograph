import gulp from 'gulp';
import shell from 'gulp-shell';

gulp.task('watch', function() {
  gulp.watch('src/**/*.js', ['build']);
});

gulp.task('build', shell.task(['npm test']));
