#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
const android_install = require("./lib/android_install");
const progress = require("./lib/progress_bar");

const fs = require('fs-extra');
const path = require('path');

const macosx = (process.platform === "darwin");
const buildDir = path.dirname(process.argv[1])
const tmpDir = path.join(buildDir, "tmp");
const appDir = path.join(buildDir, "app");

unwrap_zip_file(process.argv).
    then(verify_zip_file).
    then(java_version.check).
    then(android_install.check).
    then(cordova_create).
    then(drop_adapt_into_cordova).
    then(cordova_android_build).
//    then(cordova_ios_build).
    catch((error) => console.log(error));


////////////////////////////////////////////
////////////////////////////////////////////
function unwrap_zip_file(args) {
    const p = new Promise((resolve, reject) => {
	if (args.length != 3)
	    reject("Usage: " + path.basename(args[1]) + " <adapt-zip-file>\n" +
		   (args.length < 3 ? "Must pass a zip filename" : "Easy Tiger! One zipfile at time!"));

	const source_file = args[2];
	if (!fs.existsSync(source_file))
	    reject("The file " + source_file + " does not exist.");

	clean_tmp_directory();
	const extract = require('extract-zip');
	extract(source_file, {dir: tmpDir}, (error) => {
	    if (!error) {
		console.log("Unzipped " + source_file + " into " + tmpDir);
		resolve();
	    } else {
		reject(error)
	    }
	});
    });
    return p;
} // unwrap_zip_file

function verify_zip_file() {
    const p = new Promise((resolve, reject) => {
	const check_files = ["index.html", "adapt", "course/config.json", "course/en/course.json"];
	for (const c of check_files)
	    if (!fs.existsSync(path.join(tmpDir, c)))
		reject("Doesn't look like an Adapt zipfile.  Could not find file " + c);
	resolve();
    });
    return p;
} // verify_zip_file

function drop_adapt_into_cordova() {
    const p = new Promise((resolve, reject) => {
	const www_dir = path.join(appDir, "www");
	clean_directory(www_dir);

	const files = gather_files(tmpDir);

	for (let i = 0; i != files.length; ++i) {
	    copy_file(files[i], tmpDir, www_dir);
	    progress.bar(files[i], (i/files.length*100));
	} // for ...
	progress.bar("Copied " + files.length + " files", 100);

	resolve();
    });
    return p;
} // drop_adapt_into_cordova


function clean_tmp_directory() {
    if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
	return;
    } // if ...

    clean_directory(tmpDir);
} // clean_tmp_directory

function clean_directory(dir) {
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile())
	    fs.unlinkSync(fullName);
	if (stat.isDirectory()) {
	    clean_directory(fullName);
	    fs.rmdirSync(fullName);
	} // if ...
    } // for ...
} // clean_directory

function gather_files(dir, topmost = dir) {
    let files = [];
    const relDir = dir.substring(topmost.length);
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile())
	    files.push(path.join(relDir, name));
	if (stat.isDirectory())
	    files.push(...gather_files(fullName, topmost));
    } // for ...
    return files;
} // gather_files

function copy_file(name, srcRootDir, destRootDir) {
    const srcName = path.join(srcRootDir, name);
    const destName = path.join(destRootDir, name);
    const destDir = path.dirname(destName);

    if (!fs.existsSync(destDir))
	fs.mkdirsSync(destDir);

    const BUF_LENGTH = 64*1024;
    const buff = new Buffer(BUF_LENGTH);
    const bytesToRead = fs.statSync(srcName).size;

    const fdr = fs.openSync(srcName, fs.constants.O_RDONLY);
    const fdw = fs.openSync(destName, fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_WRONLY);
    for (let pos = 0; pos != bytesToRead; ) {
	let bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
	fs.writeSync(fdw, buff, 0, bytesRead);
	pos += bytesRead;
    } // for ...
    fs.closeSync(fdr);
    fs.closeSync(fdw);
} // copy_file

/////////////////////////////////////
/////////////////////////////////////
function cordova_create() {
    if (fs.existsSync(appDir))
	return;

    cordova("create", appDir, "org.place.holder", "PlaceHolder");
    change_to_appDir();
    cordova("plugin add https://github.com/agamemnus/cordova-plugin-xapkreader.git#cordova-6.5.0");
    cordova("platform add android");
    if (macosx)
	cordova("platform add ios");
} // cordova_create

function cordova_android_build() {
    cordova_build("android", "-fat");
} // cordova_android_build

function cordova_ios_build() {
    cordova_build("ios");
} // cordova_ios_build

function cordova_build(platform, modifier) {
    if (!macosx && (platform === "ios"))
	return;
    change_to_appDir();
    cordova("build", platform);

    // find build product
    const suffix = {"android": ".apk", "ios": ".app"}[platform];
    const app = find_app(suffix);
    if (!app) {
	console.log("\n\nCould not find " + platform + " app!\n\n");
	return;
    } // if ...

    modifier = modifier || "";
    const outputName = path.join(buildDir, path.basename(app, suffix)) + modifier + suffix;
    if (fs.existsSync(outputName))
	fs.unlinkSync(outputName);
    fs.moveSync(app, outputName, true);
    console.log("\n\nBuilt " + path.basename(outputName));
} // cordova_build

function cordova(command, ...options) {
    const child_process = require('child_process');
    const prefix = path.join(buildDir, "/node_modules/cordova/bin/");
    const cmd = "cordova " + command + " " + options.join(" ");
    console.log(cmd);
    child_process.execSync(prefix + cmd, { stdio: 'inherit' })
} // cordova

function find_app(suffix, dir = process.cwd() + "/platforms") {
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile() && name.endsWith(suffix))
	    return fullName;
	if (stat.isDirectory()) {
	    let app = find_app(suffix, fullName);
	    if (app)
		return app;
	} // if ...
    }
} // find_app

function change_to_appDir() {
    process.chdir(appDir);
} // change_to_appDir
