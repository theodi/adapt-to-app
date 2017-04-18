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
    const platformRoot = path.join(appDir, "platforms/android");
    const assetsRoot = path.join(platformRoot, "assets/www");
    const buildDir = path.join(platformRoot, "build/obb");
    const videoSrcDir = path.join(buildDir, "src");

    gather_videos(assetsRoot, videoSrcDir);

} // package_up

function gather_videos(assetsRoot, videoSrcDir) {
    make_clean_directory(videoSrcDir);

    console.log(`Searching ${assetsRoot} for components.json ...`);
    const components_json_file = find_file.by_name("components.json", assetsRoot);

    console.log(`Checking ${components_json_file} for video ...`);
    const components_json = JSON.parse(fs.readFileSync(components_json_file));
    search_for_tags(components_json, assetsRoot, videoSrcDir);
    fs.writeFileSync(components_json_file, JSON.stringify(components_json));
} // function ...

function grab_apk_name(appDir) {
    const config_xml = xml_config.read(path.join(appDir, "config.xml"));
    return config_xml.find(".").get("id");
} // grab_apk_name


function search_for_tags(json, assetsRoot, videoSrcDir) {
    if (typeof(json) != "object")
	return;

    for (const key in json) {
	if (key == "source")
        process_source_tag(json, assetsRoot, videoSrcDir);
    else 
	    search_for_tags(json[key], assetsRoot, videoSrcDir);
    }
} // search_for_mp4_tags

function process_source_tag(json, apkName, videoSrcDir) {
    const p = new Promise((resolve, reject) => {
        const source = json["source"];
        if (vimeopath == "") {
            resolve(0);
        }
        console.log(`Found external video ${json["source"]}`);

        const type = json["type"];
        if ((source.indexOf("player.vimeo") == -1) && (type != "video/vimeo")) {
            console.log("    but I only know how to download from Vimeo");
            resolve(0);
        } // if ...

        const vimeoid = vimeopath.substring(vimeopath.lastIndexOf("/")+1,vimeopath.length);
        const vimeourl =  'https://vimeo.com/' + vimeoid;
        
        const assetSuffix = "assets/" + vimeoid + ".mp4";
        fs.mkdirsSync(path.join(assetsRoot,"assets"));

        const destVideoPath = path.join(assetsRoot, assetSuffix);

        console.log(`    downloading ${vimeourl} to ${destVideoPath} ...`);

        const vidl = require("vimeo-downloader");
        let total = 0;

        const stream = vidl(vimeourl, { quality: "720p", format: "mp4" });
        stream.pipe(fs.createWriteStream(destVideoPath));

        stream.on('data', (chunk) => {
            total += chunk.length
            const kb = Math.floor(total/1024);
            process.stdout.write(`\r    downloaded ${kb}kB`);
        });

        stream.on('end', () => {
            console.log("    complete");
            console.log("    updating json");
            json["source"] = "";
            json["type"] = "";
            json["mp4"] = `${assetSuffix}`;
            resolve(0);
        });
    });
    return p;
} // download_linked_video

function make_clean_directory(dir) {
    if (fs.existsSync(dir))
	clean_directory(dir);
    fs.mkdirsSync(dir);
} // make_or_clean_directory

function clean_directory(dir) {
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile())
	    fs.unlinkSync(fullName);
	if (stat.isDirectory()) {
	    clean_directory(fullName);
	    fs.rmdirSync(fullName);
	} // if ...
    } // for ...
} // clean_directory
