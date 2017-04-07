"use strict";

exports.bar = progress;

const blanks = "                               ";

function progress(msg, percentage) {
    let bar = pad(msg) + "   [";
    const percent = Math.floor(percentage);
    const steps = Math.floor(percent / 5);
    bar += "====================".substring(0, steps);
    if (steps != 20)
	bar += ">";
    bar += blanks.substring(0, 19-steps);
    bar += "] " + percent + "%   ";
    process.stdout.write("\r" + bar);

    if (percent == 100)
	process.stdout.write("\n");
} // progress

function pad(msg) {
    if (msg.length > 30)
	return msg.substring(msg.length - 30);
    return blanks.substring(0, 30 - msg.length) + msg;
}
