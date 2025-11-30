import init, * as fastSudoku from '../fast-sudoku/pkg/fast_sudoku.js';
import { evaluatePuzzleDifficulty } from '../hints/difficulty.js';
import { SQUARES } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ITERATIONS = 5;
const CATEGORY = 'tough';
const SEED = 12345n;

// Initialize WASM
const wasmPath = path.join(__dirname, '../fast-sudoku/pkg/fast_sudoku_bg.wasm');
const wasmBuffer = fs.readFileSync(wasmPath);
await init(wasmBuffer);
// BigInt for u64

console.log(
	`Benchmarking generateWithSeedFast('${CATEGORY}', ${SEED}) for ${ITERATIONS} iterations...`,
);

let totalTime = 0;

for (let i = 0; i < ITERATIONS; i++) {
	const start = Date.now();
	// Use the same seed for each iteration to verify determinism and measure pure performance
	// Or increment seed to test different but reproducible puzzles
	const currentSeed = SEED + BigInt(i);

	const puzzleStr = fastSudoku.generate_with_seed_fast(CATEGORY, currentSeed);
	// const [puzzleStr, stats] = result.split('|');
	// const evals = stats ? parseInt(stats.split(':')[1]) : 0;

	const rustDiff = fastSudoku.evaluate_difficulty_fast(puzzleStr);
	const end = Date.now();
	const duration = end - start;
	totalTime += duration;

	// const timePerEval = evals > 0 ? (duration / evals).toFixed(3) : 0;

	// Parse puzzle string to Grid
	const puzzle: any = {};
	for (let k = 0; k < 81; k++) {
		const val = puzzleStr[k];
		if (val !== '.') puzzle[SQUARES[k]] = val;
	}

	const evaluation = evaluatePuzzleDifficulty(puzzle);
	console.log(
		`Iteration ${i + 1} (Seed ${currentSeed}): ${duration} ms(Rust Diff: ${rustDiff}, JS Diff: ${evaluation.difficulty})`,
	);
}

const averageTime = totalTime / ITERATIONS;
console.log(`Average time: ${averageTime} ms`);
