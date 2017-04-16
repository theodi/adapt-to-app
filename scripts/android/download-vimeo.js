const fs = require("fs-extra");
const vidl = require('vimeo-downloader');

var vimeourl = process.argv[2];
var destVideoPath = process.argv[3];

vidl(vimeourl, { quality: '720p' }).pipe(fs.createWriteStream(destVideoPath));