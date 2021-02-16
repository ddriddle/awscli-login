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

let invalid = 0;
let missing = 0;
let valid = 0;

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
      util.errorMessage(`${e.message}`);
  });

  const readInterface = readline.createInterface({
    input: stream,
    console: false
  });

  readInterface.on('line', function(line) {
    const [hash, filePath] = line.split('  ');

    util.fileError(checkHash, filePath, hash);
  });
}

try {
  if (process.env['INPUT_CACHE_HIT'] !== 'true') {
    console.log('Cache miss: nothing to validate.');
    process.exit(0);
  }

  process.on('exit', (code) => {
    console.log(`Invalid files: ${invalid} `)
    console.log(`Missing files: ${missing} `)
    console.log(`Valid files: ${valid} `)
    if (code === 0) {
      console.log('::set-output name=valid::true')
    } else {
      console.log('::set-output name=valid::false')
    }
  });

  process.env['INPUT_PATH'].split('\n').forEach(function (directory, index) {
    if (directory.trim() !== '') {
      util.fileError(checkHashes, path.join(directory, "MD5SUMS"));
    }
  });
} catch (e) {
  util.error(e);
}
