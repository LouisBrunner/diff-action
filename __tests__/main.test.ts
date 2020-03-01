import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_OLD'] = path.join(__dirname, '..', 'fixtures', 'file1_basic.txt');
  process.env['INPUT_NEW'] = path.join(__dirname, '..', 'fixtures', 'file4_added.txt');
  process.env['INPUT_TOLERANCE'] = 'better';
  process.env['INPUT_MODE'] = 'addition';
  const ip = path.join(__dirname, '..', 'lib', 'main.js');
  const options: cp.ExecSyncOptions = {
    env: process.env,
  };
  try {
    console.log(cp.execSync(`node ${ip}`, options).toString());
  } catch (e) {
    console.log(e.stdout.toString());
    throw e;
  }
});

// TODO: add more
