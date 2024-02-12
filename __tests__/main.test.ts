import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';

// Configuration
const FIXTURES_FOLDER = path.join(__dirname, '..', 'fixtures');
const BASE_FILE = path.join(FIXTURES_FOLDER, 'file1_basic.txt');
const MODES = ['strict', 'addition', 'deletion'] as const;
type Mode = (typeof MODES)[number];
const TOLERANCES = ['better', 'same', 'mixed-better', 'mixed', 'mixed-worse', 'worse'] as const;
type Tolerance = (typeof TOLERANCES)[number];
const getToleranceWeight = (tolerance: Tolerance): number => {
  return TOLERANCES.indexOf(tolerance);
};
type TestFile = {
  path: string;
  diff: string;
  tolerance: Tolerance;
};
const TEST_FILES: TestFile[] = [
  {
    path: 'file2_deleted.txt',
    tolerance: 'worse',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file2_deleted.txt%0A@@ -1,4 +1,3 @@%0A A%0A-B%0A C%0A D%0A',
  },
  {
    path: 'file3_same.txt',
    tolerance: 'same',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file3_same.txt%0A',
  },
  {
    path: 'file4_added.txt',
    tolerance: 'better',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file4_added.txt%0A@@ -1,4 +1,5 @@%0A A%0A B%0A C%0A D%0A+E%0A',
  },
  {
    path: 'file5_mixed.txt',
    tolerance: 'mixed',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file5_mixed.txt%0A@@ -1,4 +1,4 @@%0A A%0A B%0A-C%0A D%0A+E%0A',
  },
  {
    path: 'file6_mixed_added.txt',
    tolerance: 'mixed-better',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file6_mixed_added.txt%0A@@ -1,4 +1,5 @@%0A A%0A B%0A-C%0A D%0A+E%0A+F%0A',
  },
  {
    path: 'file7_mixed_deleted.txt',
    tolerance: 'mixed-worse',
    diff: '===================================================================%0A--- FIXTURES/file1_basic.txt%0A+++ FIXTURES/file7_mixed_deleted.txt%0A@@ -1,4 +1,3 @@%0A A%0A B%0A-C%0A-D%0A+E%0A',
  },
];

const getExpected = (mode: Mode, tolerance: Tolerance, fileTolerance: Tolerance): boolean => {
  switch (mode) {
    case 'strict':
      return fileTolerance === 'same';
    case 'addition':
      return getToleranceWeight(tolerance) >= getToleranceWeight(fileTolerance);
    case 'deletion': {
      let realTolerance = fileTolerance;
      switch (fileTolerance) {
        case 'mixed-better':
          realTolerance = 'mixed-worse';
          break;
        case 'mixed-worse':
          realTolerance = 'mixed-better';
          break;
        case 'better':
          realTolerance = 'worse';
          break;
        case 'worse':
          realTolerance = 'better';
          break;
      }
      return getToleranceWeight(tolerance) >= getToleranceWeight(realTolerance);
    }
  }
};

describe('run action', () => {
  type ActionOutputs = {
    passed: boolean;
    output: string;
  };

  const parseOutput = (actionOutput: string): ActionOutputs => {
    let passed: boolean | undefined = undefined;
    let output: string | undefined = undefined;
    for (const line of actionOutput.split('\n')) {
      if (line.startsWith('::set-output name=passed::')) {
        passed = line.split('::set-output name=passed::')[1] === 'true';
      }
      if (line.startsWith('::set-output name=output::')) {
        output = line.split('::set-output name=output::')[1];
      }
    }
    if (passed === undefined || output === undefined) {
      throw new Error('Action did not return expected output');
    }
    return {passed, output};
  };

  const runAction = (oldFile: string, newFile: string, tolerance: Tolerance, mode: Mode): ActionOutputs => {
    process.env['INPUT_OLD'] = oldFile;
    process.env['INPUT_NEW'] = newFile;
    process.env['INPUT_TOLERANCE'] = tolerance.toString();
    process.env['INPUT_MODE'] = mode.toString();
    process.env['GITHUB_OUTPUT'] = '';
    const main = path.join(__dirname, '..', 'lib', 'main.js');
    const options: cp.ExecSyncOptions = {
      env: process.env,
    };
    try {
      const actionOutput = cp.spawnSync('node', [main], options).output.toString();
      return parseOutput(actionOutput);
    } catch (e) {
      const error = e as Error & {stdout: Buffer | string};
      if (error.stdout === undefined) {
        throw error;
      }
      try {
        return parseOutput(error.stdout.toString());
      } catch {
        // eslint-disable-next-line no-empty
      }
      throw new Error(`Action failed with error: ${error.message} and output: ${error.stdout.toString()}`);
    }
  };

  type Case = {
    name: string;
    newFile: string;
    tolerance: Tolerance;
    mode: Mode;
    expectedPass?: boolean;
    expectedOutput?: string;
    expectError?: boolean;
  };

  const cases = ((): Case[] => {
    const cases: Case[] = [
      {
        name: 'an unknown file',
        newFile: 'do not exist . whatever',
        mode: 'strict',
        tolerance: 'same',
        expectError: true,
      },
      {
        name: 'an unknown mode',
        newFile: TEST_FILES[0].path,
        mode: 'mixed' as unknown as Mode,
        tolerance: 'same',
        expectError: true,
      },
      {
        name: 'an unknown tolerance',
        newFile: TEST_FILES[0].path,
        mode: 'addition',
        tolerance: 'high' as unknown as Tolerance,
        expectError: true,
      },
    ];

    for (const mode of MODES) {
      for (const tolerance of TOLERANCES) {
        for (const file of TEST_FILES) {
          const expectedPass = getExpected(mode, tolerance, file.tolerance);
          const expectError = mode === 'strict' && tolerance !== 'same';
          let result = 'to pass';
          if (!expectedPass) {
            result = 'to fail';
          }
          if (expectError) {
            result = 'an error';
          }
          cases.push({
            name: `file ${file.path}, mode ${mode}, tolerance ${tolerance} and expecting ${result}`,
            newFile: file.path,
            tolerance: tolerance,
            mode: mode,
            expectedPass,
            expectedOutput: file.diff,
            expectError,
          });
        }
      }
    }

    return cases;
  })();

  test.each(cases)('with $name', ({newFile, tolerance, mode, expectedPass, expectedOutput, expectError}: Case) => {
    if (expectError) {
      expect(() => {
        runAction(BASE_FILE, newFile, tolerance, mode);
      }).toThrow();
      return;
    }
    const {passed, output} = runAction(BASE_FILE, path.join(FIXTURES_FOLDER, newFile), tolerance, mode);
    expect(passed).toBe(expectedPass);
    expect(output.replace(new RegExp(FIXTURES_FOLDER, 'g'), 'FIXTURES')).toBe(expectedOutput);
  });
});

// TODO: missing tests for notifications?
