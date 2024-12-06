import fs from "node:fs";
import { createTwoFilesPatch, diffLines } from "diff";
import { Mode, Tolerance } from "./inputs";

export type Result = {
	result: Tolerance;
	passed: boolean;
	summary: string;
	output: string;
};

type ToleranceLevelMap = Record<Tolerance, number>;

const levels: ToleranceLevelMap = {
	[Tolerance.Better]: 3,
	[Tolerance.Same]: 2,
	[Tolerance.MixedBetter]: 1,
	[Tolerance.Mixed]: -1,
	[Tolerance.MixedWorse]: -2,
	[Tolerance.Worse]: -3,
};

const compareTolerance = (expected: Tolerance, result: Tolerance): boolean => {
	return levels[result] >= levels[expected];
};

const getSummary = (
	passed: boolean,
	expected: Tolerance,
	result: Tolerance,
): string => {
	if (!passed) {
		return `Expected tolerance \`${expected}\` but got \`${result}\` instead`;
	}
	return `Check succeeded with tolerance \`${result}\` (expected \`${expected}\` or better)`;
};

const calculateResult = (
	counts: { added: number; removed: number },
	mode: Mode,
	expected: Tolerance,
): { result: Tolerance; passed: boolean } => {
	if (mode === Mode.Strict) {
		if (counts.removed === 0 && counts.added === 0) {
			return { passed: true, result: Tolerance.Same };
		}
		return { passed: false, result: Tolerance.Worse };
	}

	let result = Tolerance.Same;
	if (counts.removed === 0 && counts.added === 0) {
		result = Tolerance.Same;
	} else if (counts.removed === counts.added) {
		result = Tolerance.Mixed;
	} else if (counts.removed > 0 && counts.added === 0) {
		result = mode === Mode.Addition ? Tolerance.Worse : Tolerance.Better;
	} else if (counts.removed > 0 && counts.removed > counts.added) {
		result =
			mode === Mode.Addition ? Tolerance.MixedWorse : Tolerance.MixedBetter;
	} else if (counts.added > 0 && counts.removed === 0) {
		result = mode === Mode.Addition ? Tolerance.Better : Tolerance.Worse;
	} else if (counts.added > 0 && counts.added > counts.removed) {
		result =
			mode === Mode.Addition ? Tolerance.MixedBetter : Tolerance.MixedWorse;
	}
	return { passed: compareTolerance(expected, result), result };
};

export const processDiff = (
	old: string,
	newPath: string,
	mode: Mode,
	expected: Tolerance,
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
