"use strict";
const path = require("path");
const fs = require("fs-extra");
const find_file = require("../../lib/find_file");
const xml_config = require("../../lib/xml_config");

module.exports = download_videos;

function download_videos(context) {
    package_up(context.opts.projectRoot);
} //

function package_up(appDir) {
    const platformRoot = path.join(appDir, "platforms/ios");
    const assetsRoot = path.join(platformRoot, "www");

    gather_videos(assetsRoot);

} // package_up

function gather_videos(assetsRoot) {

    console.log(`Searching ${assetsRoot} for components.json ...`);
    const components_json_file = find_file.by_name("components.json", assetsRoot);

    console.log(`Checking ${components_json_file} for video ...`);
    const components_json = JSON.parse(fs.readFileSync(components_json_file));
    search_for_tags(components_json, assetsRoot);
    fs.writeFileSync(components_json_file, JSON.stringify(components_json));
} // function ...

function grab_apk_name(appDir) {
    const config_xml = xml_config.read(path.join(appDir, "config.xml"));
    return config_xml.find(".").get("id");
} // grab_apk_name


function search_for_tags(json, assetsRoot) {
    if (typeof(json) != "object")
	return;

    for (const key in json) {
	if (key == "source")
        process_source_tag(json, assetsRoot);
    else 
	    search_for_tags(json[key], assetsRoot);
    }
} // search_for_mp4_tags

function process_source_tag(json, assetsRoot) {
    const vimeopath = json["source"];
    if (vimeopath == "") {
        return;
    }
    console.log(`Found vimeo ${vimeopath}`);
    console.log("    so let's get to work");

    const vimeoid = vimeopath.substring(vimeopath.lastIndexOf("/")+1,vimeopath.length);
    const vimeourl =  'https://vimeo.com/' + vimeoid;
    console.log(vimeourl);
    
    const assetSuffix = "assets/" + vimeoid + ".mp4";
    fs.mkdirsSync(path.join(assetsRoot,"assets"));
    
    const destVideoPath = path.join(assetsRoot, assetSuffix);

    const child_process = require('child_process');
    child_process.execSync('node ../scripts/download-vimeo.js ' + vimeourl + " " + destVideoPath);

    console.log(destVideoPath);
    console.log("    updating json");
    json["mp4"] = `${assetSuffix}`;
    json["source"] = "";
    json["type"] = "";

}
