import { src, dest, parallel, watch, series } from "gulp";
import browserSync, { stream } from "browser-sync";
import GulpPug from "gulp-pug";
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import rename from "gulp-rename";
import { deleteAsync } from "del";
import gulpsourcemaps from "gulp-sourcemaps";
import autoPrefixer from "gulp-autoprefixer";
import GulpCleanCss from "gulp-clean-css";
import size from "gulp-size";
import compileTs from "gulp-typescript";
import babel from "gulp-babel";
import GulpUglify from "gulp-uglify";
import concat from "gulp-concat";
import cached from "gulp-cached";
import sharpOptimizeImages from "gulp-sharp-optimize-images"
import filter from "gulp-filter";



const sass = gulpSass(dartSass);
const { init, write } = gulpsourcemaps;
const server = browserSync.create();

const refresh = (done) => {
    server.reload();
    done();
} 

const pathes = {
    scripts: {
        src: "src/scripts/**/*.{js,ts}",
        dist: "build/scripts/",
    },
    styles: {
        src: "src/styles/**/*.{css,scss,sass}",
        dist: "build/styles/",
    },
    assets: {
        src: "src/assets/**/*.{png,webp,jpg}",
        dist: "build/assets/",
    },
    pug: {
        src: "src/pug/**/*.pug",
        dist: "build/",
    }
}

const serverSync = () => {
    server.init({
        server: "build",
        open: true,
        cors: true,
    });

    watch(pathes.scripts.src, series(compileScripts, refresh));
    watch(pathes.pug.src, series(compilePug, refresh));
    watch(pathes.assets.src, series(cleanAssets, optimizeImg, refresh));
    watch(pathes.styles.src, series(compileStyles, refresh));
}

export const compilePug = () => {
    const onlyPages = filter(["src/pug/pages/**/*.pug"], { restore: true });
    return src(pathes.pug.src)
                // .pipe(cached('pug'))
                .pipe(onlyPages)
                .pipe(GulpPug())
                .pipe(rename({ dirname: '' }))
                // .pipe(onlyPages.restore)
                .pipe(dest(pathes.pug.dist));
}

export const compileScripts = () => {
    return src(pathes.scripts.src)
                .pipe(init())
                .pipe(compileTs({
                    noImplicitAny: true,
                    outFile: "main.js",
                }))
                .pipe(babel({
                    presets: ["@babel/env"],
                }))
                .pipe(GulpUglify())
                .pipe(concat("main.min.js"))
                .pipe(write("."))
                .pipe(size({ showFiles: true }))
                .pipe(dest(pathes.scripts.dist))
                .pipe(stream());
}

export const compileStyles = () => {
    return src(pathes.styles.src)
                .pipe(init())
                .pipe(sass( { outputStyle: 'compressed' } ))
                .pipe(autoPrefixer({
                    cascade: false,
                }))
                .pipe(GulpCleanCss({
                    level: 2,
                }))
                .pipe(rename({
                    basename: "styles",
                    suffix: ".min",
                }))
                .pipe(write('.'))
                .pipe(size({ showFiles: true }))
                .pipe(dest(pathes.styles.dist))
                .pipe(stream());
}

export const optimizeImg = () => {
    return src(pathes.assets.src, { encoding: false })
                // .pipe(cached("images"))
                .pipe(sharpOptimizeImages({
                    webp: {
                        quality: 80,
                        lossless: false,
                        alsoProcessOriginal: false,
                    },
                }))
                .pipe(size({ showFiles: true }))
                .pipe(dest(pathes.assets.dist))
                .pipe(stream());
}


export const clean = () => deleteAsync(["build/*"]);
export const cleanAssets = () => deleteAsync([`build/assets/*`]);

export const build = series(clean, parallel(optimizeImg, compileScripts, compileStyles, compilePug));
export const dev = series(clean, parallel(optimizeImg, compileScripts, compileStyles, compilePug), serverSync);