const fs = require("fs");
const path = require('path');
const tmp = require('tmp');

const index = require('./index.js');
const util = require('./utils.js');

// Backup console.log
const console_log = console.log

// Remove all temp directories recursively on exit
tmp.setGracefulCleanup({ unsafeCleanup: true });

beforeEach(() => {
  util.cleanEnv();
  cwd = process.cwd();
  console.log = jest.fn();
  tmpdir = tmp.dirSync({ template: 'cache-validation-test-XXXXXX',
    unsafeCleanup: true });
});

afterEach(() => {
  console.log = console_log
  tmpdir.removeCallback();
  process.chdir(cwd);
  util.cleanEnv();
});

test('Recursive path', () => {
  process.env['INPUT_CACHE_HIT'] = 'true';
  process.env['INPUT_PATH'] = 'good';

  process.chdir(tmpdir.name);
  fs.mkdirSync('good');
  fs.mkdirSync('good/better');
  fs.mkdirSync('good/better/best');
  fs.writeFileSync('good/better/best/foo', 'bar');
  fs.writeFileSync('good/bar', 'foo');

  fs.writeFileSync('good/MD5SUMS', 
    '37b51d194a7513e45b56f6524f2d51f2  good/better/best/foo\n' +
    'acbd18db4cc2f85cedef654fccc4a4d8  good/bar\n'
  );

  index.main();

  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0]).toBe('good: hashed 2 files.');
  expect(console.log.mock.calls[1][0]).toBe('Total files hashed 2.');
  expect(fs.readdirSync(path.join(tmpdir.name, 'good')).length).toBe(3)
});
