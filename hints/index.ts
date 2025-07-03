// SUDOKU HINTS INDEX
// Central export point for all hint-related functionality

export {
	getTechniqueDifficulty,
	difficultyToCategory,
	TECHNIQUE_DIFFICULTIES,
	SORTED_TECHNIQUES,
} from './difficulty.js';

export type {
	SudokuHint,
	ErrorHint,
	MissingCandidateHint,
	SingleCellHint,
	NakedSetHint,
	HiddenSetHint,
	IntersectionRemovalHint,
	HintBase,
} from './types.js';

// TODO: Export hint detection functions when implemented
export { getHint } from './detector.js';
// export { detectNakedSingles, detectLastRemaining } from './singles.js';
// export { detectNakedPairs, detectNakedTriples } from './naked-sets.js';
// export { detectHiddenPairs, detectHiddenTriples } from './hidden-sets.js';
// export { detectPointingPairs, detectBoxLineReduction } from './intersection.js';
