const fs = require("fs-extra");
const vidl = require('vimeo-downloader');

var vimeourl = process.argv[2];
var destVideoPath = process.argv[3];

let total = 0;

console.log(`    downloading ${vimeourl} to ${destVideoPath} ...`);

const stream = vidl(vimeourl, { quality: "720p", format: "mp4" });
stream.pipe(fs.createWriteStream(destVideoPath));

stream.on('data', (chunk) => {
    total += chunk.length
    const kb = Math.floor(total/1024);
    process.stdout.write(`\r    downloaded ${kb}kB`);
});