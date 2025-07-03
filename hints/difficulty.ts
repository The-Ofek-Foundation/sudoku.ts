// SUDOKU HINT DIFFICULTY SYSTEM

// Centralized difficulty configuration for all hint techniques (1-10 scale)
export const TECHNIQUE_DIFFICULTIES: Record<string, number> = {
	// Stage 1: Error Detection (1-2)
	incorrect_value: 1,
	missing_candidate: 2,

	// Stage 2: Trivial Hints (2-3)
	last_remaining_in_box: 2,
	last_remaining_in_row: 2,
	last_remaining_in_column: 2,
	naked_single: 3,

	// Stage 3: Basic Elimination (4-5)
	pointing_pairs: 4,
	box_line_reduction: 4,
	naked_pairs: 5,

	// Stage 4: Intermediate Techniques (6-7)
	naked_triples: 6,
	hidden_pairs: 6,
	naked_quads: 7,
	hidden_triples: 7,

	// Stage 5: Advanced Techniques (8-10)
	hidden_quads: 8,
};

// Pre-sorted array of techniques ordered by difficulty (easiest first)
export const SORTED_TECHNIQUES = Object.entries(TECHNIQUE_DIFFICULTIES)
	.sort(([, difficultyA], [, difficultyB]) => difficultyA - difficultyB)
	.map(([technique]) => technique);

/**
 * Get the numeric difficulty for a technique (1-10 scale)
 */
export function getTechniqueDifficulty(technique: string): number {
	return TECHNIQUE_DIFFICULTIES[technique] || 5; // Default to medium difficulty
}

/**
 * Convert numeric difficulty to display category
 */
export function difficultyToCategory(
	difficulty: number,
): 'beginner' | 'easy' | 'medium' | 'hard' {
	if (difficulty <= 2) return 'beginner';
	if (difficulty <= 4) return 'easy';
	if (difficulty <= 7) return 'medium';
	return 'hard';
}
