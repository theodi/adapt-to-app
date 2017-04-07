"use strict";

exports.check = check;

const tools_version = "25.2.3";
const build_tools_version = "25.0.2";

const fs = require("fs-extra");
const progress = require("./progress_bar");

const home_dir = process.env.HOME;
const default_android_home = home_dir + "/Library/Android";

function check() {
    const p = new Promise((resolve, reject) => {
	let android_home = process.env.ANDROID_HOME;
	if (android_home) {
	    logline("ANDROID_HOME is " + android_home);
	    resolve();
	} // if ...

	logline("ANDROID_HOME is not set");
	search_for_android_home().
	    then((android_home) => { set_android_home_env_var(android_home); resolve(); }).
    	    catch(() => { bootstrap_android_sdk_install().then(() => resolve()); });
    });
    return p;
} // check_android_install

/////////////////////
function search_for_android_home() {
    const p = new Promise((resolve, reject) => {
	let candidates = [/*home_dir + "/.android-sdk",*/ default_android_home, "/System/Library/Android", "/usr/lib/Android"];
	for (let path of candidates) {
	    log("Checking " + path + " ... ");
	    if (fs.existsSync(path + "/tools")) {
		logline("found!");
		resolve(path);
		return;
	    }
	    logline("not found");
	}
	logline("No Android SDK installation found.");
	reject(0);
    });
    return p;
} // search_for_android_home

function bootstrap_android_sdk_install() {
    const platform = host_platform();
    const zipfile = "tools_r" + tools_version + "-" + platform + ".zip";
    return download_android_tools(zipfile).
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

	download.on("progress", (frac) => {
	    progress.bar(zipfile, frac*100);
	});
	download.on("error", (error) => {
	    logline("The download has failed: " + error);
	    reject(error);
	});

	download.on("end", () => {
	    logline("Download complete");
	    resolve(zipfile);
	});
    });

    return p;
} // download_android_tools

function install_android_tools(zipfile) {
    const p = new Promise((resolve, reject) => {
	if (!fs.existsSync(default_android_home))
	    fs.mkdirsSync(default_android_home);

	logline("Unzipping " + zipfile + " into " + default_android_home);

	const extract = require('extract-zip');
	extract(zipfile, {dir: default_android_home}, (error) => {
	    if (!error) {
		logline("Unzip complete");
		fs.unlinkSync(zipfile);
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

//////////////////////////
function log(msg) {
    process.stdout.write(msg);
} // log

function logline(msg) {
    log(msg + "\n");
} // logline

function logover(msg) {
    log("\r" + msg);
} // logover

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
