import fs from "node:fs";
import { createTwoFilesPatch, diffLines } from "diff";
import * as Inputs from "./namespaces/Inputs";

export type Result = {
	result: Inputs.Tolerance;
	passed: boolean;
	summary: string;
	output: string;
};

type ToleranceLevelMap = Record<Inputs.Tolerance, number>;

const levels: ToleranceLevelMap = {
	[Inputs.Tolerance.Better]: 3,
	[Inputs.Tolerance.Same]: 2,
	[Inputs.Tolerance.MixedBetter]: 1,
	[Inputs.Tolerance.Mixed]: -1,
	[Inputs.Tolerance.MixedWorse]: -2,
	[Inputs.Tolerance.Worse]: -3,
};

const compareTolerance = (
	expected: Inputs.Tolerance,
	result: Inputs.Tolerance,
): boolean => {
	return levels[result] >= levels[expected];
};

const getSummary = (
	passed: boolean,
	expected: Inputs.Tolerance,
	result: Inputs.Tolerance,
): string => {
	if (!passed) {
		return `Expected tolerance \`${expected}\` but got \`${result}\` instead`;
	}
	return `Check succeeded with tolerance \`${result}\` (expected \`${expected}\` or better)`;
};

const calculateResult = (
	counts: { added: number; removed: number },
	mode: Inputs.Mode,
	expected: Inputs.Tolerance,
): { result: Inputs.Tolerance; passed: boolean } => {
	if (mode === Inputs.Mode.Strict) {
		if (counts.removed === 0 && counts.added === 0) {
			return { passed: true, result: Inputs.Tolerance.Same };
		}
		return { passed: false, result: Inputs.Tolerance.Worse };
	}

	let result = Inputs.Tolerance.Same;
	if (counts.removed === 0 && counts.added === 0) {
		result = Inputs.Tolerance.Same;
	} else if (counts.removed === counts.added) {
		result = Inputs.Tolerance.Mixed;
	} else if (counts.removed > 0 && counts.added === 0) {
		result =
			mode === Inputs.Mode.Addition
				? Inputs.Tolerance.Worse
				: Inputs.Tolerance.Better;
	} else if (counts.removed > 0 && counts.removed > counts.added) {
		result =
			mode === Inputs.Mode.Addition
				? Inputs.Tolerance.MixedWorse
				: Inputs.Tolerance.MixedBetter;
	} else if (counts.added > 0 && counts.removed === 0) {
		result =
			mode === Inputs.Mode.Addition
				? Inputs.Tolerance.Better
				: Inputs.Tolerance.Worse;
	} else if (counts.added > 0 && counts.added > counts.removed) {
		result =
			mode === Inputs.Mode.Addition
				? Inputs.Tolerance.MixedBetter
				: Inputs.Tolerance.MixedWorse;
	}
	return { passed: compareTolerance(expected, result), result };
};

export const processDiff = (
	old: string,
	newPath: string,
	mode: Inputs.Mode,
	expected: Inputs.Tolerance,
): Result => {
	const oldContent = fs.readFileSync(old, "utf-8");
	const newContent = fs.readFileSync(newPath, "utf-8");
	const diff = diffLines(oldContent, newContent);

	const counts = {
		added: 0,
		removed: 0,
	};
	for (const change of diff) {
		const count = change.count ? change.count : 1;
		if (change.added) {
			counts.added += count;
		}
		if (change.removed) {
			counts.removed += count;
		}
	}

	const { result, passed } = calculateResult(counts, mode, expected);
	return {
		result,
		passed,
		summary: getSummary(passed, expected, result),
		output: createTwoFilesPatch(old, newPath, oldContent, newContent),
	};
};
