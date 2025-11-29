// SUDOKU HINT TYPES

import type { Square, Digit, Unit } from '../types.js';

// Comprehensive hint system types
export interface HintBase {
	technique: string;
	difficulty: number; // Numeric difficulty (0-100 scale)
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

export interface XWingHint extends HintBase {
	type: 'x_wing';
	technique: 'x_wing';
	digit: Digit;
	squares: Square[];
	primaryUnits: Unit[];
	primaryUnitType: 'row' | 'column';
	secondaryUnits: Unit[];
	secondaryUnitType: 'row' | 'column';
	eliminationCells: Square[];
}

export interface ChuteRemotePairsHint extends HintBase {
	type: 'chute_remote_pairs';
	technique: 'chute_remote_pairs';
	digits: [Digit, Digit];
	remotePairSquares: [Square, Square];
	chuteType: 'horizontal' | 'vertical';
	thirdBoxSquares: Square[];
	presentDigit: Digit;
	absentDigit: Digit;
	eliminationCells: Square[];
}

export interface SimpleColoringHint extends HintBase {
	type: 'simple_coloring';
	technique: 'simple_coloring';
	digit: Digit;
	chain: Square[];
	chainColors: Record<Square, 'color1' | 'color2'>; // Color assignment for each cell in the chain
	eliminationCells: Square[];
	rule: 'rule_2' | 'rule_4';
	conflictUnit?: Unit; // For rule 2 - the unit with same color twice
	conflictUnitType?: string; // For rule 2
	witnessCell?: Square; // For rule 4 - the cell that sees both colors
}

export interface YWingHint extends HintBase {
	type: 'y_wing';
	technique: 'y_wing';
	pivotCell: Square;
	pincer1Cell: Square;
	pincer2Cell: Square;
	candidateA: Digit; // The candidate shared by pivot and pincer1
	candidateB: Digit; // The candidate shared by pivot and pincer2
	candidateC: Digit; // The candidate shared by both pincers (elimination target)
	eliminationCells: Square[];
}

export type SudokuHint =
	| ErrorHint
	| MissingCandidateHint
	| SingleCellHint
	| NakedSetHint
	| HiddenSetHint
	| IntersectionRemovalHint
	| XWingHint
	| ChuteRemotePairsHint
	| SimpleColoringHint
	| YWingHint;
