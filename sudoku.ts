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
import {
	generate,
	generateWithClues,
	generateWithDifficulty,
	generateByCategory,
} from './core/generator.js';

// Hint system
import {
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
	solvePuzzleWithHints,
	evaluatePuzzleDifficulty,
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
	DifficultyCategory,
	GenerationOptions,
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
	generateWithClues,
	generateWithDifficulty,
	generateByCategory,

	// Hint system
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
	solvePuzzleWithHints,
	evaluatePuzzleDifficulty,
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
	generateWithClues,
	generateWithDifficulty,
	generateByCategory,
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
	solvePuzzleWithHints,
	evaluatePuzzleDifficulty,
	// Backwards compatibility
	test: parseGrid,
};
