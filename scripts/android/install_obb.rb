#!/usr/bin/env ruby
require 'find'
require 'fileutils'

wordy = true
apkName = "io.cordova.hellocordova"

pwd = ARGV[0]
platformRoot = pwd + "/platforms/android"
buildDir = platformRoot + "/build/obb"

androidDir = ENV['ANDROID_HOME']

puts "Installing OBB to device ... " if wordy
obbFileName = "main.1.#{apkName}.obb"

adbcmd = "#{androidDir}/platform-tools/adb push #{buildDir}/#{obbFileName} /sdcard/Android/obb/#{apkName}/#{obbFileName}"
puts "  running #{adbcmd}" if wordy
`#{adbcmd}`
puts "Expansion file installed to /sdcard/Android/obb/#{apkName}/#{obbFileName}"
