const fs = require("fs");
const path = require('path');
const tmp = require('tmp');

const md5sum = require('./md5sum.js');
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
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'good';

  process.chdir(tmpdir.name);
  fs.mkdirSync('good');
  fs.mkdirSync('good/better');
  fs.mkdirSync('good/better/best');
  fs.writeFileSync('good/better/best/foo', 'bar');
  fs.writeFileSync('good/bar', 'foo');

  md5sum.main();

  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0]).toBe('good: hashed 2 files.');
  expect(console.log.mock.calls[1][0]).toBe('Total files hashed 2.');

  const MD5SUMS = fs.readFileSync('good/MD5SUMS', 'utf8').split('\n');
  expect(MD5SUMS).toEqual(expect.arrayContaining([
    '37b51d194a7513e45b56f6524f2d51f2  good/better/best/foo',
    'acbd18db4cc2f85cedef654fccc4a4d8  good/bar',
    '',
  ]));
  expect(MD5SUMS.length).toBe(3);
  expect(fs.readdirSync(path.join(tmpdir.name, 'good')).length).toBe(3)
});

/*
test('Relative path', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'good';

  process.chdir(tmpdir.name);
  fs.mkdirSync('good');
  fs.writeFileSync('good/foo', 'bar');

  md5sum.main();

  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0]).toBe('good: hashed 1 files.');
  expect(console.log.mock.calls[1][0]).toBe('Total files hashed 1.');
  expect(fs.readFileSync('good/MD5SUMS', 'utf8')).toBe(
    '37b51d194a7513e45b56f6524f2d51f2  good/foo\n');
  expect(fs.readdirSync(path.join(tmpdir.name, 'good')).length).toBe(2)
});

test('Empty directory', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = tmpdir.name;

  md5sum.main();

  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0]).toBe(`${tmpdir.name}: hashed 0 files.`);
  expect(console.log.mock.calls[1][0]).toBe('Total files hashed 0.');
  expect(fs.statSync(path.join(tmpdir.name, 'MD5SUMS')).size).toBe(0);
  expect(fs.readdirSync(tmpdir.name).length).toBe(1)
});
*/
