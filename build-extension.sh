#!/bin/bash
set -e

rm -rf automation/Extension/firefox

# For some reasons, the openwpm-firefox-webext package fails to build
# when the openwpm-webext-instrumentation is referenced via github.
#
# We just clone and build the repository locally then.
#
# Change this back to the original behaviour once the problem has been
# fixed in upstream.

rm -rf automation/Extension/openwpm-webext-instrumentation
git clone https://github.com/eriktews/openwpm-firefox-webext.git automation/Extension/firefox
git clone https://github.com/mozilla/openwpm-webext-instrumentation.git automation/Extension/openwpm-webext-instrumentation
cd automation/Extension/openwpm-webext-instrumentation
npm install
npm run build
cd ../firefox
git checkout local-build
npm install
npm run build
cp dist/*.zip ./openwpm.xpi
