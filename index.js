#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
java_version.check();

const android_install = require("./lib/android_install");
android_install.check();

const buildDir = process.cwd();

// unzip package here
// parse out config
const appDir = "app";
const appId = "org.theodi.megavision";
const appName = "MegaVision";

create_and_configure(appDir, appId, appName);
cordova("build android");
cordova("build ios");

function create_and_configure(appDir, appId, appName) {
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
    cordova("platform add ios");
} // create_and_configure

function cordova(command, ...options) {
    const child_process = require('child_process');
    const prefix = buildDir + "/node_modules/cordova/bin/";
    const cmd = "cordova " + command + " " + options.join(" ");
    console.log(cmd);
    child_process.execSync(prefix + cmd, { stdio: 'inherit' })
}

function change_to_appDir() {
    process.chdir(appDir);
}
