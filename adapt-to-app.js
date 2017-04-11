#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
const android_install = require("./lib/android_install");
const cordova = require("./lib/cordova_wrapper");
const progress = require("./lib/progress_bar");
const find_file = require("./lib/find_file");
const xml_config = require("./lib/xml_config");

const fs = require("fs-extra");
const path = require("path");
const elementtree = require("elementtree");
const colors = require("colors/safe");

const adaptToAppDir = path.resolve(path.dirname(process.argv[1]))
const tmpDir = path.join(adaptToAppDir, "tmp");
const appDir = path.join(adaptToAppDir, "app");

const [zipfile, action, keystore] = parse_args(process.argv);

open_zip_file(zipfile).
    then(() => check_keystore(keystore)).
    then(check_environment).
    then(setup_cordova).
    then(setup_adapt_source).
    then(() => build_cordova(keystore)).
    then(() => post_build(action)).
    catch((error) => console.log(colors.red(error)));

function banner(msg) {
    console.log(colors.magenta.bold(msg));
} // banner

function open_zip_file(zipfile) {
    banner("Opening Adapt zip file ...");
    return unwrap_zip_file(zipfile).
   	then(verify_zip_file);
} // open_zip_file

function check_keystore(keystore) {
    if (!keystore)
	return;

    if (!fs.existsSync(keystore.keystore))
	throw `The keystore file ${keystore.keystore} does not exist`;
} // check_keystore

function check_environment() {
    banner("Checking Environment ...");
    return java_version.check().
	then(android_install.check);
} // check_environmen

function setup_cordova() {
    const [appId, appName, download_key] = grab_adapt_details();
    banner(`Setting up Cordova ${appId}.${appName} ...`);
    return cordova.create(appDir, appId, appName, download_key);
} // setup_cordova

function setup_adapt_source() {
    banner("Updating source and config ...");
    return drop_adapt_into_cordova().
	then(update_config_xml);
} // setup_adapt_source

function build_cordova(keystore) {
    build_android(keystore);
    build_slim_android(keystore);
    build_ios();
} // build_cordova

function post_build(action) {
    switch (action) {
    case "run":
	run_android();
	run_ios();
	break;
    }
} // post_build

function build_ios() {
    banner("Building ios ...");
    cordova.ios_build(appDir);
} // build_ios

function build_android(keystore) {
    banner("Building Android ...");
    remove_obb_hooks();
    cordova.android_build(appDir, keystore, "-fat")
} // build_android

function build_slim_android() {
    banner("Building slim Android ...");
    add_obb_hooks();
    cordova.android_build(appDir, keystore, "", true);
} // build_slim_android

function run_ios() {
    banner("Running ios ...");
    cordova.ios_run(appDir);
} // build_ios

function run_android() {
    banner("Building Android ...");
    add_obb_hooks();
    cordova.android_run(appDir);
} // build_android


////////////////////////////////////////////
////////////////////////////////////////////
function parse_args(args) {
    const program = require('commander');
    let zipfile = '';
    let cmd = '';

    program.
	usage('[options] <zipfile> [build|run]').
	arguments('<zipfile> [cmd]').
	option('-k, --keystore <path-to-keystore>', 'Android keystore').
	option('-a, --keyalias <alias>', 'Keystore alias').
	option('-p, --keypassword <password>', 'Keystore password').
	action((zf, c) => {
	    zipfile = zf;
	    cmd = c;
	});
    program.
	parse(process.argv);

    if ((!zipfile) || (cmd && (cmd != 'run' && cmd != 'build')))
	program.help((txt) => { return colors.red(txt); });

    if (program.keystore && !program.keyalias) {
	console.log(colors.red("If keystore is specified, the alias must also be provided"));
	program.help((txt) => { return colors.red(txt); });
    } // if ...

    if (!program.keystore) {
	if (program.keyalias)
	    console.log(colors.red("Ignoring keyalias as no keystore given"));
	if (program.keypassword)
	    console.log(colors.red("Ignoring keypassword as no keystore given"));
    } // if ...

    const keystore = (program.keystore) ?
	  { "keystore": path.resolve(process.cwd(), program.keystore), "alias":program.keyalias, "password":program.keypassword }
	  :
	  false;

    return [zipfile, cmd, keystore];
} // parse_args

////////////////////////////////////////////
////////////////////////////////////////////
function unwrap_zip_file(source_file) {
    const p = new Promise((resolve, reject) => {
	if (!fs.existsSync(source_file))
	    reject(`The file ${source_file} does not exist`);

	clean_tmp_directory();
	const extract = require('extract-zip');
	extract(source_file, {dir: tmpDir}, (error) => {
	    if (!error) {
		console.log(`Unzipped ${source_file} into ${tmpDir}`);
		resolve();
	    } else {
		reject(error)
	    }
	});
    });
    return p;
} // unwrap_zip_file

function verify_zip_file() {
    const p = new Promise((resolve, reject) => {
	const check_files = ["index.html", "adapt", "course/config.json"];
	for (const c of check_files)
	    if (!fs.existsSync(path.join(tmpDir, c)))
		reject(`Doesn't look like an Adapt zipfile.  Could not find file ${c}`);
	resolve();
    });
    return p;
} // verify_zip_file

function drop_adapt_into_cordova() {
    const p = new Promise((resolve, reject) => {
	const www_dir = path.join(appDir, "www");
	clean_directory(www_dir);

	const files = gather_files(tmpDir);

	console.log("Copying Adapt files into Cordova build")
	for (let i = 0; i != files.length; ++i) {
	    copy_file(files[i], tmpDir, www_dir);
	    progress.bar(files[i], (i/files.length*100));
	} // for ...
	progress.bar("Copied `${files.length} files", 100);

	resolve();
    });
    return p;
} // drop_adapt_into_cordova

function grab_adapt_details() {
    const course_json = read_adapt_course_json();
    return [course_json["id"], course_json["name"].replace(" ", ""), course_json["androidPublicKey"]];
} // grab_adapt_details

function update_config_xml() {
    const p = new Promise((resolve, reject) => {
	console.log("Updating Cordova config.xml");
	const course_json = read_adapt_course_json();
	const cordova_config = read_cordova_config_xml();

	const mappings = [
	    ["description", "widget/description"],
	    ["version", "widget/@version"],
	    ["authorName", "widget/author"],
	    ["authorEmail", "widget/author/@email"],
	    ["authorWebsite", "widget/author/@href"],
	    ["appIcon", "widget/icon/@src", "../tmp/"]
	];

	for (let i = 0; i != mappings.length; ++i) {
	    let value = course_json[mappings[i][0]];
	    if (mappings[i][2])
		value = mappings[i][2] + value;
	    const xpath = mappings[i][1];
	    progress.bar(mappings[i][0] + " = " + value, i/mappings.length*100);
	    xml_config.set(cordova_config, xpath, value);
	} // for ...

	progress.bar("Updated Cordova config", 100);

	write_cordova_config_xml(cordova_config);
	resolve();
    });
    return p;
} // update_config_xml

function add_obb_hooks() {
    remove_obb_hooks();
    const cordova_config = read_cordova_config_xml();
    const android_node = cordova_config.find("./platform[@name='android']");
    const hooks = [["after_prepare", "../scripts/android/package_videos.js"],
		   ["after_run", "../scripts/android/install_obb.js"]];
    for (const hook of hooks) {
	const hook_node = elementtree.SubElement(android_node, "hook");
	hook_node.set("type", hook[0]);
	hook_node.set("src", hook[1]);
    } // for ...

    write_cordova_config_xml(cordova_config);
} // add_obb_hooks

function remove_obb_hooks() {
    const cordova_config = read_cordova_config_xml();
    const android_node = cordova_config.find("./platform[@name='android']");

    for(const hook of android_node.findall("./hook"))
	android_node.remove(hook);

    write_cordova_config_xml(cordova_config);
} // remove_obb_hooks

function read_adapt_course_json() {
    const course_json_filename = "course.json";
    const cordova_tag = "_cordova";

    const course_file = find_file.by_name(course_json_filename, tmpDir);
    if (!course_file)
	throw(`Could not find a ${course_json_filename} in the Adapt files`);

    console.log("Reading course config from " + course_file.substring(tmpDir.length+1));
    const course_config = JSON.parse(fs.readFileSync(course_file));
    if (!course_config[cordova_tag])
	throw(`Could not find ${cordova_tag} tag in the course config`);
    return course_config[cordova_tag];
} // read_adapt_course_json

function read_cordova_config_xml() {
    const config_xml_file = path.join(appDir, "config.xml");
    if (!fs.existsSync(config_xml_file))
	throw("Could not find Cordova config.xml.  Which is alarming!");

    const config_doc = xml_config.read(config_xml_file);
    return config_doc;
} // read_cordova_config_xml

function write_cordova_config_xml(cordova_config) {
    xml_config.write(cordova_config,
		     path.join(appDir, "config.xml"));
} // write_cordova_config_xml

/////////////////////////////////////
/////////////////////////////////////
function clean_tmp_directory() {
    if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
	return;
    } // if ...

    clean_directory(tmpDir);
} // clean_tmp_directory

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

function gather_files(dir, topmost = dir) {
    let files = [];
    const relDir = dir.substring(topmost.length);
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile())
	    files.push(path.join(relDir, name));
	if (stat.isDirectory())
	    files.push(...gather_files(fullName, topmost));
    } // for ...
    return files;
} // gather_files

function copy_file(name, srcRootDir, destRootDir) {
    const srcName = path.join(srcRootDir, name);
    const destName = path.join(destRootDir, name);
    const destDir = path.dirname(destName);

    if (!fs.existsSync(destDir))
	fs.mkdirsSync(destDir);

    const BUF_LENGTH = 64*1024;
    const buff = new Buffer(BUF_LENGTH);
    const bytesToRead = fs.statSync(srcName).size;

    const fdr = fs.openSync(srcName, fs.constants.O_RDONLY);
    const fdw = fs.openSync(destName, fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_WRONLY);
    for (let pos = 0; pos != bytesToRead; ) {
	let bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
	fs.writeSync(fdw, buff, 0, bytesRead);
	pos += bytesRead;
    } // for ...
    fs.closeSync(fdr);
    fs.closeSync(fdw);
} // copy_file
