#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
const android_install = require("./lib/android_install");

const fs = require('fs-extra');
const path = require('path');

const macosx = (process.platform === "darwin");
const buildDir = process.cwd();
const appDir = "app";

//build_app();
java_version.check().
    then(android_install.check).
    then(build_app);

function build_app() {
    // unzip package here
    // parse out config

    const appId = "org.theodi.megavision";
    const appName = "MegaVision";

    cordova_create(appDir, appId, appName);
    cordova_build("android");
    cordova_build("ios");
} // build_app


////////////////////////////////////
function cordova_create(appDir, appId, appName) {
    if (fs.existsSync(appDir)) {
	change_to_appDir();
	return;
    } // if ...

    cordova("create", appDir, appId, appName);
    change_to_appDir();
    cordova("plugin add https://github.com/agamemnus/cordova-plugin-xapkreader.git#cordova-6.5.0");
    cordova("platform add android");
    if (macosx)
	cordova("platform add ios");
} // cordova_create

function cordova_build(platform) {
    if (!macosx && (platform === "ios"))
	return;
    cordova("build", platform);

    // find build product
    const suffix = {"android": ".apk", "ios": ".app"};
    const app = find_app(suffix[platform]);
    if (!app) {
	console.log("\n\nCould not find " + platform + " app!\n\n");
	return;
    } //

    const outputName = path.join(buildDir, path.basename(app));
    if (fs.existsSync(outputName))
	fs.unlinkSync(outputName);
    fs.moveSync(app, outputName, true);
    console.log("\n\nBuilt " + path.basename(app));
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
