// SUDOKU TYPES

// Throughout this library we use the following variable names:
//    d - digit
//    r - row
//    c - column
//    s - square, e.g. E5
//    u - unit, e.g. one whole row, column or box of squares.

export type Square = string;
export type Digit = string;
export type Row = string;
export type Column = string;
export type Unit = Square[];
export type Grid = Record<Square, Digit>;
export type Values = Record<Square, string>;
export type Candidates = Record<Square, Set<Digit>>;

// Legacy hint types for backwards compatibility
export interface HintError {
	type: 'error';
	square: Square;
}

export interface HintSquare {
	type: 'squarehint';
	square: Square;
}

export interface HintUnit {
	type: 'unithint';
	unitType: 'row' | 'column' | 'box';
	unit: Unit;
	digit: Digit;
}

export interface HintDontKnow {
	type: 'dontknow';
	squares: Values;
}

export type Hint = HintError | HintSquare | HintUnit | HintDontKnow;

// Other types
export interface Conflict {
	unit: Unit;
	errorFields: Square[];
}

export interface SolverOptions {
	chooseDigit?: 'min' | 'max' | 'random';
	chooseSquare?: 'minDigits' | 'maxDigits' | 'random';
}

export type Difficulty =
	| 'trivial'
	| 'basic'
	| 'intermediate'
	| 'tough'
	| 'diabolical'
	| 'extreme'
	| 'master'
	| 'grandmaster';

// New fine-grained difficulty system (same as Difficulty now)
export type DifficultyCategory =
	| 'trivial'
	| 'basic'
	| 'intermediate'
	| 'tough'
	| 'diabolical'
	| 'extreme'
	| 'master'
	| 'grandmaster';

export interface GenerationOptions {
	minClues?: number; // Minimum number of starting clues
	maxClues?: number; // Maximum number of starting clues
	targetDifficulty?: number; // Target difficulty (1-100)
	toleranceDifficulty?: number; // How close to target we accept (+/- this amount)
	maxAttempts?: number; // Maximum generation attempts before giving up
	allowedCategories?: DifficultyCategory[]; // Restrict to certain categories
	startPuzzle?: Grid;
}
