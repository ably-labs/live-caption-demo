const gulp = require('gulp');
const { series } = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const fs = require("fs");
const { fork } = require('child_process');
const path = require("path");
const yaml = require("js-yaml");

const envConfig = yaml.load(fs.readFileSync("env-config.yaml"));

const distDir = "./dist";
const srcDir = "./src";
const espReadyBundleFileName = "bundle.js";
const espReadyBundlePath = path.join(distDir, espReadyBundleFileName);
const appFileName = "app.js";
const appFilePath = path.join(distDir, appFileName);
const espConsoleBeingWatchedFileName = "esp-console-input.js";
const espConsoleBeingWatchedFilePath = path.join(distDir, espConsoleBeingWatchedFileName);


function compileTs() {
    const tsResult = tsProject.src().pipe(tsProject());
    return tsResult.js.pipe(gulp.dest(distDir));
}

function deployViaCli(onCompletion) {
    if (!fs.existsSync(appFilePath)) {
        onCompletion("main app file does not exit " + appFilePath);
        return;
    }

    let appContent = fs.readFileSync(appFilePath).toString();
    appContent = appContent.replace('Object.defineProperty(exports, "__esModule", { value: true });', "");
    console.log(appContent)
    fs.writeFileSync(appFilePath, appContent);


    const params = ["--board", envConfig.board, "-m", appFileName, "-o", espReadyBundleFileName];
    const cli = require.resolve("espruino/bin/espruino-cli");
    const buildproc = fork(cli, params, { cwd: distDir });

    buildproc.on('close', (code) => {
        onCompletion();
        console.log("Skipping deployment. Please upload /dist/bundle.js manually.")
    });
}


gulp.task("content-to-dist", () => {
    return gulp
        .src("src/**/*.js", { base: 'src' })
        .pipe(gulp.dest(distDir));
});

gulp.task("send-to-espurino-console", (onCompletion) => {
    const content = fs.readFileSync(espReadyBundlePath);
    fs.writeFile(
        espConsoleBeingWatchedFilePath,
        content,
        (err) => {
            if (err) { throw err; }
            onCompletion();
        });
});


gulp.task("compile", compileTs);
gulp.task("deployViaCli", deployViaCli);
gulp.task("build", series('compile', 'content-to-dist', 'deployViaCli'));
