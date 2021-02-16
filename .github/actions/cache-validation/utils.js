/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. It looks for a
 * MD5SUMS file in each given directory and verifies the contents
 * of the file. If the file does not exist an error is thrown.
 */

"use strict";

exports.error = function (e) {
  exports.errorMessage(e.message);
}

exports.errorMessage = function (message) {
  process.exitCode = 1;
  console.log(message);
}

exports.fileError = function (func, ...args) {
  try {
    return func(...args)
  } catch(e) {
    const filePath = args[0];

    if (e.code === 'ENOENT') {
      exports.errorMessage(`${filePath}: File not found!`);
    } else {
      exports.error(e);
    }
  }
}
