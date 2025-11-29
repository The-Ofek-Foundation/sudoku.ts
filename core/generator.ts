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
		maxAttempts: 500,
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
	attempts: number;
	clues: number;
} {
	const {
		targetDifficulty = 50,
		toleranceDifficulty = 3,
		maxAttempts = 100,
		minClues = 17,
		maxClues = 81,
	} = options;

	// 1. Start with a fully solved board
	const solvedPuzzle = solve({});
	if (!solvedPuzzle) {
		throw new Error('Failed to generate a solved puzzle to begin.');
	}

	// 2. Determine initial clue count based on target difficulty
	// Ensure it's within bounds
	let estimatedClues = Math.max(
		22,
		Math.min(50, Math.floor(50 - (targetDifficulty / 100) * 28)),
	);
	estimatedClues = Math.max(minClues, Math.min(maxClues, estimatedClues));

	// 3. Create initial puzzle
	let currentPuzzle = { ...solvedPuzzle };
	const allKeys = shuffle(keys(solvedPuzzle));

	// Remove clues until we reach estimated count
	for (const key of allKeys) {
		if (keys(currentPuzzle).length <= estimatedClues) break;

		const temp = currentPuzzle[key];
		delete (currentPuzzle as Partial<Grid>)[key];

		if (!isUnique(currentPuzzle)) {
			(currentPuzzle as any)[key] = temp;
		}
	}

	let bestPuzzle = { ...currentPuzzle };
	let bestDifficulty = evaluatePuzzleDifficulty(
		bestPuzzle,
		1000,
		solvedPuzzle,
	).difficulty;
	let bestCost = Math.abs(bestDifficulty - targetDifficulty);

	// 4. Run the Simulated Annealing process
	let temperature = 10.0;
	const coolingRate = 0.99;

	let i = 1;
	for (; i <= maxAttempts; i++) {
		// Stop early if we hit the target
		if (bestCost <= toleranceDifficulty) {
			break;
		}

		const presentClues = keys(currentPuzzle);
		const removedClues = keys(solvedPuzzle).filter(
			(k) => !presentClues.includes(k),
		);
		const currentClueCount = presentClues.length;

		// Decide on a move based on difficulty difference
		const currentDifficulty = evaluatePuzzleDifficulty(
			currentPuzzle,
			1000,
			solvedPuzzle,
		).difficulty;
		const diff = currentDifficulty - targetDifficulty;

		// Save state to revert if needed
		const previousPuzzle = { ...currentPuzzle };
		let moveType = 'swap';

		// Logic:
		// Too hard (diff > 0) -> Add clue (easier)
		// Too easy (diff < 0) -> Remove clue (harder)
		// But must respect limits

		if (
			diff > toleranceDifficulty &&
			removedClues.length > 0 &&
			currentClueCount < maxClues
		) {
			moveType = 'add';
			const clueToAdd =
				removedClues[Math.floor(Math.random() * removedClues.length)];
			(currentPuzzle as any)[clueToAdd] = solvedPuzzle[clueToAdd];
		} else if (
			diff < -toleranceDifficulty &&
			presentClues.length > 17 &&
			currentClueCount > minClues
		) {
			moveType = 'remove';
			const clueToRemove =
				presentClues[Math.floor(Math.random() * presentClues.length)];
			delete (currentPuzzle as Partial<Grid>)[clueToRemove];
		} else {
			// Swap (keep count same)
			moveType = 'swap';
			if (presentClues.length > 0 && removedClues.length > 0) {
				const clueToAdd =
					removedClues[Math.floor(Math.random() * removedClues.length)];
				const clueToRemove =
					presentClues[Math.floor(Math.random() * presentClues.length)];
				delete (currentPuzzle as Partial<Grid>)[clueToRemove];
				(currentPuzzle as any)[clueToAdd] = solvedPuzzle[clueToAdd];
			}
		}

		// Check validity (must be unique)
		if (!isUnique(currentPuzzle)) {
			currentPuzzle = previousPuzzle;
			continue;
		}

		// Evaluate new state
		const newDifficulty = evaluatePuzzleDifficulty(
			currentPuzzle,
			1000,
			solvedPuzzle,
		).difficulty;
		const newCost = Math.abs(newDifficulty - targetDifficulty);
		const acceptanceProbability = Math.exp((bestCost - newCost) / temperature);

		if (newCost < bestCost) {
			bestCost = newCost;
			bestDifficulty = newDifficulty;
			bestPuzzle = { ...currentPuzzle };
		} else if (Math.random() < acceptanceProbability) {
			// Accept
		} else {
			// Reject
			currentPuzzle = previousPuzzle;
		}

		temperature *= coolingRate;
	}

	const finalDifficulty = evaluatePuzzleDifficulty(
		bestPuzzle,
		1000,
		solvedPuzzle,
	).difficulty;
	const clueCount = keys(bestPuzzle).length;

	debug(
		`Generated puzzle with difficulty ${finalDifficulty} (target: ${targetDifficulty} ±${toleranceDifficulty}) after ${i} iterations.`,
	);

	return {
		puzzle: bestPuzzle,
		actualDifficulty: finalDifficulty,
		attempts: i,
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
