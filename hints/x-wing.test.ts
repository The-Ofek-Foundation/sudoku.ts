import { describe, it, expect } from 'vitest';
import { detectXWing } from './detector.js';
import type { Candidates, Square, Digit } from '../types.js';
import { getTechniqueDifficulty } from '../sudoku.js';

describe('X-Wing Strategy', () => {
	it('should detect an X-Wing', () => {
		// Manually construct candidates with an X-Wing pattern
		// X-Wing for digit 7 in rows B and F (rows 1 and 5), columns 2 and 6
		// B2, B6, F2, F6 have 7.
		// Other cells in cols 2 and 6 also have 7 (to be eliminated).

		const candidates: Candidates = {};
		const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
		const cols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

		// Initialize all cells with some dummy candidates
		for (const r of rows) {
			for (const c of cols) {
				const sq = (r + c) as Square;
				candidates[sq] = new Set(['1', '2']);
			}
		}

		// Set up X-Wing cells
		// Row B (index 1): 7 only in B2 and B6
		candidates['B2'] = new Set(['1', '7']);
		candidates['B6'] = new Set(['2', '7']);
		// Clear 7 from other cells in Row B
		for (const c of cols) {
			if (c !== '2' && c !== '6') {
				candidates[('B' + c) as Square].delete('7');
			}
		}

		// Row F (index 5): 7 only in F2 and F6
		candidates['F2'] = new Set(['1', '7']);
		candidates['F6'] = new Set(['2', '7']);
		// Clear 7 from other cells in Row F
		for (const c of cols) {
			if (c !== '2' && c !== '6') {
				candidates[('F' + c) as Square].delete('7');
			}
		}

		// Add 7 to other cells in Col 2 and Col 6 (targets for elimination)
		candidates['A2'] = new Set(['1', '7']); // Should be eliminated
		candidates['C6'] = new Set(['2', '7']); // Should be eliminated

		const hints = detectXWing(candidates);

		expect(hints.length).toBeGreaterThan(0);
		expect(hints[0].digit).toBe('7');
		expect(hints[0].eliminationCells).toContain('A2');
		expect(hints[0].eliminationCells).toContain('C6');
	});

	it('should assign correct difficulty to X-Wing', () => {
		expect(getTechniqueDifficulty('x_wing')).toBe(46);
	});
});
