/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. It looks for a
 * MD5SUMS file in each given directory and verifies the contents
 * of the file. If the file does not exist an error is thrown.
 */

"use strict";

exports.ON_CACHE_HIT  = true
exports.ON_CACHE_MISS = false

exports.error = function (e) {
  exports.errorMessage(e.message);
}

exports.errorFatal = function (e) {
  process.exitCode = 1;
  console.log(e.message);
}

exports.errorMessage = function (message) {
  if (fatal) {
    process.exitCode = 1;
  }

  console.log(message);
}

exports.fileErrorHandler = function (func, ...args) {
  try {
    return func(...args)
  } catch(e) {
    const filePath = args[0];

    if (e.code === 'ENOENT') {
      exports.errorMessage(`${filePath}: File not found!`);
    } else {
      exports.errorFatal(e);
    }
  }
}

exports.mainHandler = function (on_cache_hit, stats, func, func_dir) {
  try {
    if (process.env['INPUT_CACHE_HIT'] === 'true' && on_cache_hit) {
      console.log('Cache hit no need to build MD5SUMS.')
      process.exit(0);
    }

    if (process.env['INPUT_CACHE_HIT'] !== 'true' && !on_cache_hit) {
      console.log('Cache miss: nothing to validate.');
      process.exit(0);
    }

    if (process.env['INPUT_FATAL'] === 'true') {
      fatal = 'true';
    }

    for (const directory of process.env['INPUT_PATH'].split('\n')) {
      if (directory.trim() !== '') {
        exports.fileErrorHandler(func, func_dir(directory));
      }
    }

    stats();
  } catch (e) {
    exports.errorFatal(e);
  }
}

exports.cleanEnv = function () {
  delete process.env['INPUT_CACHE_HIT'];
  delete process.env['INPUT_PATH'];
  delete process.env['INPUT_FATAL'];
  process.exitCode = 0;
}
