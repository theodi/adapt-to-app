#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
java_version.check();

const android_install = require("./lib/android_install");
android_install.check();

const buildDir = process.cwd();

// unzip package here
// parse out config

const macosx = (process.platform === "darwin");

const appDir = "app";
const appId = "org.theodi.megavision";
const appName = "MegaVision";

cordova_create(appDir, appId, appName);
cordova_build("android");
cordova_build("ios");

////////////////////////////////////
function cordova_create(appDir, appId, appName) {
    const fs = require('fs');
    if (fs.existsSync(appDir)) {
	console.log("woo");
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
} // cordova_build

function cordova(command, ...options) {
    const child_process = require('child_process');
    const prefix = buildDir + "/node_modules/cordova/bin/";
    const cmd = "cordova " + command + " " + options.join(" ");
    console.log(cmd);
    child_process.execSync(prefix + cmd, { stdio: 'inherit' })
} // cordova



function change_to_appDir() {
    process.chdir(appDir);
} // change_to_appDir
