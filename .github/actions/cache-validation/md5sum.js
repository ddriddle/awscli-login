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

let total = 0;

// The code for this function was taken from this blog post:
// https://allenhwkim.medium.com/nodejs-walk-directory-f30a2d8f038f
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ?
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
};

function createMD5SUMS(directory) {
  const filename = path.join(directory, "MD5SUMS")
  const stream = fs.createWriteStream(filename, {flags:'ax'});

  stream.on('error', function(e) {
      util.errorMessage(`${e.message}`);
  });

  let count = 0;
  walkDir(directory, function(filePath) {
    if (path.basename(filePath) != 'MD5SUMS') {
      const contents = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('md5').update(contents).digest("hex")
      stream.write(`${hash}  ${filePath}\n`);
      count++;
    }
  });

  stream.end();
  console.log(`${directory}: hashed ${count} files.`);
  total += count;
}

try {
  if (process.env['INPUT_CACHE_HIT'] === 'true') {
    console.log('Cache hit no need to build MD5SUMS.')
    process.exit(0);
  }

  process.on('exit', (code) => {
    console.log(`Total files hashed ${total}.`);
  });


  process.env['INPUT_PATH'].split('\n').forEach(function (directory, index) {
    if (directory.trim() !== '') {
        util.fileError(createMD5SUMS, directory);
    }
  });

} catch (error) {
  util.error(e);
}
