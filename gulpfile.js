// Плагин для includes файлов через @@include('nameFile.resolutionFile')
const fileinclude = require('gulp-file-include');

// Папка в которую будет сделана конвертация
let project_folder = "dist";

// Папка dist будет называться так же как и основная в которой все содержимое проекта
// let project_folder = require("path").basename(__dirname);

// Папка исходников
let source_folder = "#src";

// Модуль для работы с файлами
let fs = require("fs");

// Пути для работы Gulp
let path = {
   build: {
      html: project_folder + "/",
      css: project_folder + "/css/",
      js: project_folder + "/js/",
      lib: project_folder + "/lib/",
      img: project_folder + "/img/",
      fonts: project_folder + "/fonts/"
   },
   src: {
      html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
      css: source_folder + "/scss/style.scss",
      js: source_folder + "/js/script.js",
      lib: source_folder + "/lib/**/*.*",
      img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
      fonts: source_folder + "/fonts/*.ttf"
   },
   watch: {
      html: source_folder + "/**/*.html",
      css: source_folder + "/scss/**/*.scss",
      js: source_folder + "/js/**/*.js",
      lib: source_folder + "/lib/**/*.*",
      img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}"
   },
   clean: "./" + project_folder + "/"
};

// Плагины для работы 
let { src, dest } = require('gulp'),
   gulp = require('gulp'),
   browsersync = require('browser-sync').create(),
   fileInclude = require('gulp-file-include'),
   del = require('del'),
   scss = require('gulp-sass'),
   autoprefixer = require('gulp-autoprefixer'),
   group_media = require('gulp-group-css-media-queries'),
   clean_css = require('gulp-clean-css'),
   rename = require('gulp-rename'),
   uglify = require('gulp-uglify-es').default,
   imagemin = require('gulp-imagemin'),
   webp = require('gulp-webp'),
   webphtml = require('gulp-webp-html'),
   webpconverter = require('webp-converter'),
   webpcss = require('gulp-webpcss'),
   svgSprite = require('gulp-svg-sprite'),
   ttf2woff = require('gulp-ttf2woff'),
   ttf2woff2 = require('gulp-ttf2woff2'),
   fonter = require('gulp-fonter')

// Синхронизация с браузером, автообновление
function browserSync(params) {
   browsersync.init({
      server: {
         baseDir: "./" + project_folder + "/"
      },
      port: 3000,
      notify: false
   })
}

// Конвертация html, со вставкой конструкции pictures с webp\img изображениями
function html() {
   return src(path.src.html)
      .pipe(fileInclude())
      .pipe(webphtml())
      .pipe(dest(path.build.html))
      .pipe(browsersync.stream())
}

// Перенос библиотек;
function lib() {
   return src(path.src.lib)
      .pipe(dest(path.build.lib))
}

// Конвертация scss, автопрефиксер, минификация, замена url(*.img) на url(*.webp)
function css() {
   return src(path.src.css)
      .pipe(
         scss({
            outputStyle: "expanded"
         })
      )
      .pipe(
         group_media()
      )
      .pipe(
         autoprefixer({
            overrideBrowserslist: ["last 5 versions"],
            cascade: true
         })
      )
      .pipe(webpcss({
         webpClass: '.webp',
         noWebpClass: '.no-webp'
      }))
      .pipe(dest(path.build.css))
      .pipe(clean_css())
      .pipe(rename({
         extname: ".min.css"
      }))
      .pipe(dest(path.build.css))
      .pipe(browsersync.stream())
}

// Конвертация js, минификация
function js() {
   return src(path.src.js)
      .pipe(fileInclude())
      .pipe(dest(path.build.js))
      .pipe(
         uglify()
      )
      .pipe(rename({
         extname: ".min.js"
      }))
      .pipe(dest(path.build.js))
      .pipe(browsersync.stream())
}

// Конвертация изображений в webp формат , минификация
function images() {
   return src(path.src.img)
      .pipe(
         webp({
            quality: 70
         })
      )
      .pipe(dest(path.build.img))
      .pipe(src(path.src.img))
      .pipe(
         imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            interlaced: true,
            optimizationlevel: 3
         })
      )
      .pipe(dest(path.build.img))
      .pipe(browsersync.stream())
}

// Конвертация шрифтов с ttf в woff и woff2
function fonts() {
   src(path.src.fonts)
      .pipe(ttf2woff())
      .pipe(dest(path.build.fonts));
   return src(path.src.fonts)
      .pipe(ttf2woff2())
      .pipe(dest(path.build.fonts));
};

// Независимый таск, который можно открыть в новом терминале для конвертации otf в ttf в папке с исходниками
gulp.task('otf2ttf', function () {
   return src([source_folder + '/fonts/*.otf'])
      .pipe(fonter({
         formats: ['ttf']
      }))
      .pipe(dest(source_folder + '/fonts/'));
})

// Функция записи импорта шрифтов в fonts.scss
function fontsStyle(params) {
   let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
   if (file_content == '') {
      fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
      return fs.readdir(path.build.fonts, function (err, items) {
         if (items) {
            let c_fontname;
            for (var i = 0; i < items.length; i++) {
               let fontname = items[i].split('.');
               fontname = fontname[0];
               if (c_fontname != fontname) {
                  fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
               }
               c_fontname = fontname;
            }
         }
      })
   }
}

// Функция callback 
function cb() {

}

// Независимый таск, который сделает SVG-спрайты , что бы посмотреть шаблон вставки svg при таком стиле работы включить параметр example:true и глянуть файл шаблон в конечной папке
gulp.task('svgSprite', function () {
   return gulp.src([source_folder + '/iconsprite/*.svg'])
      .pipe(
         svgSprite({
            mode: {
               stack: {
                  sprite: "../icons/icons.svg", //sprite file name
                  // example: true
               }
            }
         })
      )
      .pipe(dest(path.build.img))
})

// Функция отслеживания для автообновления
function wathFiles(params) {
   gulp.watch([path.watch.html], html);
   gulp.watch([path.watch.css], css);
   gulp.watch([path.watch.js], js);
   gulp.watch([path.watch.img], images);
}

// Функция чистки конечной папки
function clean(params) {
   return del(path.clean);
}

// Запуск функций для конвертации файлов
let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts, lib), fontsStyle);

// Паралельный запуск функций для работы в галпе
let watch = gulp.parallel(build, wathFiles, browserSync);

// Експорт задач
exports.lib = lib;
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;