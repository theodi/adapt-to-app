#!/usr/bin/env ruby
require 'find'
require 'fileutils'

wordy = true
apkName = "io.cordova.hellocordova"

pwd = ARGV[0]
platformRoot = pwd + "/platforms/android"
buildDir = platformRoot + "/build/obb"

androidDir = ENV['ANDROID_HOME']
adb = "#{androidDir}/platform-tools/adb"

puts "Installing OBB to device ... " if wordy
obbFileName = "main.1.#{apkName}.obb"

mntpointcmd = "#{adb} shell echo \\$EXTERNAL_STORAGE"
puts "  finding sdcard mount point with #{mntpointcmd}" if wordy
mntpoint = `#{mntpointcmd}`.chomp
puts "  mount point is #{mntpoint}" if wordy

pushcmd = "#{adb} push #{buildDir}/#{obbFileName} #{mntpoint}/Android/obb/#{apkName}/#{obbFileName}"
puts "  running #{pushcmd}" if wordy
`#{pushcmd}`
puts "Expansion file installed to /sdcard/Android/obb/#{apkName}/#{obbFileName}"
