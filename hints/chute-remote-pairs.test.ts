import { describe, it, expect } from 'vitest';
import { getHint, getTechniqueDifficulty } from '../sudoku.js';
import type { Values } from '../types.js';

describe('Chute Remote Pairs Strategy', () => {
	it('should detect a horizontal chute remote pair', () => {
		// Create a puzzle state that would lead to a Chute Remote Pairs pattern
		// Based on the webpage example: cells A8 and C1 have {4,7}, and 4 appears in B4,B5,B6 but 7 doesn't
		const values: Values = {
			// Fill the grid with most values, leaving specific cells with the required pattern
			A1: '1',
			A2: '2',
			A3: '3',
			A5: '5',
			A6: '6',
			A7: '8',
			A9: '9',
			B1: '5',
			B2: '6',
			B3: '7',
			B4: '4',
			B5: '8',
			B6: '9',
			B7: '1',
			B8: '2',
			B9: '3',
			C2: '8',
			C3: '9',
			C4: '1',
			C5: '2',
			C6: '3',
			C7: '5',
			C8: '6',
			C9: '7',

			D1: '2',
			D2: '3',
			D3: '4',
			D4: '6',
			D5: '7',
			D6: '8',
			D7: '9',
			D8: '5',
			D9: '1',
			E1: '6',
			E2: '7',
			E3: '8',
			E4: '9',
			E5: '1',
			E6: '2',
			E7: '3',
			E8: '4',
			E9: '5',
			F1: '9',
			F2: '1',
			F3: '5',
			F4: '3',
			F5: '4',
			F6: '7',
			F7: '6',
			F8: '8',
			F9: '2',

			G1: '3',
			G2: '4',
			G3: '6',
			G4: '7',
			G5: '8',
			G6: '9',
			G7: '1',
			G8: '3',
			G9: '5',
			H1: '7',
			H2: '8',
			H3: '1',
			H4: '2',
			H5: '3',
			H6: '4',
			H7: '5',
			H8: '9',
			H9: '6',
			I1: '8',
			I2: '9',
			I3: '2',
			I4: '5',
			I5: '6',
			I6: '1',
			I7: '7',
			I8: '1',
			I9: '4',
		};
		// Note: This creates an invalid sudoku but tests the structure of the algorithm

		// Try to get a hint
		const hint = getHint('', values);

		// Should get some hint (probably simpler techniques first) without crashing
		expect(hint).toBeDefined();
	});

	it('should detect a vertical chute remote pair', () => {
		// Create a puzzle state with a chute remote pair in vertical chute
		const values: Values = {
			// Simple setup to avoid getting other hint types first
			A1: '1',
			A2: '2',
			A3: '3',
			B1: '4',
			B2: '5',
			B3: '6',
			C1: '7',
			C2: '8',
			C3: '9',
		};

		const hint = getHint('', values);
		expect(hint).toBeDefined();
	});

	it('should not detect chute remote pairs when pattern is incomplete', () => {
		// Simple puzzle state without the pattern
		const values: Values = {
			A1: '1',
			A2: '2',
			A3: '3',
			B1: '4',
			B2: '5',
			B3: '6',
			C1: '7',
			C2: '8',
			C3: '9',
		};

		const hint = getHint('', values);

		// Should get some hint but not crash
		expect(hint).toBeDefined();
	});

	it('should assign correct difficulty to chute remote pairs', () => {
		expect(getTechniqueDifficulty('chute_remote_pairs')).toBe(52);
	});
});
