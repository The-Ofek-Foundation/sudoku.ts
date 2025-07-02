import { describe, it, expect } from 'vitest';
import { getComprehensiveHint } from './sudoku';

describe('getComprehensiveHint Performance', () => {
	it('should return hints quickly with early exit optimization', () => {
		// Easy puzzle with multiple possible hints - should find the easiest one quickly
		const easyPuzzle = '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......';
		const values = {} as any;
		for (let i = 0; i < 81; i++) {
			const char = easyPuzzle[i];
			if (char !== '.' && char !== '0') {
				const row = Math.floor(i / 9);
				const col = i % 9;
				const square = String.fromCharCode(65 + row) + (col + 1);
				values[square] = char;
			}
		}

		// Time the hint detection
		const start = performance.now();
		const hint = getComprehensiveHint(easyPuzzle, values);
		const end = performance.now();
		const duration = end - start;

		// Should find a hint quickly (< 50ms is reasonable for early exit)
		expect(hint).toBeTruthy();
		expect(duration).toBeLessThan(50);
		
		// Should find the easiest available hint (whatever the minimum difficulty is for this puzzle)
		expect(hint!.difficulty).toBeGreaterThan(0);
		expect(hint!.difficulty).toBeLessThanOrEqual(10);
		
		console.log(`Hint detection took ${duration.toFixed(2)}ms, found ${hint!.technique} (difficulty ${hint!.difficulty})`);
	});

	it('should handle complex puzzles efficiently', () => {
		// More complex puzzle that might have many hints available
		const complexPuzzle = '85...24..72......9..4.........1.7..23.5...9...4...........8..7..17..........36.4.';
		const values = {} as any;
		for (let i = 0; i < 81; i++) {
			const char = complexPuzzle[i];
			if (char !== '.' && char !== '0') {
				const row = Math.floor(i / 9);
				const col = i % 9;
				const square = String.fromCharCode(65 + row) + (col + 1);
				values[square] = char;
			}
		}

		// Time multiple hint detections to test consistency
		const times: number[] = [];
		for (let i = 0; i < 10; i++) {
			const start = performance.now();
			const hint = getComprehensiveHint(complexPuzzle, values);
			const end = performance.now();
			times.push(end - start);
			
			expect(hint).toBeTruthy();
		}

		const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
		const maxTime = Math.max(...times);

		// Average should be very fast due to early exit
		expect(avgTime).toBeLessThan(25);
		expect(maxTime).toBeLessThan(50);
		
		console.log(`Average hint detection: ${avgTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms`);
	});
});
