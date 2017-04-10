"use strict";

const child_process = require("child_process");
const path = require("path");
const xml_config = require("../../lib/xml_config");

module.exports = install_obb;

function install_obb(context) {
    install(context.opt.projectRoot);
} // install_obb

function install(appDir) {
    const androidDir = process.env.ANDROID_HOME;
    const adb = path.join(androidDir, "platform-tools/adb");

    console.log("Installing OBB to device ...");

    const mountpoint = find_mountpoint(adb);

    const apkName = grab_apk_name(appDir);
    const platformRoot = path.join(appDir, "platforms/android");
    const buildDir = path.join(platformRoot, "build/obb");
    push_obb(adb, buildDir, mountpoint, apkName);
} // install

function grab_apk_name(appDir) {
    const config_xml = xml_config.read(path.join(appDir, "config.xml"));
    return config_xml.find(".").get("id");
} // grab_apk_name

function find_mountpoint(adb) {
    const mountpointcmd = `${adb} shell echo \\$EXTERNAL_STORAGE`;
    console.log(`  finding sdcard mount point with ${mountpointcmd}`);
    const mountpoint = child_process.execSync(mountpointcmd).toString().trim();
    console.log(`  mount point is ${mountpoint}`);
    return mountpoint;
} // find_mountpoint

function push_obb(adb, buildDir, mountpoint, apkName) {
    const obbFileName = `main.1.${apkName}.obb`;
    const srcObb = path.join(buildDir, obbFileName);
    const destObb = path.join(mountpoint, "Android/obb", apkName, obbFileName);
    const pushcmd = `${adb} push ${srcObb} ${destObb}`;
    console.log(`  running ${pushcmd}`);
    child_process.execSync(pushcmd);
    console.log(`Expansion file installed to ${destObb}`);
} // push_obb
