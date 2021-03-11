/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. A MD5SUMS file
 * is added to each given directory. Each MD5SUMS file contains the
 * hash of every file recursively found inside the MD5SUMS's parent
 * directory.
 */
"use strict";

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const util = require('./utils.js');

// The code for this function was taken from this blog post:
// https://allenhwkim.medium.com/nodejs-walk-directory-f30a2d8f038f
function walkDir(dir, callback) {
  for (const f of fs.readdirSync(dir)) {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ?
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  }
};

function createMD5SUMS(directory) {
  const file = fs.openSync(path.join(directory, "MD5SUMS"), 'w');

  let count = 0;
  walkDir(directory, function(filePath) {
    if (path.basename(filePath) != 'MD5SUMS') {
      const contents = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('md5').update(contents).digest("hex")
      fs.writeSync(file, `${hash}  ${filePath}\n`);
      count++;
    }
  });

  fs.close(file);
  console.log(`${directory}: hashed ${count} files.`);
  total += count;
}

function initGlobalVars() {
  /* variables for keeping track of stats */
  global.total = 0;
  
  /* Return 1 on checksum or file errors if true, otherwise 0 */
  global.fatal = false;
}

exports.main = function () {
  initGlobalVars();

  function stats() {
    console.log(`Total files hashed ${total}.`);
  }

  function dir(directory) {
    return directory;
  }

  util.mainHandler(util.ON_CACHE_HIT, stats, createMD5SUMS, dir);
}

/* istanbul ignore next */
if (require.main === module) {
  exports.main();
}
