// SUDOKU HINTS INDEX
// Central export point for all hint-related functionality

export {
	getTechniqueDifficulty,
	difficultyToCategory,
	TECHNIQUE_DIFFICULTIES,
	SORTED_TECHNIQUES,
	solvePuzzleWithHints,
	evaluatePuzzleDifficulty,
} from './difficulty.js';

export type { SolveResult } from './difficulty.js';

export type {
	SudokuHint,
	ErrorHint,
	MissingCandidateHint,
	SingleCellHint,
	NakedSetHint,
	HiddenSetHint,
	IntersectionRemovalHint,
	YWingHint,
	HintBase,
} from './types.js';

// Hint detection functions
export { getHint, valuesToCandidates } from './detector.js';
