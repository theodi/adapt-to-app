#!/usr/bin/env node
"use strict";

const tools_version = "25.2.3";
const build_tools_version = "25.0.2";

const fs = require("fs");

const home_dir = process.env.HOME;
const default_android_home = home_dir + "/Library/Android";

let android_home = process.env.ANDROID_HOME;
if (android_home)
    return;

logline("ANDROID_HOME is not set.");
android_home = search_for_android_home();
if (android_home)
    return;

bootstrap_android_sdk_install();

/////////////////////
function log(msg) {
    process.stdout.write(msg);
}

function logline(msg) {
    log(msg + "\n");
}

function logover(msg) {
    log("\r" + msg);
}


function search_for_android_home() {
    let candidates = [/*home_dir + "/.android-sdk",*/ default_android_home, "/System/Library/Android", "/usr/lib/Android"];
    for (let path of candidates) {
	log("Checking " + path + " ... ");
	if (fs.existsSync(path + "/tools")) {
	    logline("found!");
	    return path;
	}
	logline("not found");
    }
    logline("No Android SDK installation found.");
}

function bootstrap_android_sdk_install() {
    const platform = host_platform();
    const zipfile = "tools_r" + tools_version + "-" + platform + ".zip";

    download_android_tools(zipfile).
	then((zipfile) => install_android_tools(zipfile)).
	then((install_dir) => install_android_platform_tools(install_dir)).
    	then((install_dir) => set_android_home_env_var(install_dir));
} // bootstrap_android_sdk_install

function download_android_tools(zipfile) {
    const p = new Promise((resolve, reject) => {
	const wget = require("wget-improved");
	const download_url = "https://dl.google.com/android/repository/" + zipfile;

	if (fs.existsSync(zipfile))
	    fs.unlinkSync(zipfile);

	logline("Downloading " + download_url);

	const download = wget.download(download_url, zipfile);

	download.on("progress", (progress) => {
	    let msg = zipfile + "   [";
	    const percent = Math.floor(progress*100);
	    const steps = Math.floor(percent / 5);
	    msg += "====================".substring(0, steps);
	    if (steps != 20)
		msg += ">";
	    msg += "                    ".substring(0, 19-steps);
	    msg += "] " + percent + "%   ";
	    logover(msg);
	});
	download.on("error", (error) => {
	    logline("\nThe download has failed: " + error);
	    reject(error);
	});

	download.on("end", () => {
	    logline("\nDownload complete");
	    resolve(zipfile);
	});
    });

    return p;
} // download_android_tools

function install_android_tools(zipfile) {
    const p = new Promise((resolve, reject) => {
	if (!fs.existsSync(default_android_home))
	    default_android_home.split("/").reduce((path, step) => {
		// create each step of the path, if it doesn't exist
		path += step + "/";
		if (!fs.existsSync(path))
		    fs.mkdirSync(path);
		return path;
	    }, "");

	logline("Unzipping " + zipfile + " into " + default_android_home);

	const extract = require('extract-zip');
	extract(zipfile, {dir: default_android_home}, (error) => {
	    if (!error) {
		logline("Unzip complete");
		resolve(default_android_home);
	    } else {
		logline("The unzip has failed: " + error);
		reject(error);
	    }
	});
    });
    return p;
} // install_android_tools

function install_android_platform_tools(install_dir) {
    const p = new Promise((resolve, reject) => {
	logline("Installing Android platform tools");
	const sdkmanager_cmd = install_dir + "/tools/bin/sdkmanager \"platform-tools\" \"build-tools;" + build_tools_version + "\"";

	logline("Running " + sdkmanager_cmd);
	const child_process = require('child_process');
	try {
	    child_process.execSync(sdkmanager_cmd, { stdio: 'inherit' });
	    resolve(install_dir);
	} catch (ex) {
	    reject(error);
	}
    });
    return p;
} // install_android_platform_tools

function set_android_home_env_var(install_dir) {
    logline("Setting ANDROID_HOME to " + install_dir);
    process.env.ANDROID_HOME = install_dir;
} // set_android_home_env_var

function host_platform() {
    switch(process.platform) {
    case "darwin":
	return "macosx";
    case "linux":
	return "linux";
    default:
	logline("Sorry, we don't know how to handle " + process.platform + " platforms.");
	process.exit(1);
    }
}
