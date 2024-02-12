export type Args = {
  old: string;
  new: string;

  tolerance: Tolerance;
  mode: Mode;
  output?: string;

  notifications?: {
    token: string;
    label?: string;
    issue: boolean;
    check: boolean;
  };
};

export enum Tolerance {
  Better = 'better',
  MixedBetter = 'mixed-better',
  Same = 'same',
  Mixed = 'mixed',
  MixedWorse = 'mixed-worse',
  Worse = 'worse',
}

export enum Mode {
  Strict = 'strict',
  Addition = 'addition',
  Deletion = 'deletion',
}
