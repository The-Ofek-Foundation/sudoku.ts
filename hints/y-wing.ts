// Y-WING STRATEGY DETECTION

import type { Square, Digit } from '../types.js';
import type { CellData } from '../../index.js';
import type { YWingHint } from './types.js';
import { getTechniqueDifficulty } from './difficulty.js';
import { coordinatesToSquare, squareToCoordinates } from '../../index.js';

/**
 * Detects Y-Wing patterns on the board using the sudoku solver's format
 *
 * Y-Wing consists of:
 * - Pivot cell with candidates AB
 * - Pincer cell 1 with candidates AC (sees pivot)
 * - Pincer cell 2 with candidates BC (sees pivot)
 * - Elimination targets: cells that see both pincers and contain candidate C
 */
export function detectYWing(
	candidates: Record<Square, Set<Digit>>,
): YWingHint | null {
	// Find all bi-value cells (cells with exactly 2 candidates)
	const biValueCells: { square: Square; candidates: Digit[] }[] = [];

	for (const square of Object.keys(candidates)) {
		const cellCandidates = candidates[square];
		if (cellCandidates && cellCandidates.size === 2) {
			const candidateArray = Array.from(cellCandidates).sort();
			biValueCells.push({ square, candidates: candidateArray });
		}
	}

	// Need at least 3 bi-value cells for a Y-Wing
	if (biValueCells.length < 3) {
		return null;
	}

	// Try every combination of 3 bi-value cells
	for (let i = 0; i < biValueCells.length; i++) {
		for (let j = i + 1; j < biValueCells.length; j++) {
			for (let k = j + 1; k < biValueCells.length; k++) {
				const cell1 = biValueCells[i];
				const cell2 = biValueCells[j];
				const cell3 = biValueCells[k];

				// Try each cell as the pivot
				const yWing =
					tryYWingCombination(candidates, cell1, cell2, cell3) ||
					tryYWingCombination(candidates, cell2, cell1, cell3) ||
					tryYWingCombination(candidates, cell3, cell1, cell2);

				if (yWing) {
					return yWing;
				}
			}
		}
	}

	return null;
}

/**
 * Tests if three bi-value cells form a Y-Wing with the first cell as pivot
 */
function tryYWingCombination(
	candidates: Record<Square, Set<Digit>>,
	pivot: { square: Square; candidates: Digit[] },
	pincer1: { square: Square; candidates: Digit[] },
	pincer2: { square: Square; candidates: Digit[] },
): YWingHint | null {
	// Check if pivot can see both pincers
	if (
		!canSee(pivot.square, pincer1.square) ||
		!canSee(pivot.square, pincer2.square)
	) {
		return null;
	}

	// Check if we have exactly 3 unique candidates across all cells
	const allCandidates = new Set([
		...pivot.candidates,
		...pincer1.candidates,
		...pincer2.candidates,
	]);

	if (allCandidates.size !== 3) {
		return null;
	}

	// Find the candidates:
	// - candidateA: shared by pivot and pincer1
	// - candidateB: shared by pivot and pincer2
	// - candidateC: shared by pincer1 and pincer2

	const candidateA = pivot.candidates.find((c) =>
		pincer1.candidates.includes(c),
	);
	const candidateB = pivot.candidates.find((c) =>
		pincer2.candidates.includes(c),
	);
	const candidateC = pincer1.candidates.find((c) =>
		pincer2.candidates.includes(c),
	);

	// Verify the Y-Wing pattern
	if (
		!candidateA ||
		!candidateB ||
		!candidateC ||
		candidateA === candidateB ||
		candidateA === candidateC ||
		candidateB === candidateC
	) {
		return null;
	}

	// Verify that each cell has exactly the expected candidates
	if (
		!arraysEqual(pivot.candidates, [candidateA, candidateB].sort()) ||
		!arraysEqual(pincer1.candidates, [candidateA, candidateC].sort()) ||
		!arraysEqual(pincer2.candidates, [candidateB, candidateC].sort())
	) {
		return null;
	}

	// Find elimination targets: cells that can see both pincers and contain candidateC
	const eliminationCells: Square[] = [];

	for (const square of Object.keys(candidates)) {
		const cellCandidates = candidates[square];

		// Skip if this is one of our Y-Wing cells
		if (
			square === pivot.square ||
			square === pincer1.square ||
			square === pincer2.square
		) {
			continue;
		}

		// Check if this cell can see both pincers and has candidateC
		if (
			canSee(square, pincer1.square) &&
			canSee(square, pincer2.square) &&
			cellCandidates &&
			cellCandidates.has(candidateC)
		) {
			eliminationCells.push(square);
		}
	}

	// Only return if we have eliminations to make
	if (eliminationCells.length === 0) {
		return null;
	}

	return {
		type: 'y_wing',
		technique: 'y_wing',
		difficulty: getTechniqueDifficulty('y_wing'),
		pivotCell: pivot.square,
		pincer1Cell: pincer1.square,
		pincer2Cell: pincer2.square,
		candidateA,
		candidateB,
		candidateC,
		eliminationCells,
	};
}

/**
 * Checks if two cells can "see" each other (same row, column, or box)
 */
function canSee(square1: Square, square2: Square): boolean {
	const coords1 = squareToCoordinates(square1);
	const coords2 = squareToCoordinates(square2);
	const row1 = coords1.row;
	const col1 = coords1.col;
	const row2 = coords2.row;
	const col2 = coords2.col;

	// Same row
	if (row1 === row2) return true;

	// Same column
	if (col1 === col2) return true;

	// Same box
	const box1 = Math.floor(row1 / 3) * 3 + Math.floor(col1 / 3);
	const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3);
	if (box1 === box2) return true;

	return false;
}

/**
 * Helper function to compare arrays for equality
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((val, i) => val === b[i]);
}
