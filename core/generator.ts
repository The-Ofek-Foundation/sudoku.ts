// SUDOKU PUZZLE GENERATOR

import type { Grid, Values, GenerationOptions, Difficulty } from '../types.js';
import { solve, isUnique, isSolvableWithElimination } from './solver.js';
import { SQUARES, copy, shuffle, keys } from './utils.js';
import { evaluatePuzzleDifficulty } from '../hints/difficulty.js';

let debugMode = false;

function debug(msg: string): void {
	if (debugMode) {
		console.log(msg + '\r\n');
	}
}

/**
 * Generate a sudoku puzzle with a specific number of filled squares
 */
export function generateWithClues(targetClues: number): Grid {
	const start = new Date().getTime();

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
		if (filledSquares === targetClues) {
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
 * Generate a sudoku puzzle by difficulty category (main generator function)
 */
export function generate(difficulty?: Difficulty): Grid {
	// Default to basic difficulty if none specified
	const category = difficulty || 'basic';
	// Use more attempts for the main generator and allow more tolerance
	const result = generateByCategory(category, {
		maxAttempts: 5000,
		toleranceDifficulty: category === 'intermediate' ? 15 : 10,
	});
	return result.puzzle;
}

/**
 * Set debug mode for the generator
 */
export function setDebugMode(enabled: boolean): void {
	debugMode = enabled;
}

/**
 * Generate a sudoku puzzle with a specific target difficulty using Simulated Annealing.
 * This is a more robust method that actively searches for a puzzle matching the target.
 */
export function generateWithDifficulty(options: GenerationOptions): {
	puzzle: Grid;
	actualDifficulty: number;
	attempts: number; // Represents the number of annealing rounds
	clues: number;
} {
	const {
		targetDifficulty = 50,
		toleranceDifficulty = 3, // How close to get before stopping
		maxAttempts = 5000, // Max annealing rounds
	} = options;

	// 1. Start with a fully solved board
	const solvedPuzzle = solve({});
	if (!solvedPuzzle) {
		throw new Error('Failed to generate a solved puzzle to begin.');
	}

	// 2. Create a minimal starting puzzle by removing clues
	let currentPuzzle = { ...solvedPuzzle };
	// Use the 'shuffle' and 'keys' utils from your file
	const allKeys = shuffle(keys(solvedPuzzle));
	for (const key of allKeys) {
		const temp = currentPuzzle[key];
		delete (currentPuzzle as Partial<Grid>)[key];
		if (!isUnique(currentPuzzle)) {
			(currentPuzzle as any)[key] = temp;
		}
	}

	let bestPuzzle = { ...currentPuzzle };
	let bestCost = Math.abs(
		evaluatePuzzleDifficulty(bestPuzzle).difficulty - targetDifficulty,
	);

	// 3. Run the Simulated Annealing process
	let temperature = 10.0;
	const coolingRate = 0.999;

	let i = 0; // Initialize iteration counter
	for (; i < maxAttempts; i++) {
		// Stop early if we hit the target
		if (bestCost <= toleranceDifficulty) {
			break;
		}

		const presentClues = keys(currentPuzzle); // Use 'keys' utility
		const removedClues = keys(solvedPuzzle).filter(
			(k) => !presentClues.includes(k),
		);

		if (presentClues.length < 2 || removedClues.length === 0) break;

		// Perform a random swap
		const clueToAdd =
			removedClues[Math.floor(Math.random() * removedClues.length)];
		const clueToRemove =
			presentClues[Math.floor(Math.random() * presentClues.length)];
		const valueToRemove = currentPuzzle[clueToRemove];
		delete (currentPuzzle as Partial<Grid>)[clueToRemove];
		(currentPuzzle as any)[clueToAdd] = solvedPuzzle[clueToAdd];

		// Evaluate the new state
		if (isUnique(currentPuzzle)) {
			const currentCost = Math.abs(
				evaluatePuzzleDifficulty(currentPuzzle).difficulty - targetDifficulty,
			);
			const acceptanceProbability = Math.exp(
				(bestCost - currentCost) / temperature,
			);

			if (acceptanceProbability > Math.random()) {
				if (currentCost < bestCost) {
					bestCost = currentCost;
					bestPuzzle = { ...currentPuzzle };
				}
			} else {
				delete (currentPuzzle as Partial<Grid>)[clueToAdd];
				(currentPuzzle as any)[clueToRemove] = valueToRemove;
			}
		} else {
			delete (currentPuzzle as Partial<Grid>)[clueToAdd];
			(currentPuzzle as any)[clueToRemove] = valueToRemove;
		}
		temperature *= coolingRate;
	}

	const finalDifficulty = evaluatePuzzleDifficulty(bestPuzzle).difficulty;
	const clueCount = keys(bestPuzzle).length; // Use 'keys' utility

	console.log(
		`Generated puzzle with difficulty ${finalDifficulty} (target: ${targetDifficulty} ±${toleranceDifficulty}) after ${i} iterations.`,
	);

	return {
		puzzle: bestPuzzle,
		actualDifficulty: finalDifficulty,
		attempts: maxAttempts,
		clues: clueCount,
	};
}

/**
 * Convenience function to generate puzzles by difficulty category
 */
export function generateByCategory(
	category:
		| 'trivial'
		| 'basic'
		| 'intermediate'
		| 'tough'
		| 'diabolical'
		| 'extreme'
		| 'master'
		| 'grandmaster',
	options: Partial<GenerationOptions> = {},
): {
	puzzle: Grid;
	actualDifficulty: number;
	attempts: number;
	clues: number;
} {
	// Map categories to difficulty ranges (midpoint of each range)
	const categoryTargets = {
		trivial: { target: 4, tolerance: 4 }, // 1-8
		basic: { target: 17, tolerance: 8 }, // 9-25
		intermediate: { target: 35.5, tolerance: 9.5 }, // 26-45
		tough: { target: 56, tolerance: 12 }, // 46-68
		diabolical: { target: 76, tolerance: 8 }, // 69-84
		extreme: { target: 88, tolerance: 4 }, // 85-92
		master: { target: 94, tolerance: 2 }, // 93-96
		grandmaster: { target: 98, tolerance: 1 }, // 97-100
	};

	const config = categoryTargets[category];

	return generateWithDifficulty({
		targetDifficulty: config.target,
		toleranceDifficulty: config.tolerance,
		allowedCategories: [category],
		...options,
	});
}
