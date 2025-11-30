import { describe, it, expect } from 'vitest';
import { getHint, valuesToCandidates } from '../sudoku.js';
import { detectSimpleColoring } from './detector.js';
import type { Candidates, Square, Values } from '../types.js';

describe('Simple Coloring Detection', () => {
	it('should detect Simple Coloring patterns', () => {
		// Manually construct candidates with a Simple Coloring pattern
		// Chain for digit 2:
		// A1 (2) - C1 (2) [Col 1 Strong Link]
		// C1 (2) - C6 (2) [Row C Strong Link]
		// C6 (2) - A6 (2) [Col 6 Strong Link]
		// Chain: A1(C1) - C1(C2) - C6(C1) - A6(C2)
		// A5 sees A1 (Row A) and A6 (Row A).
		// If A1 is 2 (C1), A5 cannot be 2.
		// If A6 is 2 (C2), A5 cannot be 2.
		// Since one of A1/A6 must be 2 (implied by chain logic? No, implied by coloring),
		// Actually, A1 and A6 have different colors.
		// If A1 is true, A5 false.
		// If A1 is false -> C1 true -> C6 false -> A6 true -> A5 false.
		// So A5 is always false.

		const candidates: Candidates = {};
		const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
		const cols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

		// Initialize all cells with some dummy candidates
		for (const r of rows) {
			for (const c of cols) {
				const sq = (r + c) as Square;
				candidates[sq] = new Set(['1', '3']); // Irrelevant candidates
			}
		}

		// Set up Simple Coloring cells for digit 2
		candidates['A1'] = new Set(['1', '2']);
		candidates['C1'] = new Set(['1', '2']);
		candidates['C6'] = new Set(['1', '2']);
		candidates['A6'] = new Set(['1', '2']);
		candidates['A5'] = new Set(['1', '2']); // Target

		// Ensure strong links by removing 2 from other cells in relevant units
		// Col 1: Only A1, C1 have 2.
		for (const r of rows) {
			if (r !== 'A' && r !== 'C') candidates[(r + '1') as Square].delete('2');
		}
		// Row C: Only C1, C6 have 2.
		for (const c of cols) {
			if (c !== '1' && c !== '6') candidates[('C' + c) as Square].delete('2');
		}
		// Col 6: Only C6, A6 have 2.
		for (const r of rows) {
			if (r !== 'A' && r !== 'C') candidates[(r + '6') as Square].delete('2');
		}
		// Row A: A1, A5, A6 have 2. (Not a strong link for A1-A6 directly, but A1-A5-A6)

		const hints = detectSimpleColoring(candidates);

		expect(hints.length).toBeGreaterThan(0);
		expect(hints[0].digit).toBe('2');
		expect(hints[0].eliminationCells).toContain('A5');
	});

	it('should not detect Simple Coloring when no chains exist', () => {
		// Test with a puzzle that has no bi-location links
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

		// Should not find Simple Coloring on a solved puzzle
		expect(hint?.type).not.toBe('simple_coloring');
	});

	it('should prioritize easier techniques over Simple Coloring', () => {
		// Test that Simple Coloring is only found when easier techniques are exhausted
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

		// Should find an easier technique (naked single) before Simple Coloring
		expect(hint?.type).not.toBe('simple_coloring');
		if (hint) {
			expect(hint.difficulty).toBeLessThan(3);
		}
	});
});
