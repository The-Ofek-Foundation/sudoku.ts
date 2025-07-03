// SUDOKU LIBRARY
// Modern, clean interface for sudoku solving, generation, and hint detection

// Core functionality
import {
	solve,
	parseGrid,
	isUnique,
	getConflicts,
	serialize,
	deserialize,
} from './core/solver.js';
import { generate } from './core/generator.js';

// Hint system
import {
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
} from './hints/index.js';

// Export all types
export type {
	Square,
	Digit,
	Row,
	Column,
	Unit,
	Grid,
	Values,
	Candidates,
	Hint,
	HintError,
	HintSquare,
	HintUnit,
	HintDontKnow,
	Conflict,
	SolverOptions,
	Difficulty,
} from './types.js';

export type {
	SudokuHint,
	ErrorHint,
	MissingCandidateHint,
	SingleCellHint,
	NakedSetHint,
	HiddenSetHint,
	IntersectionRemovalHint,
} from './hints/index.js';

// Export all functions with clean, simple names
export {
	// Core solving
	solve,
	parseGrid,
	isUnique,
	getConflicts,
	serialize,
	deserialize,

	// Puzzle generation
	generate,

	// Hint system
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
};

// Default export with all functionality for convenient import
export default {
	solve,
	parseGrid,
	isUnique,
	getConflicts,
	serialize,
	deserialize,
	generate,
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
	// Backwards compatibility
	test: parseGrid,
};
