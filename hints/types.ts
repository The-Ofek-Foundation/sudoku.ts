// SUDOKU HINT TYPES

import type { Square, Digit, Unit } from '../types.js';

// Comprehensive hint system types
export interface HintBase {
	technique: string;
	difficulty: number; // Numeric difficulty (1-10 scale)
}

export interface ErrorHint extends HintBase {
	type: 'error';
	technique: 'incorrect_value';
	square: Square;
	actualValue: Digit;
	correctValue: Digit;
}

export interface MissingCandidateHint extends HintBase {
	type: 'missing_candidate';
	technique: 'missing_candidate';
	square: Square;
	missingDigit: Digit;
}

export interface SingleCellHint extends HintBase {
	type: 'single_cell';
	technique:
		| 'last_remaining_in_box'
		| 'last_remaining_in_row'
		| 'last_remaining_in_column'
		| 'naked_single';
	square: Square;
	digit: Digit;
	unit?: Unit;
}

export interface NakedSetHint extends HintBase {
	type: 'naked_set';
	technique: 'naked_pairs' | 'naked_triples' | 'naked_quads';
	squares: Square[];
	digits: Digit[];
	unit: Unit;
	unitType: string;
	eliminationCells: Square[];
	eliminationDigits: Digit[];
}

export interface HiddenSetHint extends HintBase {
	type: 'hidden_set';
	technique: 'hidden_pairs' | 'hidden_triples' | 'hidden_quads';
	squares: Square[];
	digits: Digit[];
	unit: Unit;
	unitType: string;
	eliminationCells: Square[];
	eliminationDigits: Digit[];
}

export interface IntersectionRemovalHint extends HintBase {
	type: 'intersection_removal';
	technique: 'pointing_pairs' | 'box_line_reduction';
	digit: Digit;
	squares: Square[];
	primaryUnit: Unit;
	primaryUnitType: string;
	secondaryUnit: Unit;
	secondaryUnitType: string;
	eliminationCells: Square[];
}

export type SudokuHint =
	| ErrorHint
	| MissingCandidateHint
	| SingleCellHint
	| NakedSetHint
	| HiddenSetHint
	| IntersectionRemovalHint;
