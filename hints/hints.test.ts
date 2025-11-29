import { describe, it, expect } from 'vitest';
import {
	getHint,
	getTechniqueDifficulty,
	difficultyToCategory,
} from '../sudoku';
import type { Values } from '../sudoku';

describe('Hint System', () => {
	describe('Difficulty System', () => {
		it('should assign correct difficulty values', () => {
			expect(getTechniqueDifficulty('incorrect_value')).toBe(0);
			expect(getTechniqueDifficulty('missing_candidate')).toBe(0);
			expect(getTechniqueDifficulty('naked_single')).toBe(1);
			expect(getTechniqueDifficulty('pointing_pairs')).toBe(12);
			expect(getTechniqueDifficulty('naked_pairs')).toBe(9);
			expect(getTechniqueDifficulty('hidden_pairs')).toBe(18);
			expect(getTechniqueDifficulty('naked_triples')).toBe(22);
			expect(getTechniqueDifficulty('hidden_triples')).toBe(28);
		});

		it('should categorize difficulties correctly', () => {
			expect(difficultyToCategory(1)).toBe('trivial');
			expect(difficultyToCategory(15)).toBe('basic');
			expect(difficultyToCategory(30)).toBe('intermediate');
			expect(difficultyToCategory(50)).toBe('tough');
		});

		it('should handle unknown techniques gracefully', () => {
			expect(getTechniqueDifficulty('unknown_technique')).toBe(50);
			expect(difficultyToCategory(99)).toBe('grandmaster');
		});
	});

	describe('Error Detection', () => {
		it('should detect incorrect values', () => {
			// Valid puzzle with deliberate error
			const puzzle =
				'123456789456789123789123456234567891567891234891234567345678912678912345912345678';
			const values: Values = {
				A1: '2', // Wrong! Should be 1
				A2: '2',
				A3: '3',
				A4: '4',
				A5: '5',
				A6: '6',
				A7: '7',
				A8: '8',
				A9: '9',
			};

			const hint = getHint(puzzle, values);
			expect(hint).toBeDefined();
			expect(hint!.type).toBe('error');
			expect(hint!.technique).toBe('incorrect_value');
		});
	});

	describe('Basic Hint Detection', () => {
		it('should detect simple placement hints', () => {
			// Easy puzzle with clear next move
			const puzzle =
				'4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......';
			const values: Values = {
				A1: '4',
				A7: '8',
				A9: '5',
				B2: '3',
				C8: '7',
				D1: '2',
				D7: '6',
				E7: '8',
				E9: '4',
				F8: '1',
				G8: '6',
				G9: '3',
				H2: '7',
				H4: '5',
				H7: '2',
				I7: '1',
				I8: '4',
			};

			const hint = getHint(puzzle, values);
			expect(hint).toBeDefined();
			expect(hint!.difficulty).toBeGreaterThanOrEqual(0);
			expect(hint!.difficulty).toBeLessThanOrEqual(10);
		});

		it('should prioritize easier techniques', () => {
			// Test that easier techniques are found before harder ones
			const puzzle =
				'.23456789456789123789123456234567891567891234891234567345678912678912345912345678';
			const values: Values = {
				// A1 is missing and should be easily determined
				A2: '2',
				A3: '3',
				A4: '4',
				A5: '5',
				A6: '6',
				A7: '7',
				A8: '8',
				A9: '9',
				B1: '4',
				B2: '5',
				B3: '6',
				B4: '7',
				B5: '8',
				B6: '9',
				B7: '1',
				B8: '2',
				B9: '3',
				C1: '7',
				C2: '8',
				C3: '9',
				C4: '1',
				C5: '2',
				C6: '3',
				C7: '4',
				C8: '5',
				C9: '6',
				D1: '2',
				D2: '3',
				D3: '4',
				D4: '5',
				D5: '6',
				D6: '7',
				D7: '8',
				D8: '9',
				D9: '1',
				E1: '5',
				E2: '6',
				E3: '7',
				E4: '8',
				E5: '9',
				E6: '1',
				E7: '2',
				E8: '3',
				E9: '4',
				F1: '8',
				F2: '9',
				F3: '1',
				F4: '2',
				F5: '3',
				F6: '4',
				F7: '5',
				F8: '6',
				F9: '7',
				G1: '3',
				G2: '4',
				G3: '5',
				G4: '6',
				G5: '7',
				G6: '8',
				G7: '9',
				G8: '1',
				G9: '2',
				H1: '6',
				H2: '7',
				H3: '8',
				H4: '9',
				H5: '1',
				H6: '2',
				H7: '3',
				H8: '4',
				H9: '5',
				I1: '9',
				I2: '1',
				I3: '2',
				I4: '3',
				I5: '4',
				I6: '5',
				I7: '6',
				I8: '7',
				I9: '8',
			};

			const hint = getHint(puzzle, values);
			expect(hint).toBeDefined();
			expect(hint!.type).toBe('single_cell');
			expect(hint!.difficulty).toBeLessThanOrEqual(4); // Should be a simple technique
		});

		it('should return null for completed puzzles', () => {
			const puzzle =
				'123456789456789123789123456234567891567891234891234567345678912678912345912345678';
			const values: Values = {
				A1: '1',
				A2: '2',
				A3: '3',
				A4: '4',
				A5: '5',
				A6: '6',
				A7: '7',
				A8: '8',
				A9: '9',
				B1: '4',
				B2: '5',
				B3: '6',
				B4: '7',
				B5: '8',
				B6: '9',
				B7: '1',
				B8: '2',
				B9: '3',
				C1: '7',
				C2: '8',
				C3: '9',
				C4: '1',
				C5: '2',
				C6: '3',
				C7: '4',
				C8: '5',
				C9: '6',
				D1: '2',
				D2: '3',
				D3: '4',
				D4: '5',
				D5: '6',
				D6: '7',
				D7: '8',
				D8: '9',
				D9: '1',
				E1: '5',
				E2: '6',
				E3: '7',
				E4: '8',
				E5: '9',
				E6: '1',
				E7: '2',
				E8: '3',
				E9: '4',
				F1: '8',
				F2: '9',
				F3: '1',
				F4: '2',
				F5: '3',
				F6: '4',
				F7: '5',
				F8: '6',
				F9: '7',
				G1: '3',
				G2: '4',
				G3: '5',
				G4: '6',
				G5: '7',
				G6: '8',
				G7: '9',
				G8: '1',
				G9: '2',
				H1: '6',
				H2: '7',
				H3: '8',
				H4: '9',
				H5: '1',
				H6: '2',
				H7: '3',
				H8: '4',
				H9: '5',
				I1: '9',
				I2: '1',
				I3: '2',
				I4: '3',
				I5: '4',
				I6: '5',
				I7: '6',
				I8: '7',
				I9: '8',
			};

			const hint = getHint(puzzle, values);
			expect(hint).toBeNull();
		});
	});

	describe('Performance', () => {
		it('should return hints quickly', () => {
			const puzzle =
				'4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......';
			const values: Values = {};

			// Parse puzzle into values
			for (let i = 0; i < 81; i++) {
				const char = puzzle[i];
				if (char !== '.' && char !== '0') {
					const row = Math.floor(i / 9);
					const col = i % 9;
					const square = String.fromCharCode(65 + row) + (col + 1);
					values[square] = char;
				}
			}

			const start = performance.now();
			const hint = getHint(puzzle, values);
			const end = performance.now();
			const duration = end - start;

			expect(hint).toBeTruthy();
			expect(duration).toBeLessThan(500); // Should be fast
		});
	});
});
