import * as Inputs from './namespaces/Inputs';

export type Result = {
  result: Inputs.Tolerance;
  passed: boolean;
  summary: string;
  output: string;
};

type ToleranceLevelMap = Record<Inputs.Tolerance, number>;

const levels: ToleranceLevelMap = {
  [Inputs.Tolerance.Better]: 2,
  [Inputs.Tolerance.MixedBetter]: 1,
  [Inputs.Tolerance.Same]: 0,
  [Inputs.Tolerance.MixedWorse]: -1,
  [Inputs.Tolerance.Worse]: -2,
};

const compareTolerance = (expected: Inputs.Tolerance, result: Inputs.Tolerance): boolean => {
  return levels[result] >= levels[expected];
};

const getSummary = (passed: boolean, expected: Inputs.Tolerance, result: Inputs.Tolerance): string => {
  if (!passed) {
    return `Expected tolerance '${expected}' but got '${result}' instead`;
  }
  return `Check succeeded with tolerance '${result}' (expected '${expected}' or better)`;
};

export const processDiff = (old: string, newPath: string, expected: Inputs.Tolerance): Result => {
  let result = Inputs.Tolerance.Better;
  let output = '';
  // TODO: finish
  const passed = compareTolerance(expected, result);
  return {
    result,
    passed,
    summary: getSummary(passed, expected, result),
    output,
  };
};
