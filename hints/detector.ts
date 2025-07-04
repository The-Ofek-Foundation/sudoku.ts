// COMPLETE WORKING HINT DETECTION SYSTEM
// Extracted from the original sudoku.ts that passed all tests

import type {
	Square,
	Digit,
	Grid,
	Values,
	Candidates,
	Unit,
} from '../types.js';

import type {
	SudokuHint,
	ErrorHint,
	MissingCandidateHint,
	SingleCellHint,
	NakedSetHint,
	HiddenSetHint,
	IntersectionRemovalHint,
} from './types.js';

import { getTechniqueDifficulty, SORTED_TECHNIQUES } from './difficulty.js';

import {
	SQUARES,
	DIGITS,
	ROWS,
	COLS,
	UNIT_LIST,
	PEERS,
	chars,
	cross,
	getUnitType,
} from '../core/utils.js';

import { solve } from '../core/solver.js';

/**
 * Detects values that are placed incorrectly (don't match the solution)
 */
function detectIncorrectValues(
	puzzle: string | Grid,
	values: Values,
): { square: Square; actualValue: Digit; correctValue: Digit }[] {
	const solved = solve(puzzle);
	if (!solved) {
		return [];
	}

	const mistakes: {
		square: Square;
		actualValue: Digit;
		correctValue: Digit;
	}[] = [];

	for (const square in values) {
		const guess = values[square];
		if (guess && guess.length === 1 && guess !== solved[square]) {
			mistakes.push({
				square,
				actualValue: guess,
				correctValue: solved[square],
			});
		}
	}

	return mistakes;
}

/**
 * Detects cells that are missing candidates for their correct solution digit
 */
function detectMissingCandidates(
	puzzle: string | Grid,
	values: Values,
	candidates: Candidates,
): { square: Square; missingDigit: Digit }[] {
	const solved = solve(puzzle);
	if (!solved) {
		return [];
	}

	const missingCandidates: { square: Square; missingDigit: Digit }[] = [];

	for (const square in solved) {
		// Skip cells that already have values
		if (values[square] && values[square].length === 1) {
			continue;
		}

		const correctDigit = solved[square];
		const cellCandidates = candidates[square] || new Set();

		if (!cellCandidates.has(correctDigit)) {
			missingCandidates.push({
				square,
				missingDigit: correctDigit,
			});
		}
	}

	return missingCandidates;
}

/**
 * Generic function to detect cells that are the last remaining empty cell in any unit type
 * Replaces the three separate functions for box/row/column detection
 */
function detectLastRemainingInUnits(
	values: Values,
): { square: Square; digit: Digit; unit: Unit }[] {
	const results: { square: Square; digit: Digit; unit: Unit }[] = [];

	for (const unit of UNIT_LIST) {
		const emptyCells = unit.filter(
			(square) => !values[square] || values[square].length > 1,
		);

		if (emptyCells.length === 1) {
			const square = emptyCells[0];
			const usedDigits = new Set<Digit>();

			// Find all digits already used in this unit
			for (const unitSquare of unit) {
				if (values[unitSquare] && values[unitSquare].length === 1) {
					usedDigits.add(values[unitSquare]);
				}
			}

			// The missing digit must go in the empty cell
			for (const digit of DIGITS) {
				if (!usedDigits.has(digit)) {
					results.push({
						square,
						digit,
						unit,
					});
					break;
				}
			}
		}
	}

	return results;
}

/**
 * Detects naked singles - cells that have only one possible digit
 */
function detectNakedSingles(
	candidates: Candidates,
): { square: Square; digit: Digit }[] {
	const results: { square: Square; digit: Digit }[] = [];

	for (const square in candidates) {
		const cellCandidates = candidates[square];
		if (cellCandidates && cellCandidates.size === 1) {
			const digit = Array.from(cellCandidates)[0] as Digit;
			results.push({ square, digit });
		}
	}

	return results;
}

/**
 * Detects naked pairs - two cells in the same unit that have exactly the same two candidates
 */
function detectNakedPairs(candidates: Candidates): {
	squares: [Square, Square];
	digits: [Digit, Digit];
	unit: Unit;
	unitType: string;
}[] {
	const results: {
		squares: [Square, Square];
		digits: [Digit, Digit];
		unit: Unit;
		unitType: string;
	}[] = [];

	// Check all units (rows, columns, boxes)
	for (const unit of UNIT_LIST) {
		const emptyCells = unit.filter(
			(square) => candidates[square] && candidates[square].size > 0,
		);

		// Check all pairs of empty cells
		for (let i = 0; i < emptyCells.length; i++) {
			for (let j = i + 1; j < emptyCells.length; j++) {
				const square1 = emptyCells[i];
				const square2 = emptyCells[j];
				const cands1 = candidates[square1];
				const cands2 = candidates[square2];

				// Both cells must have exactly 2 candidates and they must be identical
				if (cands1.size === 2 && cands2.size === 2) {
					const candidates1 = Array.from(cands1).sort() as [Digit, Digit];
					const candidates2 = Array.from(cands2).sort() as [Digit, Digit];

					if (
						candidates1[0] === candidates2[0] &&
						candidates1[1] === candidates2[1]
					) {
						const unitType = getUnitType(unit);

						results.push({
							squares: [square1, square2],
							digits: candidates1,
							unit,
							unitType,
						});
					}
				}
			}
		}
	}

	return results;
}

/**
 * Detects naked triples - three cells in the same unit that collectively have only three possible digits
 */
function detectNakedTriples(candidates: Candidates): {
	squares: [Square, Square, Square];
	digits: Digit[];
	unit: Unit;
	unitType: string;
}[] {
	const results: {
		squares: [Square, Square, Square];
		digits: Digit[];
		unit: Unit;
		unitType: string;
	}[] = [];

	// Check all units (rows, columns, boxes)
	for (const unit of UNIT_LIST) {
		const cellsWithFewCandidates = unit.filter(
			(square) =>
				candidates[square] &&
				candidates[square].size >= 2 &&
				candidates[square].size <= 3,
		);

		// Check all combinations of 3 cells
		for (let i = 0; i < cellsWithFewCandidates.length; i++) {
			for (let j = i + 1; j < cellsWithFewCandidates.length; j++) {
				for (let k = j + 1; k < cellsWithFewCandidates.length; k++) {
					const square1 = cellsWithFewCandidates[i];
					const square2 = cellsWithFewCandidates[j];
					const square3 = cellsWithFewCandidates[k];

					const combinedCandidates = new Set([
						...Array.from(candidates[square1]),
						...Array.from(candidates[square2]),
						...Array.from(candidates[square3]),
					]);

					// Check if the combined candidates contain exactly 3 digits
					if (combinedCandidates.size === 3) {
						const unitType = getUnitType(unit);

						results.push({
							squares: [square1, square2, square3],
							digits: Array.from(combinedCandidates).sort() as Digit[],
							unit,
							unitType,
						});
					}
				}
			}
		}
	}

	return results;
}

/**
 * Detects naked quads - four cells in the same unit that collectively have only four possible digits
 */
function detectNakedQuads(candidates: Candidates): {
	squares: [Square, Square, Square, Square];
	digits: Digit[];
	unit: Unit;
	unitType: string;
}[] {
	const results: {
		squares: [Square, Square, Square, Square];
		digits: Digit[];
		unit: Unit;
		unitType: string;
	}[] = [];

	// Check all units (rows, columns, boxes)
	for (const unit of UNIT_LIST) {
		const cellsWithFewCandidates = unit.filter(
			(square) =>
				candidates[square] &&
				candidates[square].size >= 2 &&
				candidates[square].size <= 4,
		);

		// Check all combinations of 4 cells
		for (let i = 0; i < cellsWithFewCandidates.length; i++) {
			for (let j = i + 1; j < cellsWithFewCandidates.length; j++) {
				for (let k = j + 1; k < cellsWithFewCandidates.length; k++) {
					for (let l = k + 1; l < cellsWithFewCandidates.length; l++) {
						const square1 = cellsWithFewCandidates[i];
						const square2 = cellsWithFewCandidates[j];
						const square3 = cellsWithFewCandidates[k];
						const square4 = cellsWithFewCandidates[l];

						const combinedCandidates = new Set([
							...Array.from(candidates[square1]),
							...Array.from(candidates[square2]),
							...Array.from(candidates[square3]),
							...Array.from(candidates[square4]),
						]);

						// Check if the combined candidates contain exactly 4 digits
						if (combinedCandidates.size === 4) {
							const unitType = getUnitType(unit);

							results.push({
								squares: [square1, square2, square3, square4],
								digits: Array.from(combinedCandidates).sort() as Digit[],
								unit,
								unitType,
							});
						}
					}
				}
			}
		}
	}

	return results;
}

/**
 * Detects hidden pairs - two digits that can only appear in two cells within a unit
 */
function detectHiddenPairs(candidates: Candidates): {
	squares: [Square, Square];
	digits: [Digit, Digit];
	unit: Unit;
	unitType: string;
}[] {
	const results: {
		squares: [Square, Square];
		digits: [Digit, Digit];
		unit: Unit;
		unitType: string;
	}[] = [];

	// Check all units (rows, columns, boxes)
	for (const unit of UNIT_LIST) {
		const digitPositions: Record<Digit, Square[]> = {};

		// Map each digit to the squares where it can appear in this unit
		for (const square of unit) {
			if (candidates[square]) {
				for (const digit of Array.from(candidates[square])) {
					if (!digitPositions[digit]) {
						digitPositions[digit] = [];
					}
					digitPositions[digit].push(square);
				}
			}
		}

		// Find pairs of digits that each appear in exactly the same two squares
		const digits = Object.keys(digitPositions);
		for (let i = 0; i < digits.length; i++) {
			for (let j = i + 1; j < digits.length; j++) {
				const digit1 = digits[i];
				const digit2 = digits[j];
				const positions1 = digitPositions[digit1];
				const positions2 = digitPositions[digit2];

				if (
					positions1 &&
					positions2 &&
					positions1.length === 2 &&
					positions2.length === 2 &&
					positions1[0] === positions2[0] &&
					positions1[1] === positions2[1]
				) {
					const unitType = getUnitType(unit);

					results.push({
						squares: [positions1[0], positions1[1]],
						digits: [digit1, digit2],
						unit,
						unitType,
					});
				}
			}
		}
	}

	return results;
}

/**
 * Detects hidden triples - three digits that can only appear in three cells within a unit
 */
function detectHiddenTriples(candidates: Candidates): {
	squares: [Square, Square, Square];
	digits: [Digit, Digit, Digit];
	unit: Unit;
	unitType: string;
}[] {
	const results: {
		squares: [Square, Square, Square];
		digits: [Digit, Digit, Digit];
		unit: Unit;
		unitType: string;
	}[] = [];

	// Check all units (rows, columns, boxes)
	for (const unit of UNIT_LIST) {
		const digitPositions: Record<Digit, Square[]> = {};

		// Map each digit to the squares where it can appear in this unit
		for (const square of unit) {
			if (candidates[square]) {
				for (const digit of Array.from(candidates[square])) {
					if (!digitPositions[digit]) {
						digitPositions[digit] = [];
					}
					digitPositions[digit].push(square);
				}
			}
		}

		// Find triples of digits that collectively appear in exactly the same three squares
		const digits = Object.keys(digitPositions);
		for (let i = 0; i < digits.length; i++) {
			for (let j = i + 1; j < digits.length; j++) {
				for (let k = j + 1; k < digits.length; k++) {
					const digit1 = digits[i];
					const digit2 = digits[j];
					const digit3 = digits[k];

					const allPositions = new Set([
						...(digitPositions[digit1] || []),
						...(digitPositions[digit2] || []),
						...(digitPositions[digit3] || []),
					]);

					// Check if these three digits appear in exactly three squares
					if (
						allPositions.size === 3 &&
						digitPositions[digit1] &&
						digitPositions[digit1].length <= 3 &&
						digitPositions[digit2] &&
						digitPositions[digit2].length <= 3 &&
						digitPositions[digit3] &&
						digitPositions[digit3].length <= 3
					) {
						const unitType = getUnitType(unit);

						const squareArray = Array.from(allPositions);
						results.push({
							squares: [squareArray[0], squareArray[1], squareArray[2]],
							digits: [digit1, digit2, digit3],
							unit,
							unitType,
						});
					}
				}
			}
		}
	}

	return results;
}

/**
 * Detects pointing pairs/triples - when a digit appears in only one line within a box
 */
function detectPointingPairs(candidates: Candidates): {
	digit: Digit;
	squares: Square[];
	box: Unit;
	line: Unit;
	lineType: 'row' | 'column';
	eliminationCells: Square[];
}[] {
	const results: {
		digit: Digit;
		squares: Square[];
		box: Unit;
		line: Unit;
		lineType: 'row' | 'column';
		eliminationCells: Square[];
	}[] = [];

	// Check each box
	const groupRows = ['ABC', 'DEF', 'GHI'];
	const groupCols = ['123', '456', '789'];

	for (let r = 0; r < groupRows.length; r++) {
		for (let c = 0; c < groupCols.length; c++) {
			const boxSquares = cross(chars(groupRows[r]), chars(groupCols[c]));

			// For each digit, check if it appears only in one row or column within this box
			for (const digit of DIGITS) {
				const digitSquares = boxSquares.filter(
					(square) => candidates[square] && candidates[square].has(digit),
				);

				if (digitSquares.length >= 2 && digitSquares.length <= 3) {
					// Check if all squares are in the same row
					const rows = new Set(digitSquares.map((square) => square[0]));
					if (rows.size === 1) {
						const row = Array.from(rows)[0];
						const rowSquares = cross([row], COLS);

						// Find eliminations - other squares in the same row but outside this box
						const eliminationCells = rowSquares.filter(
							(square) =>
								!boxSquares.includes(square) &&
								candidates[square] &&
								candidates[square].has(digit),
						);

						if (eliminationCells.length > 0) {
							results.push({
								digit,
								squares: digitSquares,
								box: boxSquares,
								line: rowSquares,
								lineType: 'row',
								eliminationCells,
							});
						}
					}

					// Check if all squares are in the same column
					const cols = new Set(digitSquares.map((square) => square[1]));
					if (cols.size === 1) {
						const col = Array.from(cols)[0];
						const colSquares = cross(ROWS, [col]);

						// Find eliminations - other squares in the same column but outside this box
						const eliminationCells = colSquares.filter(
							(square) =>
								!boxSquares.includes(square) &&
								candidates[square] &&
								candidates[square].has(digit),
						);

						if (eliminationCells.length > 0) {
							results.push({
								digit,
								squares: digitSquares,
								box: boxSquares,
								line: colSquares,
								lineType: 'column',
								eliminationCells,
							});
						}
					}
				}
			}
		}
	}

	return results;
}

/**
 * Detects box/line reduction - when a digit appears only in one box within a line
 */
function detectBoxLineReduction(candidates: Candidates): {
	digit: Digit;
	squares: Square[];
	line: Unit;
	lineType: 'row' | 'column';
	box: Unit;
	eliminationCells: Square[];
}[] {
	const results: {
		digit: Digit;
		squares: Square[];
		line: Unit;
		lineType: 'row' | 'column';
		box: Unit;
		eliminationCells: Square[];
	}[] = [];

	// Check each row
	for (const row of ROWS) {
		const rowSquares = cross([row], COLS);

		for (const digit of DIGITS) {
			const digitSquares = rowSquares.filter(
				(square) => candidates[square] && candidates[square].has(digit),
			);

			if (digitSquares.length >= 2 && digitSquares.length <= 3) {
				// Check if all squares are in the same box
				const boxes = new Set(
					digitSquares.map((square) => {
						const col = square[1];
						const rowLetter = square[0];
						const boxCol =
							col >= '1' && col <= '3' ? 0 : col >= '4' && col <= '6' ? 1 : 2;
						const boxRow =
							rowLetter >= 'A' && rowLetter <= 'C'
								? 0
								: rowLetter >= 'D' && rowLetter <= 'F'
									? 1
									: 2;
						return boxRow * 3 + boxCol;
					}),
				);

				if (boxes.size === 1) {
					// All squares are in the same box
					const boxIndex = Array.from(boxes)[0];
					const boxRow = Math.floor(boxIndex / 3);
					const boxCol = boxIndex % 3;
					const groupRows = ['ABC', 'DEF', 'GHI'];
					const groupCols = ['123', '456', '789'];
					const boxSquares = cross(
						chars(groupRows[boxRow]),
						chars(groupCols[boxCol]),
					);

					// Find eliminations - other squares in the same box but outside this row
					const eliminationCells = boxSquares.filter(
						(square) =>
							!rowSquares.includes(square) &&
							candidates[square] &&
							candidates[square].has(digit),
					);

					if (eliminationCells.length > 0) {
						results.push({
							digit,
							squares: digitSquares,
							line: rowSquares,
							lineType: 'row',
							box: boxSquares,
							eliminationCells,
						});
					}
				}
			}
		}
	}

	// Check each column
	for (const col of COLS) {
		const colSquares = cross(ROWS, [col]);

		for (const digit of DIGITS) {
			const digitSquares = colSquares.filter(
				(square) => candidates[square] && candidates[square].has(digit),
			);

			if (digitSquares.length >= 2 && digitSquares.length <= 3) {
				// Check if all squares are in the same box
				const boxes = new Set(
					digitSquares.map((square) => {
						const row = square[0];
						const boxCol =
							col >= '1' && col <= '3' ? 0 : col >= '4' && col <= '6' ? 1 : 2;
						const boxRow =
							row >= 'A' && row <= 'C' ? 0 : row >= 'D' && row <= 'F' ? 1 : 2;
						return boxRow * 3 + boxCol;
					}),
				);

				if (boxes.size === 1) {
					// All squares are in the same box
					const boxIndex = Array.from(boxes)[0];
					const boxRow = Math.floor(boxIndex / 3);
					const boxCol = boxIndex % 3;
					const groupRows = ['ABC', 'DEF', 'GHI'];
					const groupCols = ['123', '456', '789'];
					const boxSquares = cross(
						chars(groupRows[boxRow]),
						chars(groupCols[boxCol]),
					);

					// Find eliminations - other squares in the same box but outside this column
					const eliminationCells = boxSquares.filter(
						(square) =>
							!colSquares.includes(square) &&
							candidates[square] &&
							candidates[square].has(digit),
					);

					if (eliminationCells.length > 0) {
						results.push({
							digit,
							squares: digitSquares,
							line: colSquares,
							lineType: 'column',
							box: boxSquares,
							eliminationCells,
						});
					}
				}
			}
		}
	}

	return results;
}

/**
 * Helper function to convert values to candidates format for hint detection
 */
export function valuesToCandidates(values: Values): Candidates {
	const candidates: Candidates = {};

	// Initialize all empty cells with all possible digits
	for (const square of SQUARES) {
		if (!values[square] || values[square].length > 1) {
			candidates[square] = new Set(DIGITS.split(''));
		}
	}

	// Eliminate candidates based on placed values
	for (const square in values) {
		if (values[square] && values[square].length === 1) {
			const digit = values[square];
			// Remove this digit from all peers
			for (const peer of PEERS[square]) {
				if (candidates[peer]) {
					candidates[peer].delete(digit);
				}
			}
		}
	}

	return candidates;
}

/**
 * Find cells that would have candidates eliminated by a naked set
 */
function findNakedSetEliminations(
	squares: Square[],
	digits: Digit[],
	unit: Unit,
	candidates: Candidates,
): { cells: Square[]; digits: Digit[] } {
	const eliminationCells: Square[] = [];
	const eliminationDigits: Digit[] = [];

	for (const square of unit) {
		if (!squares.includes(square) && candidates[square]) {
			for (const digit of digits) {
				if (candidates[square].has(digit)) {
					if (!eliminationCells.includes(square)) {
						eliminationCells.push(square);
					}
					if (!eliminationDigits.includes(digit)) {
						eliminationDigits.push(digit);
					}
				}
			}
		}
	}

	return { cells: eliminationCells, digits: eliminationDigits };
}

/**
 * Find cells that would have candidates eliminated by a hidden set
 */
function findHiddenSetEliminations(
	squares: Square[],
	digits: Digit[],
	candidates: Candidates,
): { cells: Square[]; digits: Digit[] } {
	const eliminationCells: Square[] = [];
	const eliminationDigits: Digit[] = [];

	for (const square of squares) {
		if (candidates[square]) {
			for (const candidate of Array.from(candidates[square])) {
				if (!digits.includes(candidate)) {
					if (!eliminationCells.includes(square)) {
						eliminationCells.push(square);
					}
					if (!eliminationDigits.includes(candidate)) {
						eliminationDigits.push(candidate);
					}
				}
			}
		}
	}

	return { cells: eliminationCells, digits: eliminationDigits };
}

/**
 * Main hint detection function - finds the easiest available hint for the current puzzle state
 */
export function getHint(
	puzzle: string | Grid,
	values: Values,
	providedCandidates?: Candidates,
): SudokuHint | null {
	// Use provided candidates or convert values to candidates for advanced techniques
	const candidates = providedCandidates || valuesToCandidates(values);

	// Iterate through techniques in order of difficulty (easiest first)
	for (const technique of SORTED_TECHNIQUES) {
		let hint: SudokuHint | null = null;

		// Use switch statement to call appropriate detection function
		switch (technique) {
			case 'incorrect_value': {
				const incorrectValues = detectIncorrectValues(puzzle, values);
				if (incorrectValues.length > 0) {
					const error = incorrectValues[0];
					hint = {
						type: 'error',
						technique: 'incorrect_value',
						difficulty: getTechniqueDifficulty('incorrect_value'),
						square: error.square,
						actualValue: error.actualValue,
						correctValue: error.correctValue,
					};
				}
				break;
			}

			case 'missing_candidate': {
				const missingCandidates = detectMissingCandidates(
					puzzle,
					values,
					candidates,
				);
				if (missingCandidates.length > 0) {
					const missing = missingCandidates[0];
					hint = {
						type: 'missing_candidate',
						technique: 'missing_candidate',
						difficulty: getTechniqueDifficulty('missing_candidate'),
						square: missing.square,
						missingDigit: missing.missingDigit,
					};
				}
				break;
			}

			case 'last_remaining_in_box':
			case 'last_remaining_in_row':
			case 'last_remaining_in_column': {
				const lastRemainingInUnits = detectLastRemainingInUnits(values);
				
				// Filter by the specific technique type
				const filteredResults = lastRemainingInUnits.filter(result => {
					const unitType = getUnitType(result.unit);
					return technique === `last_remaining_in_${unitType}`;
				});

				if (filteredResults.length > 0) {
					const hintData = filteredResults[0];
					hint = {
						type: 'single_cell',
						technique,
						difficulty: getTechniqueDifficulty(technique),
						square: hintData.square,
						digit: hintData.digit,
						unit: hintData.unit,
					};
				}
				break;
			}

			case 'naked_single': {
				const nakedSingles = detectNakedSingles(candidates);
				if (nakedSingles.length > 0) {
					const hintData = nakedSingles[0];
					hint = {
						type: 'single_cell',
						technique: 'naked_single',
						difficulty: getTechniqueDifficulty('naked_single'),
						square: hintData.square,
						digit: hintData.digit,
					};
				}
				break;
			}

			case 'pointing_pairs': {
				const pointingPairs = detectPointingPairs(candidates);
				if (pointingPairs.length > 0) {
					// Check each pointing pair until we find one with eliminations
					for (let i = 0; i < pointingPairs.length; i++) {
						const hintData = pointingPairs[i];
						if (hintData.eliminationCells.length > 0) {
							hint = {
								type: 'intersection_removal',
								technique: 'pointing_pairs',
								difficulty: getTechniqueDifficulty('pointing_pairs'),
								digit: hintData.digit,
								squares: hintData.squares,
								primaryUnit: hintData.box,
								primaryUnitType: 'box',
								secondaryUnit: hintData.line,
								secondaryUnitType: hintData.lineType,
								eliminationCells: hintData.eliminationCells,
							};
							break; // Found a useful hint, stop checking other pairs
						}
					}
				}
				break;
			}

			case 'box_line_reduction': {
				const boxLineReductions = detectBoxLineReduction(candidates);
				if (boxLineReductions.length > 0) {
					// Check each box line reduction until we find one with eliminations
					for (let i = 0; i < boxLineReductions.length; i++) {
						const hintData = boxLineReductions[i];
						if (hintData.eliminationCells.length > 0) {
							hint = {
								type: 'intersection_removal',
								technique: 'box_line_reduction',
								difficulty: getTechniqueDifficulty('box_line_reduction'),
								digit: hintData.digit,
								squares: hintData.squares,
								primaryUnit: hintData.line,
								primaryUnitType: hintData.lineType,
								secondaryUnit: hintData.box,
								secondaryUnitType: 'box',
								eliminationCells: hintData.eliminationCells,
							};
							break; // Found a useful hint, stop checking other reductions
						}
					}
				}
				break;
			}

			case 'naked_pairs': {
				const nakedPairs = detectNakedPairs(candidates);
				if (nakedPairs.length > 0) {
					// Check each naked pair until we find one with eliminations
					for (let i = 0; i < nakedPairs.length; i++) {
						const hintData = nakedPairs[i];
						const eliminations = findNakedSetEliminations(
							hintData.squares,
							hintData.digits,
							hintData.unit,
							candidates,
						);
						if (eliminations.cells.length > 0) {
							hint = {
								type: 'naked_set',
								technique: 'naked_pairs',
								difficulty: getTechniqueDifficulty('naked_pairs'),
								squares: hintData.squares,
								digits: hintData.digits,
								unit: hintData.unit,
								unitType: hintData.unitType,
								eliminationCells: eliminations.cells,
								eliminationDigits: eliminations.digits,
							};
							break; // Found a useful hint, stop checking other pairs
						}
					}
				}
				break;
			}

			case 'naked_triples': {
				const nakedTriples = detectNakedTriples(candidates);
				if (nakedTriples.length > 0) {
					// Check each naked triple until we find one with eliminations
					for (let i = 0; i < nakedTriples.length; i++) {
						const hintData = nakedTriples[i];
						const eliminations = findNakedSetEliminations(
							hintData.squares,
							hintData.digits,
							hintData.unit,
							candidates,
						);
						if (eliminations.cells.length > 0) {
							hint = {
								type: 'naked_set',
								technique: 'naked_triples',
								difficulty: getTechniqueDifficulty('naked_triples'),
								squares: hintData.squares,
								digits: hintData.digits,
								unit: hintData.unit,
								unitType: hintData.unitType,
								eliminationCells: eliminations.cells,
								eliminationDigits: eliminations.digits,
							};
							break; // Found a useful hint, stop checking other triples
						}
					}
				}
				break;
			}

			case 'hidden_pairs': {
				const hiddenPairs = detectHiddenPairs(candidates);
				if (hiddenPairs.length > 0) {
					// Check each hidden pair until we find one with eliminations
					for (let i = 0; i < hiddenPairs.length; i++) {
						const hintData = hiddenPairs[i];
						const eliminations = findHiddenSetEliminations(
							hintData.squares,
							hintData.digits,
							candidates,
						);
						if (eliminations.cells.length > 0) {
							hint = {
								type: 'hidden_set',
								technique: 'hidden_pairs',
								difficulty: getTechniqueDifficulty('hidden_pairs'),
								squares: hintData.squares,
								digits: hintData.digits,
								unit: hintData.unit,
								unitType: hintData.unitType,
								eliminationCells: eliminations.cells,
								eliminationDigits: eliminations.digits,
							};
							break; // Found a useful hint, stop checking other pairs
						}
					}
				}
				break;
			}

			case 'naked_quads': {
				const nakedQuads = detectNakedQuads(candidates);
				if (nakedQuads.length > 0) {
					// Check each naked quad until we find one with eliminations
					for (let i = 0; i < nakedQuads.length; i++) {
						const hintData = nakedQuads[i];
						const eliminations = findNakedSetEliminations(
							hintData.squares,
							hintData.digits,
							hintData.unit,
							candidates,
						);
						if (eliminations.cells.length > 0) {
							hint = {
								type: 'naked_set',
								technique: 'naked_quads',
								difficulty: getTechniqueDifficulty('naked_quads'),
								squares: hintData.squares,
								digits: hintData.digits,
								unit: hintData.unit,
								unitType: hintData.unitType,
								eliminationCells: eliminations.cells,
								eliminationDigits: eliminations.digits,
							};
							break; // Found a useful hint, stop checking other quads
						}
					}
				}
				break;
			}

			case 'hidden_triples': {
				const hiddenTriples = detectHiddenTriples(candidates);
				if (hiddenTriples.length > 0) {
					// Check each hidden triple until we find one with eliminations
					for (let i = 0; i < hiddenTriples.length; i++) {
						const hintData = hiddenTriples[i];
						const eliminations = findHiddenSetEliminations(
							hintData.squares,
							hintData.digits,
							candidates,
						);
						if (eliminations.cells.length > 0) {
							hint = {
								type: 'hidden_set',
								technique: 'hidden_triples',
								difficulty: getTechniqueDifficulty('hidden_triples'),
								squares: hintData.squares,
								digits: hintData.digits,
								unit: hintData.unit,
								unitType: hintData.unitType,
								eliminationCells: eliminations.cells,
								eliminationDigits: eliminations.digits,
							};
							break; // Found a useful hint, stop checking other triples
						}
					}
				}
				break;
			}

			// Add other techniques as needed...
		}

		// Return the first hint found (they are ordered by difficulty)
		if (hint) {
			return hint;
		}
	}

	return null; // No hints found
}
