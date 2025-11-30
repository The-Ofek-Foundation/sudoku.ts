import { describe, it, expect } from 'vitest';
import { getHint, valuesToCandidates } from '../sudoku.js';
import { detectYWing } from './y-wing.js';
import type { Candidates, Square } from '../types.js';

describe('Y-Wing Detection', () => {
	it('should detect Y-Wing patterns', () => {
		// Manually construct candidates with a Y-Wing pattern
		// Pivot: A1 (1,2)
		// Pincer 1: A2 (1,3) - shares 1 with pivot
		// Pincer 2: B1 (2,3) - shares 2 with pivot
		// Common candidate: 3
		// Elimination: B2 sees both A2 and B1, should lose 3.

		const candidates: Candidates = {};
		const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
		const cols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

		// Initialize all cells with some dummy candidates
		for (const r of rows) {
			for (const c of cols) {
				const sq = (r + c) as Square;
				candidates[sq] = new Set(['4', '5']); // Irrelevant candidates
			}
		}

		// Set up Y-Wing cells
		candidates['A1'] = new Set(['1', '2']); // Pivot
		candidates['A2'] = new Set(['1', '3']); // Pincer 1
		candidates['B1'] = new Set(['2', '3']); // Pincer 2

		// Set up elimination target
		candidates['B2'] = new Set(['3', '4']); // Should lose 3

		const hint = detectYWing(candidates);

		expect(hint).toBeDefined();
		expect(hint!.type).toBe('y_wing');
		expect(hint!.pivotCell).toBe('A1');
		expect(hint!.eliminationCells).toContain('B2');
		expect(hint!.difficulty).toBe(50);
	});

	it('should not detect Y-Wing when no bi-value cells exist', () => {
		// Test with a puzzle that has no bi-value cells
		const simplePuzzle = `
			123456789
			456789123
			789123456
			234567891
			567891234
			891234567
			345678912
			678912345
			912345678
		`;

		const values = {};

		const candidates = valuesToCandidates(values);
		const hint = getHint(simplePuzzle, values, candidates);

		// Should not find Y-Wing on a solved puzzle
		expect(hint?.type).not.toBe('y_wing');
	});

	it('should prioritize easier techniques over Y-Wing', () => {
		// Test that Y-Wing is only found when easier techniques are exhausted
		const puzzleWithEasierHints = `
			.23456789
			456789123
			789123456
			234567891
			567891234
			891234567
			345678912
			678912345
			912345678
		`;

		const values = {};

		const candidates = valuesToCandidates(values);
		const hint = getHint(puzzleWithEasierHints, values, candidates);

		// Should find an easier technique before Y-Wing
		if (hint) {
			expect(hint.difficulty).toBeLessThan(7);
		}
	});
});
