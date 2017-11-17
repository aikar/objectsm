#!/usr/bin/env node

// Use this entry point to avoid having to compile before testing changes
const path = require("path");
require('babel-polyfill');
require('babel-register')(require("../.babelrc.js"));
require('module-alias/register');
process.execArgv.splice(1, 0, __filename);
process.argv.splice(1, 1);

global.devNodeUseDist = false;
if (process.argv[2] === "--use-dist") {
  global.devNodeUseDist = true;
  process.execArgv.splice(2, 0, "--use-dist");
  process.argv.splice(2, 1);
}

require(path.resolve(process.cwd(), process.argv[1]));
