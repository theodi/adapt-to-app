const path = require("path");
const fs = require("fs-extra");
const find_file = require("../../lib/find_file");
const xml_config = require("../../lib/xml_config");

module.exports = package_videos;

function package_videos(context) {
    package_up(context.opts.projectRoot);
} //

function package_up(appDir) {
    const platformRoot = path.join(appDir, "platforms/android");
    const assetsRoot = path.join(platformRoot, "assets/www");
    const buildDir = path.join(platformRoot, "build/obb");
    const videoSrcDir = path.join(buildDir, "src");

    const apkName = grab_apk_name(appDir);

    gather_videos(apkName, assetsRoot, videoSrcDir);
    create_obb(apkName, videoSrcDir, buildDir);
} // package_up

function gather_videos(apkName, assetsRoot, videoSrcDir) {
    fs.mkdirsSync(videoSrcDir);

    console.log(`Searching ${assetsRoot} for components.json ...`);
    const components_json_file = find_file.by_name("components.json", assetsRoot);

    console.log(`Checking ${components_json_file} for video ...`);
    const components_json = JSON.parse(fs.readFileSync(components_json_file));
    search_for_mp4_tags(components_json, apkName, assetsRoot, videoSrcDir);
    fs.writeFileSync(components_json_file, JSON.stringify(components_json));
} // function ...

function create_obb(apkName, videoSrcDir, buildDir) {
    const obbFileName = path.join(buildDir, `main.1.${apkName}.obb`);
    const zipcmd = `cd ${videoSrcDir} && zip -v -dc -r -Z store ${obbFileName} .`;

    fs.mkdirsSync(buildDir);
    const child_process = require("child_process");
    child_process.execSync(zipcmd, { stdio: "inherit" });

    console.log(`Expansion file create at ${obbFileName}`);
} // create_obb

function grab_apk_name(appDir) {
    const config_xml = xml_config.read(path.join(appDir, "config.xml"));
    return config_xml.find(".").get("id");
} // grab_apk_name


function search_for_mp4_tags(json, apkName, assetsRoot, videoSrcDir) {
    if (typeof(json) != "object")
	return;

    for (const key in json) {
	if (key === "mp4")
	    process_mp4_tag(json, apkName, assetsRoot, videoSrcDir);
	else
	    search_for_mp4_tags(json[key], apkName, assetsRoot, videoSrcDir);
    }
} // search_for_mp4_tags

function process_mp4_tag(json, apkName, assetsRoot, videoSrcDir) {
    const videopath = json["mp4"];
    console.log(`Found video ${videopath}`);
    if (videopath.indexOf("://") != -1) {
	console.log("    but that's a reference to an external URI so let's not worry about it");
	return;
    } // if ...

    console.log("    so let's get to work");
    const fullVideoPath = path.join(assetsRoot, videopath);
    const destVideoPath = path.join(videoSrcDir, videopath);
    console.log(`    moving ${fullVideoPath} to ${destVideoPath}`);
    fs.mkdirsSync(path.dirname(destVideoPath));
    fs.moveSync(fullVideoPath, destVideoPath);

    console.log("    updating json");
    json["mp4"] = `content://${apkName}/${videopath}`;
} // process_mp4_tag
