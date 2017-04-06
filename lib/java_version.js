"use strict";

exports.check = check;

function check(callback) {
    const spawn = require('child_process');
    const result = spawn.spawnSync('java', ['-version']);

    if (result.status === null) {
	console.log("Cound not spawn Java.  Is it installed and on the path?");
	process.exit(1);
    } // if ...
    if (result.status === 1) {
	console.log("Java ran, but there was an error: " + result.stderr);
	process.exit(1);
    } // if ...

    let version_info = result.stderr.toString().split('\n')[0];
    version_info = new RegExp('java version').test(version_info) ? version_info.split(' ')[2].replace(/"/g, '') : false;
    if (!version_info) {
	console.log("Could not find Java version info: " + result.stderr);
	process.exit(1);
    } // if ...

    const version = parseFloat(version_info);
    if (version < "1.8") {
	console.log("Android builds require Java version 1.8 or greater, but found only " + version_info);
	process.exit(1);
    } // if ...

    console.log("Java version is " + version_info);
} // check
