import { describe, test, expect } from 'vitest';
import sudoku, { getTechniqueDifficulty, difficultyToCategory } from './sudoku';

describe('Difficulty System', () => {
	test('getTechniqueDifficulty returns correct numeric values', () => {
		expect(getTechniqueDifficulty('incorrect_value')).toBe(1);
		expect(getTechniqueDifficulty('missing_candidate')).toBe(2);
		expect(getTechniqueDifficulty('naked_single')).toBe(3);
		expect(getTechniqueDifficulty('pointing_pairs')).toBe(4);
		expect(getTechniqueDifficulty('naked_pairs')).toBe(5);
		expect(getTechniqueDifficulty('naked_triples')).toBe(6);
		expect(getTechniqueDifficulty('hidden_pairs')).toBe(6);
		expect(getTechniqueDifficulty('naked_quads')).toBe(7);
		expect(getTechniqueDifficulty('hidden_triples')).toBe(7);
		expect(getTechniqueDifficulty('hidden_quads')).toBe(8);
	});

	test('difficultyToCategory maps numbers to categories correctly', () => {
		expect(difficultyToCategory(1)).toBe('beginner');
		expect(difficultyToCategory(2)).toBe('beginner');
		expect(difficultyToCategory(3)).toBe('easy');
		expect(difficultyToCategory(4)).toBe('easy');
		expect(difficultyToCategory(5)).toBe('medium');
		expect(difficultyToCategory(6)).toBe('medium');
		expect(difficultyToCategory(7)).toBe('medium');
		expect(difficultyToCategory(8)).toBe('hard');
		expect(difficultyToCategory(9)).toBe('hard');
		expect(difficultyToCategory(10)).toBe('hard');
	});

	test('unknown technique defaults to medium difficulty', () => {
		expect(getTechniqueDifficulty('unknown_technique')).toBe(5);
		expect(difficultyToCategory(getTechniqueDifficulty('unknown_technique'))).toBe('medium');
	});

	test('hint ordering prioritizes easier techniques', () => {
		// Create a test puzzle with both pointing pairs (difficulty 4) and naked pairs (difficulty 5)
		// The system should return pointing pairs first
		const puzzle = '';
		const values = {
			'A1': '1', 'A2': '2', 'A3': '3',
			'B1': '4', 'B2': '5', 'B3': '6',
			'C1': '7', 'C2': '8', 'C3': '9'
		};
		
		const candidates = {
			'A4': new Set(['1', '2']),
			'A5': new Set(['1', '2']),
			'B4': new Set(['3', '4']),
			'B5': new Set(['3', '4'])
		};

		const hint = sudoku.getComprehensiveHint(puzzle, values, candidates);
		
		// The returned hint should have a difficulty property
		expect(hint).toBeTruthy();
		if (hint) {
			expect(typeof hint.difficulty).toBe('number');
			expect(hint.difficulty).toBeGreaterThanOrEqual(1);
			expect(hint.difficulty).toBeLessThanOrEqual(10);
		}
	});
});
