import { describe, it, expect } from 'vitest';
import { solve, generate, isUnique, serialize } from '../sudoku';
import type { Values } from '../sudoku';

// Helper to convert Grid to standard 81-character string
function gridToString(grid: Values): string {
	let result = '';
	const squares = 'ABCDEFGHI'
		.split('')
		.flatMap((row) => '123456789'.split('').map((col) => row + col));
	for (const square of squares) {
		result += grid[square] || '.';
	}
	return result;
}

describe('Core Sudoku Functionality', () => {
	describe('Solver', () => {
		it('should solve a valid puzzle', () => {
			const puzzle =
				'53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
			const solution = solve(puzzle);
			expect(solution).not.toBe(false);

			if (solution) {
				// Verify it's a complete solution
				const values = Object.values(solution);
				expect(values).toHaveLength(81);
				expect(values.every((v) => v && v.length === 1)).toBe(true);
			}
		});

		it('should identify unsolvable puzzles', () => {
			const puzzle =
				'11...............................................................................';
			const solution = solve(puzzle);
			expect(solution).toBe(false);
		});

		it('should handle empty puzzle', () => {
			const puzzle = '.'.repeat(81);
			const solution = solve(puzzle);
			expect(solution).not.toBe(false);
		});
	});

	describe('Uniqueness Checker', () => {
		it('should identify puzzles with multiple solutions', () => {
			const puzzle = '.'.repeat(81); // Empty puzzle has many solutions
			const isUniqueResult = isUnique(puzzle);
			expect(isUniqueResult).toBe(false);
		});

		it('should confirm unique solution puzzles', () => {
			const puzzle =
				'53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
			const isUniqueResult = isUnique(puzzle);
			expect(isUniqueResult).toBe(true);
		});
	});

	describe('Generator', () => {
		it('should generate valid puzzles', () => {
			const puzzleGrid = generate();
			expect(typeof puzzleGrid).toBe('object');
			expect(puzzleGrid).toBeTruthy();

			// Convert to standard 81-character string
			const puzzleString = gridToString(puzzleGrid);
			expect(typeof puzzleString).toBe('string');
			expect(puzzleString).toHaveLength(81);

			// Should be solvable
			const solution = solve(puzzleString);
			expect(solution).not.toBe(false);

			// Should have unique solution
			expect(isUnique(puzzleString)).toBe(true);
		}, 10000);

		it('should generate different puzzles', () => {
			const puzzle1 = gridToString(generate());
			const puzzle2 = gridToString(generate());

			// Very unlikely to generate identical puzzles
			expect(puzzle1).not.toBe(puzzle2);
		}, 20000);
	});
});
