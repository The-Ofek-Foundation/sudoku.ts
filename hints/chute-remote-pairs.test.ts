import { describe, it, expect } from 'vitest';
import { detectChuteRemotePairs } from './detector.js';
import type { Candidates, Values, Square } from '../types.js';

describe('Chute Remote Pairs Strategy', () => {
	it('should detect a horizontal chute remote pair', () => {
		// Manually construct candidates with a Chute Remote Pairs pattern
		// Horizontal Chute 1 (Rows A, B, C)
		// Remote Pair: A8 (4,7) and C1 (4,7)
		// Third Box: Box 2 (middle top)
		// Condition: 4 is present in Box 2, 7 is absent in Box 2.
		// Absent Digit: 7
		// Elimination: Cells seeing both A8 and C1 (A1 and C8) should lose 7.

		const candidates: Candidates = {};
		const values: Values = {};
		const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
		const cols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

		// Initialize all cells with some dummy candidates
		for (const r of rows) {
			for (const c of cols) {
				const sq = (r + c) as Square;
				candidates[sq] = new Set(['1', '2']); // Irrelevant candidates
			}
		}

		// Set up Remote Pair cells
		candidates['A8'] = new Set(['4', '7']);
		candidates['C1'] = new Set(['4', '7']);

		// Set up Third Box (Box 2: A4-A6, B4-B6, C4-C6)
		// Ensure 7 is absent in Box 2
		const box2Squares = ['A4', 'A5', 'A6', 'B4', 'B5', 'B6', 'C4', 'C5', 'C6'];
		for (const sq of box2Squares) {
			candidates[sq as Square].delete('7');
			// Ensure 4 is present in at least one cell (e.g. B5)
			if (sq === 'B5') {
				candidates[sq as Square].add('4');
			}
		}

		// Set up Elimination Targets (A1 and C8)
		candidates['A1'] = new Set(['1', '7']); // Should lose 7
		candidates['C8'] = new Set(['2', '7']); // Should lose 7

		const hints = detectChuteRemotePairs(candidates, values);

		expect(hints.length).toBeGreaterThan(0);
		expect(hints[0].absentDigit).toBe('7');
		expect(hints[0].eliminationCells).toContain('A1');
		expect(hints[0].eliminationCells).toContain('C8');
	});
});
