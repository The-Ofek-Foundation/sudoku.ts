import sudoku from './sudoku';

describe('sudoku solver', () => {
	it('should solve a valid puzzle', () => {
		const puzzle =
			'53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
		const solution = sudoku.solve(puzzle);
		expect(solution).not.toBe(false);
	});

	it('should identify a puzzle with no solution', () => {
		const puzzle =
			'11...............................................................................';
		const solution = sudoku.solve(puzzle);
		expect(solution).toBe(false);
	});

	it('should identify a puzzle with multiple solutions', () => {
		const puzzle =
			'...............................................................................';
		const isUniqueResult = sudoku.isUnique(puzzle);
		expect(isUniqueResult).toBe(false);
	});
});
