// COMPREHENSIVE SUDOKU DIFFICULTY SYSTEM (100-point scale)
// Based on extensive research from SudokuWiki.org strategy families
// Represents the true complexity spectrum of sudoku solving techniques

export const TECHNIQUE_DIFFICULTIES: Record<string, number> = {
	// Stage 1: Error Detection (0)
	incorrect_value: 0, // Error detection (both allowed to be 0)
	missing_candidate: 0, // Error detection (both allowed to be 0)
	auto_eliminate_candidates: 0, // Automatic candidate elimination after placement

	// Stage 2: Trivial/Getting Started (1-8)
	naked_single: 1, // Only one candidate left - trivial to spot
	last_remaining_in_box: 3, // Requires scanning box but obvious
	last_remaining_in_row: 4, // Requires scanning row
	last_remaining_in_column: 5, // Requires scanning column
	hidden_single: 7, // Must scan all units - harder to spot than naked

	// Stage 3: Basic Elimination (9-25)
	naked_pairs: 9, // Two cells same candidates - relatively easy pattern
	pointing_pairs: 12, // Box-line interaction - foundational technique
	box_line_reduction: 14, // Line-box interaction - slightly trickier
	hidden_pairs: 18, // MUCH harder - must think about what's missing
	naked_triples: 22, // Three cells interacting - complex pattern recognition
	hidden_triples: 28, // Significantly harder than naked - very hard to spot

	// Stage 4: Advanced Elimination (30-45)
	naked_quads: 35, // Rare, complex pattern with 4 cells - quite difficult
	hidden_quads: 42, // Extremely difficult to spot - near expert level
	claiming: 38, // Advanced intersection patterns

	// Stage 5: Fish and Wings (46-65)
	x_wing: 46, // First fish - rectangular pattern across grid
	y_wing: 52, // Pivot + pincers pattern - substantial leap in difficulty
	xyz_wing: 58, // Y-wing + extra candidate - much trickier
	swordfish: 62, // 3x3 fish - major complexity jump from X-wing
	wxyz_wing: 67, // 4-cell wing pattern - very complex

	// Stage 6: Intermediate Patterns (50-68)
	chute_remote_pairs: 50, // Remote pair chains across chutes
	simple_coloring: 54, // Basic conjugate pair coloring
	rectangle_elimination: 56, // Basic unique rectangle patterns
	unique_rectangles: 61, // Advanced rectangle logic
	bug: 64, // Bivalue universal grave - complex theory
	avoidable_rectangles: 66, // Advanced rectangle patterns

	// Stage 7: Advanced Coloring and Chains (69-75)
	x_cycles: 69, // Single-digit advanced coloring chains
	xy_chains: 72, // Bivalue cell chains - substantial complexity
	three_d_medusa: 74, // Multi-digit advanced coloring - very complex

	// Stage 8: Diabolical Patterns (76-84)
	jellyfish: 76, // 4x4 fish - extremely rare and complex
	extended_unique_rectangles: 78, // UR extensions with additional logic
	hidden_unique_rectangles: 79, // Hidden UR patterns - very hard to spot
	fireworks: 81, // Complex elimination patterns
	aligned_pair_exclusion: 82, // APE patterns - advanced logic
	sk_loops: 83, // Sue-de-Coq loops - complex interactions
	twinned_xy_chains: 84, // Multiple parallel XY chains

	// Stage 9: Extreme Techniques (85-92)
	finned_x_wing: 85, // X-Wing with fin complications
	finned_swordfish: 87, // Swordfish with fin complications
	grouped_x_cycles: 88, // X-Cycles with grouped cells
	alternating_inference_chains: 89, // Advanced chaining logic
	sue_de_coq: 90, // Complex locked set intersections
	almost_locked_sets: 91, // ALS patterns - very advanced logic
	aic_with_groups: 92, // AIC with grouped elimination

	// Stage 10: Master Level (93-96)
	aic_with_als: 93, // AIC with almost locked sets - extremely complex
	aic_with_unique_rectangles: 94, // AIC with UR links
	digit_forcing_chains: 95, // Multi-branch forcing logic
	cell_forcing_chains: 95.5, // Cell-based forcing (slightly easier than digit)
	unit_forcing_chains: 96, // Unit-based forcing logic

	// Stage 11: Grandmaster Level (97-99)
	nishio_forcing_chains: 97, // Trial-based forcing - near brute force
	exocet: 97.5, // Extremely complex base/target patterns
	double_exocet: 98, // Dual exocet patterns - insanely complex
	death_blossom: 98.5, // ALS with stem-petal - master level pattern recognition
	pattern_overlay: 99, // Template method - essentially computerized solving
};

// Pre-sorted array of techniques ordered by difficulty (easiest first)
export const SORTED_TECHNIQUES = Object.entries(TECHNIQUE_DIFFICULTIES)
	.sort(([, difficultyA], [, difficultyB]) => difficultyA - difficultyB)
	.map(([technique]) => technique);

/**
 * Get the numeric difficulty for a technique (0-99 scale, decimals allowed)
 * Error detection techniques return 0, all others 1-99
 */
export function getTechniqueDifficulty(technique: string): number {
	const result = TECHNIQUE_DIFFICULTIES[technique];
	return result !== undefined ? result : 50; // Default to medium difficulty
}

/**
 * Convert numeric difficulty to detailed display category (100-point scale)
 */
export function difficultyToCategory(
	difficulty: number,
):
	| 'error'
	| 'trivial'
	| 'basic'
	| 'intermediate'
	| 'tough'
	| 'diabolical'
	| 'extreme'
	| 'master'
	| 'grandmaster' {
	if (difficulty === 0) return 'error'; // Error detection only
	if (difficulty <= 8) return 'trivial'; // Getting started techniques
	if (difficulty <= 25) return 'basic'; // Basic elimination patterns
	if (difficulty <= 45) return 'intermediate'; // Advanced elimination
	if (difficulty <= 68) return 'tough'; // Fish, wings, patterns
	if (difficulty <= 84) return 'diabolical'; // Advanced coloring, complex chains
	if (difficulty <= 92) return 'extreme'; // AIC, forcing techniques
	if (difficulty <= 96) return 'master'; // Master-level patterns
	return 'grandmaster'; // Near-computational techniques
}

import type { Square, Digit, Grid, Values, Candidates } from '../types.js';
import type { SudokuHint } from './types.js';
import { getHint, valuesToCandidates } from './detector.js';
import { SQUARES, DIGITS, PEERS } from '../core/utils.js';

/**
 * Result of attempting to solve a puzzle
 */
export interface SolveResult {
	success: boolean;
	totalSteps: number;
	techniquesUsed: string[];
	finalValues: Values;
	finalCandidates: Candidates;
	stepsHistory: Array<{
		technique: string;
		difficulty: number;
		hint: SudokuHint;
		valuesAfter: Values;
		candidatesAfter: Candidates;
	}>;
}

/**
 * Applies a hint to the current game state, updating values and candidates
 */
function applyHintToState(
	hint: SudokuHint,
	values: Values,
	candidates: Candidates,
): { newValues: Values; newCandidates: Candidates; progressMade: boolean } {
	// Deep copy the current state
	const newValues: Values = { ...values };
	const newCandidates: Candidates = {};

	// Deep copy candidates
	for (const square of SQUARES) {
		if (candidates[square]) {
			newCandidates[square] = new Set(candidates[square]);
		}
	}

	let progressMade = false;

	switch (hint.type) {
		case 'error':
			// Fix incorrect value
			newValues[hint.square] = hint.correctValue;
			delete newCandidates[hint.square];
			progressMade = true;
			break;

		case 'missing_candidate':
			// Add missing candidate
			if (!newCandidates[hint.square]) {
				newCandidates[hint.square] = new Set();
			}
			newCandidates[hint.square].add(hint.missingDigit);
			progressMade = true;
			break;

		case 'single_cell':
			// Place the digit
			newValues[hint.square] = hint.digit;
			delete newCandidates[hint.square];

			// Auto-eliminate this digit from all peers
			for (const peer of PEERS[hint.square]) {
				if (newCandidates[peer] && newCandidates[peer].has(hint.digit)) {
					newCandidates[peer].delete(hint.digit);
				}
			}
			progressMade = true;
			break;

		case 'naked_set':
		case 'hidden_set':
			// Remove candidates from elimination cells
			if (hint.eliminationCells && hint.eliminationDigits) {
				for (const eliminationCell of hint.eliminationCells) {
					if (newCandidates[eliminationCell]) {
						for (const digit of hint.eliminationDigits) {
							if (newCandidates[eliminationCell].has(digit)) {
								newCandidates[eliminationCell].delete(digit);
								progressMade = true;
							}
						}
					}
				}
			}
			break;

		case 'intersection_removal':
		case 'x_wing':
		case 'simple_coloring':
			// Remove single digit from elimination cells
			if (hint.eliminationCells) {
				for (const eliminationCell of hint.eliminationCells) {
					if (
						newCandidates[eliminationCell] &&
						newCandidates[eliminationCell].has(hint.digit)
					) {
						newCandidates[eliminationCell].delete(hint.digit);
						progressMade = true;
					}
				}
			}
			break;

		case 'chute_remote_pairs':
			// Remove absent digit from elimination cells
			if (hint.eliminationCells) {
				for (const eliminationCell of hint.eliminationCells) {
					if (
						newCandidates[eliminationCell] &&
						newCandidates[eliminationCell].has(hint.absentDigit)
					) {
						newCandidates[eliminationCell].delete(hint.absentDigit);
						progressMade = true;
					}
				}
			}
			break;

		case 'y_wing':
			// Remove candidate C from elimination cells
			if (hint.eliminationCells) {
				for (const eliminationCell of hint.eliminationCells) {
					if (
						newCandidates[eliminationCell] &&
						newCandidates[eliminationCell].has(hint.candidateC)
					) {
						newCandidates[eliminationCell].delete(hint.candidateC);
						progressMade = true;
					}
				}
			}
			break;
	}

	return { newValues, newCandidates, progressMade };
}

/**
 * Solves a sudoku puzzle by repeatedly applying hints in order of difficulty
 * Maintains candidate information throughout the solving process
 */
export function solvePuzzleWithHints(
	puzzle: string | Grid,
	maxSteps: number = 1000,
): SolveResult {
	// Initialize starting state
	let values: Values = {};

	// Parse initial puzzle state
	if (typeof puzzle === 'string') {
		for (let i = 0; i < puzzle.length && i < 81; i++) {
			const char = puzzle[i];
			if (char !== '.' && char !== '0' && char >= '1' && char <= '9') {
				values[SQUARES[i]] = char;
			}
		}
	} else {
		values = { ...puzzle };
	}

	// Initialize candidates
	let candidates = valuesToCandidates(values);

	const techniquesUsed: string[] = [];
	const stepsHistory: Array<{
		technique: string;
		difficulty: number;
		hint: SudokuHint;
		valuesAfter: Values;
		candidatesAfter: Candidates;
	}> = [];

	let totalSteps = 0;

	// Solving loop
	while (totalSteps < maxSteps) {
		// Check if puzzle is solved (all 81 squares have values)
		const solvedCells = Object.keys(values).filter(
			(square) => values[square] && values[square].length === 1,
		).length;
		if (solvedCells === 81) {
			return {
				success: true,
				totalSteps,
				techniquesUsed,
				finalValues: values,
				finalCandidates: candidates,
				stepsHistory,
			};
		}

		// Get next hint
		const hint = getHint(puzzle, values, candidates);

		if (!hint) {
			// No more hints available - puzzle cannot be solved with current techniques
			break;
		}

		// Apply the hint
		const { newValues, newCandidates, progressMade } = applyHintToState(
			hint,
			values,
			candidates,
		);

		if (!progressMade) {
			// Hint didn't make progress - this shouldn't happen but prevents infinite loops
			console.warn('Hint did not make progress:', hint);
			break;
		}

		// Update state
		values = newValues;
		candidates = newCandidates;
		totalSteps++;

		// Record technique used
		if (!techniquesUsed.includes(hint.technique)) {
			techniquesUsed.push(hint.technique);
		}

		// Record step in history
		stepsHistory.push({
			technique: hint.technique,
			difficulty: hint.difficulty,
			hint,
			valuesAfter: { ...values },
			candidatesAfter: { ...candidates },
		});
	}

	// Puzzle couldn't be solved
	return {
		success: false,
		totalSteps,
		techniquesUsed,
		finalValues: values,
		finalCandidates: candidates,
		stepsHistory,
	};
}

/**
 * Evaluates the difficulty of a puzzle based on the techniques required to solve it
 * Returns a difficulty score from 1-100 that maps to our existing difficulty categories
 */
export function evaluatePuzzleDifficulty(
	puzzle: string | Grid,
	maxSteps: number = 1000,
): {
	difficulty: number;
	category: ReturnType<typeof difficultyToCategory>;
	solvable: boolean;
	techniquesUsed: string[];
	hardestTechnique: string | null;
	totalSteps: number;
	breakdown: {
		maxDifficulty: number;
		averageDifficulty: number;
		weightedScore: number;
		techniqueCount: number;
	};
} {
	const solveResult = solvePuzzleWithHints(puzzle, maxSteps);

	if (!solveResult.success) {
		// Puzzle couldn't be solved - assign maximum difficulty
		return {
			difficulty: 100,
			category: 'grandmaster',
			solvable: false,
			techniquesUsed: solveResult.techniquesUsed,
			hardestTechnique: null,
			totalSteps: solveResult.totalSteps,
			breakdown: {
				maxDifficulty: 100,
				averageDifficulty: 100,
				weightedScore: 100,
				techniqueCount: solveResult.techniquesUsed.length,
			},
		};
	}

	// Calculate various difficulty metrics
	const technicianDifficulties = solveResult.stepsHistory.map(
		(step) => step.difficulty,
	);
	const uniqueTechniqueDifficulties = solveResult.techniquesUsed.map(
		(technique) => getTechniqueDifficulty(technique),
	);

	// Filter out error detection techniques (difficulty 0) for meaningful analysis
	const meaningfulDifficulties = technicianDifficulties.filter((d) => d > 0);
	const meaningfulUniqueDifficulties = uniqueTechniqueDifficulties.filter(
		(d) => d > 0,
	);

	if (meaningfulDifficulties.length === 0) {
		// Only trivial techniques were used
		return {
			difficulty: 1,
			category: 'trivial',
			solvable: true,
			techniquesUsed: solveResult.techniquesUsed,
			hardestTechnique: solveResult.techniquesUsed[0] || null,
			totalSteps: solveResult.totalSteps,
			breakdown: {
				maxDifficulty: 1,
				averageDifficulty: 1,
				weightedScore: 1,
				techniqueCount: solveResult.techniquesUsed.length,
			},
		};
	}

	// Core metrics
	const maxDifficulty = Math.max(...meaningfulUniqueDifficulties);
	const averageDifficulty =
		meaningfulDifficulties.reduce((sum, d) => sum + d, 0) /
		meaningfulDifficulties.length;

	// Find hardest technique used
	const hardestTechniqueIndex =
		uniqueTechniqueDifficulties.indexOf(maxDifficulty);
	const hardestTechnique =
		hardestTechniqueIndex >= 0
			? solveResult.techniquesUsed[hardestTechniqueIndex]
			: null;

	// Weighted score calculation (hybrid approach)
	// 70% weight on the hardest technique required
	// 20% weight on the average difficulty across all steps
	// 10% weight on technique diversity (more techniques = slightly harder)
	const diversityBonus = Math.min(meaningfulUniqueDifficulties.length * 0.5, 5); // Cap at 5 points
	const weightedScore =
		maxDifficulty * 0.7 + averageDifficulty * 0.2 + diversityBonus;

	// Clamp final difficulty to 1-100 range
	const finalDifficulty = Math.max(1, Math.min(100, Math.round(weightedScore)));

	return {
		difficulty: finalDifficulty,
		category: difficultyToCategory(finalDifficulty),
		solvable: true,
		techniquesUsed: solveResult.techniquesUsed,
		hardestTechnique,
		totalSteps: solveResult.totalSteps,
		breakdown: {
			maxDifficulty: Math.round(maxDifficulty),
			averageDifficulty: Math.round(averageDifficulty * 10) / 10,
			weightedScore: Math.round(weightedScore * 10) / 10,
			techniqueCount: meaningfulUniqueDifficulties.length,
		},
	};
}
