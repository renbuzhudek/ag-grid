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
// browserify没有外部依赖这个配置，因此会把  @ag-grid-community/core 的代码打包进来
var watchedBrowserify = watchify(browserify({
        basedir:".",
        debug: true,//会为ts生成sourcemap  exorcist插件可以分离map
        standalone :"ClientSideRowModel",//提供生成umd模块的导出名, 如果传入连字符会强制转换为小驼峰的变量  client-side-row-model 会得到 clientSideRowModel
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