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
		maxAttempts: 50,
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
 * Generate a sudoku puzzle with a specific target difficulty
 * Uses the evaluatePuzzleDifficulty function to assess puzzle difficulty
 */
export function generateWithDifficulty(options: GenerationOptions): {
	puzzle: Grid;
	actualDifficulty: number;
	attempts: number;
	clues: number;
} {
	const {
		minClues = 17, // Minimum possible for unique solution
		maxClues = 40, // Maximum reasonable for challenging puzzles
		targetDifficulty = 50, // Default to medium difficulty
		toleranceDifficulty = 5, // +/- 5 points tolerance
		maxAttempts = 100, // Maximum attempts before giving up
		allowedCategories, // Optional category restriction
	} = options;

	const start = new Date().getTime();
	let attempts = 0;
	let bestPuzzle: Grid | null = null;
	let bestDifficulty = -1;
	let bestDistance = Infinity;

	debug(
		`Generating puzzle with target difficulty ${targetDifficulty} (+/- ${toleranceDifficulty})`,
	);

	while (attempts < maxAttempts) {
		attempts++;

		// Try different clue counts - fewer clues = harder puzzles
		// Adjust clue count based on target difficulty
		let targetClues;
		if (targetDifficulty <= 8) {
			// Trivial: more clues (easier)
			targetClues = Math.floor(Math.random() * 6) + 30; // 30-35 clues
		} else if (targetDifficulty <= 25) {
			// Basic: moderate clues
			targetClues = Math.floor(Math.random() * 6) + 24; // 24-29 clues
		} else if (targetDifficulty <= 45) {
			// Intermediate: fewer clues
			targetClues = Math.floor(Math.random() * 4) + 20; // 20-23 clues
		} else if (targetDifficulty <= 68) {
			// Tough: very few clues
			targetClues = Math.floor(Math.random() * 3) + 18; // 18-20 clues
		} else {
			// Diabolical+: minimal clues
			targetClues = Math.floor(Math.random() * 2) + 17; // 17-18 clues
		}

		// Generate a puzzle with the target number of clues
		let candidatePuzzle: Grid;
		try {
			candidatePuzzle = generateWithClues(targetClues);
		} catch (error) {
			debug(
				`Attempt ${attempts}: Failed to generate puzzle with ${targetClues} clues`,
			);
			continue;
		}

		// Evaluate the difficulty
		const evaluation = evaluatePuzzleDifficulty(candidatePuzzle);

		if (!evaluation.solvable) {
			debug(`Attempt ${attempts}: Puzzle not solvable with current techniques`);
			continue;
		}

		// Check category restriction if specified
		if (
			allowedCategories &&
			evaluation.category !== 'error' &&
			!allowedCategories.includes(evaluation.category)
		) {
			debug(
				`Attempt ${attempts}: Difficulty ${evaluation.difficulty} (${evaluation.category}) not in allowed categories`,
			);
			continue;
		}

		const difficultyDistance = Math.abs(
			evaluation.difficulty - targetDifficulty,
		);

		debug(
			`Attempt ${attempts}: Generated puzzle with ${targetClues} clues, difficulty ${evaluation.difficulty} (${evaluation.category}), distance ${difficultyDistance}`,
		);

		// Check if this is within tolerance
		if (difficultyDistance <= toleranceDifficulty) {
			const time = new Date().getTime() - start;
			debug(
				`Found suitable puzzle in ${attempts} attempts (${time}ms): difficulty ${evaluation.difficulty}, category ${evaluation.category}, clues ${keys(candidatePuzzle).length}`,
			);

			return {
				puzzle: candidatePuzzle,
				actualDifficulty: evaluation.difficulty,
				attempts,
				clues: keys(candidatePuzzle).length,
			};
		}

		// Keep track of the best puzzle so far
		if (difficultyDistance < bestDistance) {
			bestPuzzle = candidatePuzzle;
			bestDifficulty = evaluation.difficulty;
			bestDistance = difficultyDistance;
		}
	}

	// If we couldn't find a perfect match, return the best one we found
	if (bestPuzzle) {
		const time = new Date().getTime() - start;
		debug(
			`Max attempts reached. Returning best puzzle with difficulty ${bestDifficulty} (distance ${bestDistance}) after ${attempts} attempts (${time}ms)`,
		);

		return {
			puzzle: bestPuzzle,
			actualDifficulty: bestDifficulty,
			attempts,
			clues: keys(bestPuzzle).length,
		};
	}

	throw new Error(
		`Failed to generate puzzle with target difficulty ${targetDifficulty} after ${maxAttempts} attempts`,
	);
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
		basic: { target: 15, tolerance: 10 }, // 9-25
		intermediate: { target: 30, tolerance: 15 }, // 30-45 - more achievable target
		tough: { target: 55, tolerance: 15 }, // 46-68 - more tolerance
		diabolical: { target: 75, tolerance: 10 }, // 69-84
		extreme: { target: 88, tolerance: 8 }, // 85-92
		master: { target: 94, tolerance: 4 }, // 93-96
		grandmaster: { target: 98, tolerance: 2 }, // 97-99
	};

	const config = categoryTargets[category];

	return generateWithDifficulty({
		targetDifficulty: config.target,
		toleranceDifficulty: config.tolerance,
		allowedCategories: [category],
		...options,
	});
}
