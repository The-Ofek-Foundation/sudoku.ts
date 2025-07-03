// SUDOKU PUZZLE GENERATOR

import type { Grid, Values, Difficulty } from '../types.js';
import { solve, isUnique, isSolvableWithElimination } from './solver.js';
import { SQUARES, copy, shuffle, keys } from './utils.js';

let debugMode = false;

function debug(msg: string): void {
	if (debugMode) {
		console.log(msg + '\r\n');
	}
}

/**
 * Get minimum number of squares for each difficulty level
 */
function squareCount(difficulty: Difficulty): number {
	if (difficulty === 'easy') {
		return 35;
	} else if (difficulty === 'medium') {
		return 28;
	}
	return 20; // hard
}

/**
 * Generate a sudoku puzzle of the specified difficulty
 */
export function generate(difficulty?: Difficulty): Grid {
	const start = new Date().getTime();
	const minSquares = squareCount(difficulty || 'easy');

	// First generate a complete solved grid
	const fullGrid = solve({});
	if (!fullGrid) {
		throw new Error('Failed to generate full grid');
	}

	// Start with the full grid and remove squares while maintaining uniqueness
	let generatedGrid = copy(fullGrid);
	const shuffledSquares = shuffle(SQUARES);
	let filledSquares = shuffledSquares.length;

	for (let i = 0; i < shuffledSquares.length; i++) {
		const s = shuffledSquares[i];

		// Try removing this square
		delete generatedGrid[s];
		filledSquares--;

		// Check if the puzzle is still uniquely solvable
		if (!isSolvableWithElimination(generatedGrid) || !isUnique(generatedGrid)) {
			// Restore the square if removing it makes the puzzle unsolvable or non-unique
			generatedGrid[s] = fullGrid[s];
			filledSquares++;
		}

		// Stop when we reach the target number of squares
		if (filledSquares === minSquares) {
			break;
		}
	}

	const time = new Date().getTime() - start;
	debug(
		'Generated puzzle with ' +
			keys(generatedGrid).length +
			' squares in ' +
			time +
			'ms',
	);
	return generatedGrid;
}

/**
 * Set debug mode for the generator
 */
export function setDebugMode(enabled: boolean): void {
	debugMode = enabled;
}
