"use strict";

exports.create = cordova_create;
exports.android_build = cordova_android_build;
exports.ios_build = cordova_ios_build;

const fs = require("fs-extra");
const path = require("path");
const find_file = require("./find_file");
const colors = require("colors/safe");

function cordova_create(appDir, appId, appName) {
    if (fs.existsSync(appDir))
	return;

    const cwd = change_to(path.dirname(appDir));

    const appDirName = path.basename(appDir);
    cordova(appDir, "create", appDirName, appId, appName);
    change_to(appDir);
    cordova(appDir, "plugin add https://github.com/agamemnus/cordova-plugin-xapkreader.git#cordova-6.5.0");
    cordova(appDir, "platform add android");
    if (is_macosx())
	cordova(appDir, "platform add ios");
    change_to(cwd);
} // cordova_create

function cordova_android_build(appDir, modifier, include_obb) {
    const suffixes = include_obb ? [".apk",".obb"] : [".apk"];
    cordova_build(appDir, "android", modifier, ...suffixes);
} // cordova_android_build

function cordova_ios_build(appDir) {
    if (!is_macosx())
	return;
    cordova_build(appDir, "ios");
} // cordova_ios_build

function cordova_build(appDir, platform, modifier, ...suffixes) {
    const cwd = change_to(appDir);

    cordova(appDir, "build", platform);

    // find build product
    for (const suffix of suffixes) {
	const app = find_app(suffix);
	if (!app) {
	    console.log("\n\nCould not find " + platform + " app!\n\n");
	    return;
	} // if ...

	modifier = modifier || "";
	const outputName = path.resolve(appDir, "..", path.basename(app, suffix)) + modifier + suffix;
	if (fs.existsSync(outputName))
	    fs.unlinkSync(outputName);
	fs.moveSync(app, outputName, true);
	console.log(colors.yellow.bold("Built " + path.basename(outputName)));
    } // for ...

    change_to(cwd);
} // cordova_build

function cordova(appDir, command, ...options) {
    const child_process = require('child_process');
    const prefix = path.resolve(appDir, "..", "node_modules/cordova/bin/") + "/";
    const cmd = "cordova " + command + " " + options.join(" ");
    console.log(cmd);
    child_process.execSync(prefix + cmd, { stdio: 'inherit' })
} // cordova

function find_app(suffix, dir = process.cwd() + "/platforms") {
    return find_file.by_suffix(suffix, dir);
} // find_app

function change_to(dir) {
    const cwd = process.cwd();
    process.chdir(dir);
    return cwd;
} // change_to

function is_macosx() {
    return (process.platform === "darwin");
} // is_maxosx
