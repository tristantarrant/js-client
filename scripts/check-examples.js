#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(ROOT, 'examples');
const TIMEOUT = 30000;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ispn-examples-'));
fs.symlinkSync(ROOT, path.join(tmpDir, 'infinispan'));

function getContainerIp(name) {
  try {
    return execSync(
      `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${name}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim() || '';
  } catch (_) {
    return '';
  }
}

var host = process.env.ISPN_LOCAL_HOST || getContainerIp('ispn-local');
if (!host) {
  console.error('ERROR: Cannot determine Infinispan host. Either set ISPN_LOCAL_HOST or start containers with npm run docker:up');
  process.exit(1);
}

var examples = fs.readdirSync(EXAMPLES_DIR)
  .filter(function(d) { return fs.existsSync(path.join(EXAMPLES_DIR, d, 'main.js')); })
  .sort();

console.log('Running %d examples against %s...', examples.length, host);

var failed = [];

for (var i = 0; i < examples.length; i++) {
  var name = examples[i];
  var script = path.join('examples', name, 'main.js');
  process.stdout.write('  ' + name + '... ');

  var result = spawnSync('node', [script], {
    cwd: ROOT,
    timeout: TIMEOUT,
    env: Object.assign({}, process.env, {
      NODE_PATH: tmpDir,
      ISPN_HOST: host,
      ISPN_PASSWORD: 'pass'
    }),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.status === 0) {
    console.log('OK');
  } else {
    console.log('FAILED (exit %s)', result.status === null ? 'timeout' : result.status);
    var stderr = result.stderr ? result.stderr.toString().trim() : '';
    if (stderr) {
      stderr.split('\n').forEach(function(line) { console.log('    ' + line); });
    }
    failed.push(name);
  }
}

fs.rmSync(tmpDir, { recursive: true });

console.log('\n%d/%d examples passed.', examples.length - failed.length, examples.length);

if (failed.length > 0) {
  console.error('Failed: ' + failed.join(', '));
  process.exit(1);
}
