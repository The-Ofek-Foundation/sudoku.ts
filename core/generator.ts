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
		startPuzzle,
	} = options;

	const startTime = Date.now();

	let bestGlobalPuzzle: Grid | null = null;
	let bestGlobalCost = Infinity;
	let bestGlobalDiff = 0;
	let totalIterations = 0;

	// Multi-Start Strategy:
	// If we get stuck with a specific minimal puzzle configuration, it's often better
	// to restart with a fresh minimal puzzle than to keep annealing a bad one.
	// We divide maxAttempts into "rounds".
	const attemptsPerRound = 100;
	const maxRounds = Math.ceil(maxAttempts / attemptsPerRound);

	for (let round = 0; round < maxRounds; round++) {
		let solvedPuzzle: Grid; // This will hold the full solved grid
		let currentPuzzle: Grid; // This will hold the puzzle being worked on (with removed clues)

		if (startPuzzle) {
			currentPuzzle = { ...startPuzzle };
			const result = solve(currentPuzzle);
			if (!result) throw new Error('Failed to solve the provided startPuzzle.');
			solvedPuzzle = result;
		} else {
			// Smart Start logic
			let startClues = 24; // Start HARD (Tough/Diabolical range)
			if (targetDifficulty < 20) startClues = 35; // Basic
			if (targetDifficulty > 70) startClues = 20; // Extreme

			try {
				currentPuzzle = generateWithClues(startClues);
				const result = solve(currentPuzzle);
				if (!result) throw new Error('Failed to solve generated puzzle');
				solvedPuzzle = result;
			} catch (e) {
				// Fallback: Generate Full Grid first
				const result = solve({});
				if (!result) throw new Error('Failed to generate a base solved puzzle.');
				solvedPuzzle = result;

				// Start currentPuzzle as a copy of the solved one, then remove some clues
				currentPuzzle = { ...solvedPuzzle };
				const squares = shuffle(keys(currentPuzzle));
				for (const square of squares) {
					const value = currentPuzzle[square];
					delete (currentPuzzle as Partial<Grid>)[square];
					if (!isUnique(currentPuzzle)) {
						(currentPuzzle as any)[square] = value;
					}
				}
			}
		}

		let currentDiff = evaluatePuzzleDifficulty(currentPuzzle, 1000, 110, solvedPuzzle).difficulty;

		// If we are already good, return
		if (Math.abs(currentDiff - targetDifficulty) <= toleranceDifficulty) {
			const endTime = Date.now();
			console.log(`Generated puzzle with difficulty ${currentDiff} (target: ${targetDifficulty} ±${toleranceDifficulty}) in ${endTime - startTime}ms.`);
			return {
				puzzle: currentPuzzle,
				actualDifficulty: currentDiff,
				attempts: round + 1,
				clues: keys(currentPuzzle).length,
			};
		}

		// Bidirectional Greedy Strategy:
		// Navigate the difficulty landscape by Adding or Removing clues as needed.
		// - If Diff > Target: Add clues (Randomly if Diff >= 99).
		// - If Diff < Target: Remove clues (or Swap if blocked).

		let lastMove: string | null = null;

		for (let step = 0; step < 50; step++) {
			totalIterations++;
			const presentClues = shuffle(keys(currentPuzzle));
			const removedClues = keys(solvedPuzzle).filter(k => !presentClues.includes(k));

			let moveMade = false;
			const diff = currentDiff - targetDifficulty;

			if (currentDiff >= 99) {
				// Dark Zone: The puzzle is too hard (unsolvable by our logic).
				// We need to ADD clues to make it solvable.
				// Goal: Find a clue that makes it solvable (Diff < 99) but keeps it HARD (highest Diff).

				let bestEscape: { clue: string, diff: number } | null = null;

				// Check ALL candidates
				let candidates = shuffle(removedClues);
				// Filter tabu
				if (lastMove && lastMove.startsWith('remove:')) {
					const tabuClue = lastMove.split(':')[1];
					candidates = candidates.filter(c => c !== tabuClue);
				}

				for (const clue of candidates) {
					(currentPuzzle as any)[clue] = solvedPuzzle[clue];
					const d = evaluatePuzzleDifficulty(currentPuzzle, 1000, 110, solvedPuzzle).difficulty; // Pass solvedPuzzle
					delete (currentPuzzle as Partial<Grid>)[clue];

					if (d < 99) {
						// Found a solvable path!
						// Prefer the one that is HARDEST (closest to 99 from below)
						// to avoid dropping straight to Basic.
						if (!bestEscape || d > bestEscape.diff) {
							bestEscape = { clue, diff: d };
						}
					}
				}

				if (bestEscape) {
					(currentPuzzle as any)[bestEscape.clue] = solvedPuzzle[bestEscape.clue];
					currentDiff = bestEscape.diff;
					moveMade = true;
					lastMove = `add:${bestEscape.clue}`;
					console.log(`Round ${round} Step ${step}: Escaped Dark Zone Add ${bestEscape.clue} -> Diff ${bestEscape.diff}`);
				} else {
					// No escape found in sample, just pick random one to progress
					if (removedClues.length > 0) {
						let clue = removedClues[Math.floor(Math.random() * removedClues.length)];
						// Avoid tabu if possible (Simplified: just ignore for blind add to avoid lint issues)
						// if (lastMove && lastMove.startsWith('remove:') && removedClues.length > 1) { ... }

						(currentPuzzle as any)[clue] = solvedPuzzle[clue];
						currentDiff = evaluatePuzzleDifficulty(currentPuzzle, 1000, 110, solvedPuzzle).difficulty; // Pass solvedPuzzle
						moveMade = true;
						lastMove = `add:${clue}`;
						console.log(`Round ${round} Step ${step}: Blind Add ${clue} -> Diff ${currentDiff}`);
					}
				}
			} else if (diff > toleranceDifficulty) {
				// Too Hard: ADD clues (Greedy)
				// Find best clue to add
				let bestMove: { clue: string, diff: number, cost: number } | null = null;
				let candidates = removedClues.length > 20 ? shuffle(removedClues).slice(0, 20) : removedClues;
				// Filter tabu
				if (lastMove && lastMove.startsWith('remove:')) {
					const tabuClue = lastMove.split(':')[1];
					candidates = candidates.filter(c => c !== tabuClue);
				}

				for (const clue of candidates) {
					(currentPuzzle as any)[clue] = solvedPuzzle[clue];
					const d = evaluatePuzzleDifficulty(currentPuzzle, 1000, currentDiff + 10, solvedPuzzle).difficulty; // Pass solvedPuzzle
					const c = Math.abs(d - targetDifficulty);
					delete (currentPuzzle as Partial<Grid>)[clue];

					if (!bestMove || c < bestMove.cost) {
						bestMove = { clue, diff: d, cost: c };
					}
				}

				if (bestMove) {
					(currentPuzzle as any)[bestMove.clue] = solvedPuzzle[bestMove.clue];
					currentDiff = bestMove.diff;
					moveMade = true;
					lastMove = `add:${bestMove.clue}`;
					console.log(`Round ${round} Step ${step}: Added ${bestMove.clue} -> Diff ${bestMove.diff}`);
				}
			} else if (diff < -toleranceDifficulty) {
				// Too Easy: REMOVE clues (Greedy)
				// Goal: Increase difficulty towards target.
				// Priority 1: Move to [currentDiff, target + tolerance + 10] (Safe Climb)
				// Priority 2: Move to [currentDiff, 110] (Dark Zone Jump)

				let bestMove: { type: 'remove' | 'swap', remove: string, add?: string, diff: number } | null = null;

				// 1. Check Removals
				for (const clue of presentClues) {
					// Filter tabu
					if (lastMove && lastMove.startsWith('add:') && lastMove.split(':')[1] === clue) continue;

					const value = currentPuzzle[clue];
					delete (currentPuzzle as Partial<Grid>)[clue];

					if (isUnique(currentPuzzle)) {
						const d = evaluatePuzzleDifficulty(currentPuzzle, 1000, 110).difficulty;

						// If d > currentDiff, it's an improvement (climb).
						if (d > currentDiff || d === currentDiff) {
							// Check if it's a Safe Climb
							const isSafe = d <= targetDifficulty + toleranceDifficulty + 10;

							if (isSafe) {
								// Found a safe climb! Take it immediately (First Improvement)
								bestMove = { type: 'remove', remove: clue, diff: d };
								break;
							}

							// Otherwise, it's a Dark Zone jump. Keep as backup.
							if (!bestMove) {
								bestMove = { type: 'remove', remove: clue, diff: d };
							}
						}
					}
					// Restore
					(currentPuzzle as any)[clue] = value;
				}

				// If no Safe Removal found, check Swaps
				if (!bestMove || bestMove.diff > targetDifficulty + toleranceDifficulty + 10) {
					// Try 50 swaps
					for (let k = 0; k < 50; k++) {
						const clueToRemove = presentClues[Math.floor(Math.random() * presentClues.length)];
						const clueToAdd = removedClues[Math.floor(Math.random() * removedClues.length)];

						// Filter tabu (simple check: don't remove what we just added)
						if (lastMove && lastMove.startsWith('add:') && lastMove.split(':')[1] === clueToRemove) continue;

						const valueToRemove = currentPuzzle[clueToRemove];

						delete (currentPuzzle as Partial<Grid>)[clueToRemove];
						(currentPuzzle as any)[clueToAdd] = solvedPuzzle[clueToAdd];

						if (isUnique(currentPuzzle)) {
							const d = evaluatePuzzleDifficulty(currentPuzzle, 1000, 110).difficulty;

							if (d > currentDiff) {
								const isSafe = d <= targetDifficulty + toleranceDifficulty + 10;

								if (isSafe) {
									// Found a safe swap! Prefer this over Dark Zone Removal.
									bestMove = { type: 'swap', remove: clueToRemove, add: clueToAdd, diff: d };
									break; // Take first safe swap
								}

								// Backup: Dark Zone Swap (only if we don't have a Dark Zone Removal already?)
								// Actually, maybe Swap to Dark Zone is better than Removal to Dark Zone?
								// Let's just keep track of best move overall if no safe move found.
								if (!bestMove) {
									bestMove = { type: 'swap', remove: clueToRemove, add: clueToAdd, diff: d };
								}
							}
						}
						// Revert
						delete (currentPuzzle as Partial<Grid>)[clueToAdd];
						(currentPuzzle as any)[clueToRemove] = valueToRemove;
					}
				}

				// Apply Best Move
				if (bestMove) {
					if (bestMove.type === 'remove') {
						delete (currentPuzzle as Partial<Grid>)[bestMove.remove];
						currentDiff = bestMove.diff;
						moveMade = true;
						lastMove = `remove:${bestMove.remove}`;
						console.log(`Round ${round} Step ${step}: Removed ${bestMove.remove} -> Diff ${bestMove.diff}`);
					} else {
						delete (currentPuzzle as Partial<Grid>)[bestMove.remove];
						(currentPuzzle as any)[bestMove.add!] = solvedPuzzle[bestMove.add!];
						currentDiff = bestMove.diff;
						moveMade = true;
						lastMove = `swap:${bestMove.remove}/${bestMove.add}`;
						console.log(`Round ${round} Step ${step}: Swapped ${bestMove.remove}/${bestMove.add} -> Diff ${bestMove.diff}`);
					}
				}
			}

			// Check if done
			if (Math.abs(currentDiff - targetDifficulty) <= toleranceDifficulty) {
				const endTime = Date.now();
				console.log(`Generated puzzle with difficulty ${currentDiff} (target: ${targetDifficulty} ±${toleranceDifficulty}) in ${endTime - startTime}ms.`);
				return {
					puzzle: currentPuzzle,
					actualDifficulty: currentDiff,
					attempts: round + 1,
					clues: keys(currentPuzzle).length,
				};
			}

			if (!moveMade) {
				console.log(`Round ${round}: Stuck at Step ${step}. Restarting.`);
				break;
			}
		}

		// If we failed this round, track best result
		const cost = Math.abs(currentDiff - targetDifficulty);
		if (cost < bestGlobalCost) {
			bestGlobalCost = cost;
			bestGlobalDiff = currentDiff;
			bestGlobalPuzzle = { ...currentPuzzle };
		}
	}

	// Return best found
	const finalPuzzle = bestGlobalPuzzle || solve({}) || {};
	const finalDifficulty = bestGlobalDiff;
	const clueCount = keys(finalPuzzle as Grid).length;

	const endTime = Date.now();
	const duration = endTime - startTime;

	console.log(
		`Generated puzzle with difficulty ${finalDifficulty} (target: ${targetDifficulty} ±${toleranceDifficulty}) after ${totalIterations} iterations in ${duration}ms.`,
	);

	return {
		puzzle: finalPuzzle as Grid,
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
		trivial: { target: 1, tolerance: 1, minClues: 32, maxClues: 45 }, // 1-2
		basic: { target: 10, tolerance: 9, minClues: 24, maxClues: 32 }, // 1-19
		intermediate: { target: 35.5, tolerance: 9.5, minClues: 22, maxClues: 28 }, // 26-45
		tough: { target: 56, tolerance: 12, minClues: 18, maxClues: 24 }, // 46-68
		diabolical: { target: 76, tolerance: 8 }, // 69-84
		extreme: { target: 88, tolerance: 4 }, // 85-92
		master: { target: 94, tolerance: 2 }, // 93-96
		grandmaster: { target: 98, tolerance: 1 }, // 97-100
	};

	const config = categoryTargets[category];

	// Optimization: For easier categories, try to generate by clue count first
	// This is much faster than the annealing process
	if (['trivial', 'basic', 'intermediate'].includes(category)) {
		const fastConfig = config as typeof config & {
			minClues: number;
			maxClues: number;
		};
		const maxFastAttempts = 20; // Reverted to 20

		for (let i = 0; i < maxFastAttempts; i++) {
			try {
				// Pick a random clue count in the range
				const targetClues =
					Math.floor(
						Math.random() * (fastConfig.maxClues - fastConfig.minClues + 1),
					) + fastConfig.minClues;

				// Pass maxDifficulty to fail fast if it's way too hard (e.g. requires Nishio)
				// We cap at target + tolerance + buffer. If it exceeds this, we know it's too hard.
				const fastMaxDiff = config.target + config.tolerance + 10;
				const puzzle = generateWithClues(targetClues);
				let evaluation = evaluatePuzzleDifficulty(puzzle, 1000, fastMaxDiff);

				// If it matches target, return
				if (
					Math.abs(evaluation.difficulty - config.target) <= config.tolerance
				) {
					return {
						puzzle,
						actualDifficulty: evaluation.difficulty,
						attempts: i + 1,
						clues: keys(puzzle).length,
					};
				}
			} catch (e) {
				// Ignore errors and retry
			}
		}
		// If fast generation fails, fall back to the robust method
	}

	return generateWithDifficulty({
		targetDifficulty: config.target,
		toleranceDifficulty: config.tolerance,
		allowedCategories: [category],
		...options,
	});
}
