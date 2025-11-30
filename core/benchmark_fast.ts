import * as fastSudoku from '../fast-sudoku/pkg/fast_sudoku.js';
import { evaluatePuzzleDifficulty } from '../hints/difficulty.js';
import { solve } from './solver.js';
import { SQUARES } from './utils.js';

const ITERATIONS = 5;
const CATEGORY = 'tough';

console.log(
	`Benchmarking generateByCategoryFast('${CATEGORY}') for ${ITERATIONS} iterations...`,
);

let totalTime = 0;

for (let i = 0; i < ITERATIONS; i++) {
	const start = Date.now();
	const puzzleStr = fastSudoku.generate_by_category_fast(CATEGORY);
	const rustDiff = fastSudoku.evaluate_difficulty_fast(puzzleStr);
	const end = Date.now();
	const duration = end - start;
	totalTime += duration;

	// Parse puzzle string to Grid
	const puzzle: any = {};
	for (let k = 0; k < 81; k++) {
		const val = puzzleStr[k];
		if (val !== '.') puzzle[SQUARES[k]] = val;
	}

	const evaluation = evaluatePuzzleDifficulty(puzzle);
	console.log(
		`Iteration ${i + 1}: ${duration}ms (Rust Diff: ${rustDiff}, JS Diff: ${evaluation.difficulty})`,
	);
}

const averageTime = totalTime / ITERATIONS;
console.log(`Average time: ${averageTime}ms`);
