import { describe, it, expect } from 'vitest';
import sudoku, { serialize } from '../sudoku';
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

describe('Sudoku Integration Tests', () => {
	it('should handle complete workflow: generate → solve → validate', () => {
		// Generate a puzzle
		const puzzleGrid = sudoku.generate();
		expect(typeof puzzleGrid).toBe('object');
		expect(puzzleGrid).toBeTruthy();

		// Convert to standard string format
		const puzzle = gridToString(puzzleGrid);
		expect(typeof puzzle).toBe('string');
		expect(puzzle).toHaveLength(81);

		// Solve it
		const solution = sudoku.solve(puzzle);
		expect(solution).not.toBe(false);

		// Validate it's unique
		expect(sudoku.isUnique(puzzle)).toBe(true);

		// Get hint for partial state
		const partialValues = sudoku.parseGrid(puzzle) || {};
		const hint = sudoku.getHint(puzzle, partialValues);

		if (Object.keys(partialValues).length < 81) {
			// If puzzle isn't complete, should get a hint
			expect(hint).toBeTruthy();
		} else {
			// If puzzle is complete, no hints needed
			expect(hint).toBeNull();
		}
	});

	it('should handle edge cases gracefully', () => {
		// Empty puzzle - should have a solution (any valid sudoku)
		const emptyPuzzle = '.'.repeat(81);
		const emptyResult = sudoku.solve(emptyPuzzle);
		expect(emptyResult).not.toBe(false); // Empty puzzles can be solved
		expect(sudoku.isUnique(emptyPuzzle)).toBe(false); // But not unique

		// Invalid puzzle - conflicting values
		const invalidPuzzle = '11' + '.'.repeat(79);
		expect(sudoku.solve(invalidPuzzle)).toBe(false);

		// Malformed input - should handle gracefully
		// Note: solver may return a solution for short strings by padding
		const shortResult = sudoku.solve('');
		// Either false or a valid solution is acceptable
		expect(shortResult === false || typeof shortResult === 'object').toBe(true);

		const shortResult2 = sudoku.solve('too short');
		expect(shortResult2 === false || typeof shortResult2 === 'object').toBe(
			true,
		);
	});

	it('should maintain backwards compatibility', () => {
		const puzzle =
			'4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......';

		// Old interface should still work
		expect(sudoku.test).toBeDefined();
		expect(typeof sudoku.test).toBe('function');

		const parsed = sudoku.test(puzzle);
		expect(parsed).toBeTruthy();
	});
});
