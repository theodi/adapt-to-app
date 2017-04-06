#!/usr/bin/env node
"use strict";

const java_version = require("./lib/java_version");
java_version.check();


const android_install = require("./lib/android_install");
android_install.check();
