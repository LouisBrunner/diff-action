export type Args = {
  old: string;
  new: string;

  tolerance: Tolerance;
  output?: string;

  notifications?: {
    token: string;
    issue: boolean;
    check: boolean;
  };
};

export enum Tolerance {
  Better = 'better',
  MixedBetter = 'mixed-better',
  Same = 'same',
  MixedWorse = 'mixed-worse',
  Worse = 'worse',
}
