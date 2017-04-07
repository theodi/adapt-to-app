"use strict";

exports.by_name = find_by_name;
exports.by_suffix = find_by_suffix;

const fs = require("fs-extra");
const path = require("path");

function find_by_name(targetName, dir) {
    return find_file((name) => path.basename(name) === targetName, dir);
} // find_by_name

function find_by_suffix(suffix, dir) {
    return find_file((name) => name.endsWith(suffix), dir);
} // find_by_suffix

function find_file(testFn, dir) {
    for (const name of fs.readdirSync(dir)) {
	const fullName = path.join(dir, name);
	const stat = fs.statSync(fullName);
	if (stat.isFile() && testFn(name))
	    return fullName;
	if (stat.isDirectory()) {
	    let app = find_file(testFn, fullName);
	    if (app)
		return app;
	} // if ...
    }
} // find_file
