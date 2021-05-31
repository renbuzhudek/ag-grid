const gulp = require('gulp');
const { series, parallel } = gulp;
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
const clean = require('gulp-clean');
const typescript = require('typescript');
const watchify = require("watchify");
const gutil = require("gulp-util");

const cleanDist = () => {
    return gulp
        .src('dist', { read: false, allowEmpty: true })
        .pipe(clean());
};
gulp.task('clean', cleanDist);

var watchedBrowserify = watchify(browserify({
        basedir:".",
        debug: true,//会为ts生成sourcemap  exorcist插件可以分离map
        standalone :"ClientSideRowModelModule",//提供生成umd模块的导出名
        entries: ['src/main.ts'],//入口文件
        cache: {},
        packageCache: {}
    })
    // .external(['@ag-grid-community/core'])
    .plugin(tsify,{
        project :"./tsconfig.json",//ts配置文件目录
        typescript:typescript
    }))

const  bundle =() => {
    return watchedBrowserify
        .bundle()
        .pipe(source('client-side-row-model.umd.js'))
        .pipe(gulp.dest("dist"));
}
gulp.task("default",series("clean", bundle));
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", e=>{
    gutil.log(e);
});