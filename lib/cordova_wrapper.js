"use strict";

exports.create = cordova_create;
exports.android_build = cordova_android_build;
exports.ios_build = cordova_ios_build;
exports.android_run = cordova_android_run;
exports.ios_run = cordova_ios_run;

const fs = require("fs-extra");
const path = require("path");
const find_file = require("./find_file");
const xml_config = require("./xml_config");
const colors = require("colors/safe");

function cordova_create(appDir, appId, appName, downloadKey) {
    if (fs.existsSync(appDir))
	return;

    const cwd = change_to(path.dirname(appDir));

    const appDirName = path.basename(appDir);
    cordova(appDir, "create", appDirName, appId, appName);
    change_to(appDir);
    add_xapk_reader_plugin(appDir, appId, downloadKey);
    cordova(appDir, "platform add android");
    if (is_macosx())
	cordova(appDir, "platform add ios");
    change_to(cwd);
} // cordova_create

function add_xapk_reader_plugin(appDir, appId, downloadKey) {
    cordova(appDir, "plugin add https://github.com/agamemnus/cordova-plugin-xapkreader.git#cordova-6.5.0");

    const key = (downloadKey) ? downloadKey : "PUBLIC_KEY_NOT_SET";

    const plugin_xml_filename = path.join(appDir, "plugins/com.flyingsoftgames.xapkreader/plugin.xml");
    const plugin_xml = xml_config.read(plugin_xml_filename);
    xml_config.set(plugin_xml, "plugin/platform/preference[@name='XAPK_EXPANSION_AUTHORITY']/@default", appId);
    xml_config.set(plugin_xml, "plugin/platform/preference[@name='XAPK_PUBLIC_KEY']/@default", key);
    xml_config.write(plugin_xml, plugin_xml_filename);
} // add_xapk_reader_plugin

function cordova_android_build(appDir, keystore, modifier, include_obb) {
    const suffixes = include_obb ? [".apk",".obb"] : [".apk"];

    const platform = (keystore) ?
	  (`android --release -- --keystore=${keystore.keystore} --alias="${keystore.alias}" ` +
	   ((keystore.password) ? `--storePassword=${keystore.password} --password=${keystore.password}` : ""))
	  :
	  "android";

    cordova_build(appDir, platform, modifier, ...suffixes);
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

function cordova_android_run(appDir) {
    cordova_run(appDir, "android");
} // cordova_android_run

function cordova_ios_run(appDir) {
    if (!is_macosx())
	return;
    cordova_run(appDir, "ios");
} // cordova_ios_run

function cordova_run(appDir, platform) {
    const cwd = change_to(appDir);

    cordova(appDir, "run", platform);

    change_to(cwd);
} // cordova_run

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
