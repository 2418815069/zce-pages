// gulp的入口文件
const { series, parallel, src, dest, watch } = require('gulp')
const sass = require('gulp-sass') // 
const babel = require('gulp-babel')
const swig = require('gulp-swig') // 模板引擎转换插件,转换页面模板
const imagemin = require('gulp-imagemin') // 压缩图片
const browserSync = require('browser-sync') // 代码发生改变后自动热更新到浏览器
const bs = browserSync.create()
// const useref = require('gulp-useref') // 文件引用处理
const del = require('del') // 文件引用处理
const loadPlugins = require('gulp-load-plugins') // 处理插件
const plugins = loadPlugins()
let config = {}
const cwd = process.cwd()

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch(e) {
  console.log('erorr',e)
}
exports.guRead = () => {
  return src('src/*.css').pipe(cleanCss()).pipe(dest('dist'))
}

const clean = () => {
  return del(['dist', 'temp'])
}
const style = done => {
  return src('src/assets/styles/*.scss', { base: 'src' })
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(dest('temp'))
}
const page = () => {
  return src('src/**/*.html', { base: 'src' })
    .pipe(swig({ data: config.data }))
    .pipe(dest('temp'))
}
const image = done => {
  return src('src/assets/images/**', { base: 'src' })
    .pipe(imagemin())
    .pipe(dest('dist'))
}
const font = () => {
  return src('src/assets/fonts/**', { base: 'src' })
    .pipe(imagemin())
    .pipe(dest('dist'))
}
const script = done => {
  return src('src/assets/scripts/*.js', { base: 'src' })
    .pipe(babel({ presets: ['@babel/preset-env'] })).pipe(dest('temp'))
}
// 额外拷贝任务
const extra = () => {
  return src('public/**', { base: 'src' })
    .pipe(imagemin())
    .pipe(dest('dist'))
}
// 热更新，开发服务器
const serve = () => {
  watch('src/assets/styles/*.scss', style),
    watch('src/assets/scripts/*.js', script),
    watch('src/*.html', page),
    bs.init({
      notify: false,
      port: 2000,
      // open: false,
      files: 'dist/**',
      server: {
        baseDir: ['temp', 'dist', 'src', 'public'],
        routes: {
          '/node_modules': 'node_modules'
        }
      }
    })
}
// 压缩html css js, gulp-htmlmin(默认删除空白符) gulp-uglify gulp-clean-css
const useref = () => {
  return src('temp/**/*.html', { base: 'temp' })
    .pipe(plugins.useref({ searchPath: ['temp', '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapsewhitespace: true,
      minifyCSS: true,
      minifyJS: true
    }))) // 
    .pipe(dest('dist'))
}
// const page = done => {
//   return src('src/*.html', { base: 'src'})
//   .pipe(swig({data})).pipe(dest('dist'))
// }
// const image = done => {
//   return src('src/assets/images/**', { base: 'src'})
//   .pipe(imagemin()).pipe(dest('dist'))
// }
// const font = done => {
//   return src('src/assets/fonts/**', { base: 'src'})
//   .pipe(imagemin()).pipe(dest('dist'))
// }
// 组合5个任务，同时执行,compile对src下的目录进行转换,完成src下需要编译的文件
const compile = parallel(style, script, page, image, font)
const build = series(clean, parallel(series(compile, useref), extra)) // 先清除dist下文件，在进行编译构建
// 开发体验上的测试
const fs = require('fs')
const { Transform } = require('stream')
exports.read = (done) => {
  // 文件读取流
  const read = fs.createReadStream('common.css')
  // 文件写入流
  const write = fs.createWriteStream('common.min.css')
  // 文件转换流
  const transform = new Transform({
    transform: (chunk, encoding, callback) => {
      // 核心转换过程实现
      // chunk => 读取流中读取到的内容（Buffer)
      const input = chunk.toString()
      const output = input.replace(/\s+/g, '').replace(/\/\*.+?\*\//g, '')
      callback(null, output)
    }
  })
  // 把读取出来的文件流导入写入文件流
  read.pipe(transform) // 转换
    .pipe(write) // 写入
  return read
}
module.exports = {
  compile,
  build,
  serve,
  clean,
  useref
}