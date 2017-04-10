"use strict";

const fs = require("fs-extra");
const elementtree = require("elementtree");

exports.read = xml_read;
exports.set = xml_set;
exports.write = xml_write;

function xml_read(filename) {
    return elementtree.parse(fs.readFileSync(filename, "utf-8").toString());
} // xml_read

function xml_write(doc, filename) {
    fs.writeFileSync(filename,
		     doc.write({indent: 4}),
		     "utf-8");
} // xml_write

function xml_set(doc, long_xpath, value) {
    const xpath = long_xpath.replace(doc.find('.').tag, ".");
    const last_slash = xpath.lastIndexOf('/');
    let at = xpath.substring(last_slash).indexOf('@');
    at += (at != -1) ? last_slash : 0;
    const elemPath = (at == -1) ? xpath : xpath.substring(0, at-1);
    const atPath = (at == -1) ? null : xpath.substring(at+1);

    let node = doc.find(elemPath);
    if (!node) {
	node = doc.find('.');
	const [, ...steps] = elemPath.split("/");
	for (const step of steps) {
	    let next = node.find("./" + step);
	    if (!next)
		next = elementtree.SubElement(node, step);
	    node = next;
	}
    } // if ...

    if (atPath)
	node.set(atPath, value);
    else
	node.text = value;
} // xml_set
