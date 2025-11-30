import init, {
	generate_by_category_fast,
	evaluate_difficulty_fast,
} from './pkg/fast_sudoku.js';
import { SQUARES } from '../core/utils.js';

let isInitialized = false;

export async function initSudoku() {
	if (typeof window === 'undefined') return; // Don't initialize on server

	if (!isInitialized) {
		await init();
		isInitialized = true;
	}
}

export function generateByCategoryFast(category: string) {
	if (!isInitialized) {
		throw new Error(
			'Fast Sudoku WASM not initialized. Call initSudoku() first.',
		);
	}

	const puzzleStr = generate_by_category_fast(category);
	const difficulty = evaluate_difficulty_fast(puzzleStr);

	// Convert string to Grid object (map of index string to value string)
	// The existing code expects { "A1": "5", "A2": "3", ... }
	const puzzle: Record<string, string> = {};
	for (let i = 0; i < 81; i++) {
		const val = puzzleStr[i];
		if (val !== '.' && val !== '0') {
			puzzle[SQUARES[i]] = val;
		}
	}

	return {
		puzzle,
		actualDifficulty: difficulty,
		attempts: 1,
		clues: Object.keys(puzzle).length,
	};
}
