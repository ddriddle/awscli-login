/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. It looks for a
 * MD5SUMS file in each given directory and verifies the contents
 * of the file. If the file does not exist an error is thrown.
 */

"use strict";

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const util = require('./utils.js');

function checkHash(filePath, old_hash) {
  missing++;
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('md5').update(fileContents).digest("hex");
  missing--;

  if (hash !== old_hash) {
    invalid++;
    util.errorMessage(`${filePath}: contents have changed!`);
  } else {
    valid++;
  }
}

function checkHashes(filePath) {
  const stream = fs.createReadStream(filePath);
  stream.on('error', function(e) {
      util.error(e);
  });

  const readInterface = readline.createInterface({
    input: stream,
    console: false
  });

  readInterface.on('line', function(line) {
    const [hash, filePath] = line.split('  ');

    util.fileErrorHandler(checkHash, filePath, hash);
  });
}

function initGlobalVars() {
  /* global variables for keeping track of stats */
  global.invalid = 0;
  global.missing = 0;
  global.valid = 0;
  
  /* Return 1 on checksum or file errors if true, otherwise 0 */
  global.fatal = false;
}

exports.main = function () {
  initGlobalVars();

  function stats() {
    console.log(`Invalid files: ${invalid} `)
    console.log(`Missing files: ${missing} `)
    console.log(`Valid files: ${valid} `)
    if (code === 0) {
      console.log('::set-output name=valid::true')
    } else {
      console.log('::set-output name=valid::false')
    }
  }

  function dir(directory) {
    return path.join(directory, "MD5SUMS");
  }

  util.mainHandler(util.ON_CACHE_MISS, stats, checkHashes, dir);
}

/* istanbul ignore next */
if (require.main === module) {
  exports.main();
}
