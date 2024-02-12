import {InputOptions} from '@actions/core';
import * as Inputs from './namespaces/Inputs';

type GetInput = (name: string, options?: InputOptions | undefined) => string;

export const parseInputs = (getInput: GetInput): Inputs.Args => {
  const old = getInput('old', {required: true});
  const newPath = getInput('new', {required: true});
  const mode = getInput('mode', {required: true}) as Inputs.Mode;
  const tolerance = getInput('tolerance', {required: true}) as Inputs.Tolerance;
  const output = getInput('output');

  if (!Object.values(Inputs.Mode).includes(mode)) {
    throw new Error(`invalid value for 'mode': '${mode}'`);
  }

  if (!Object.values(Inputs.Tolerance).includes(tolerance)) {
    throw new Error(`invalid value for 'tolerance': '${tolerance}'`);
  }

  if (mode == Inputs.Mode.Strict && tolerance != Inputs.Tolerance.Same) {
    throw new Error(`'tolerance' must be 'same' when 'mode' is 'strict'`);
  }

  let notifications;
  const notify_check = getInput('notify_check');
  const notify_issue = getInput('notify_issue');
  if (notify_check || notify_issue) {
    const label = getInput('title');
    const token = getInput('token', {required: true});
    notifications = {
      token,
      label,
      check: notify_check === 'true',
      issue: notify_issue === 'true',
    };
  }

  return {
    old,
    new: newPath,

    mode,
    tolerance,
    output,

    notifications,
  };
};
