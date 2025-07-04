// SUDOKU CORE UTILITIES

import type {
	Square,
	Digit,
	Row,
	Column,
	Unit,
	Values,
	Candidates,
} from '../types.js';

// Constants
export const ROWS: Row[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
export const COLS: Column[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const DIGITS = '123456789';

// Basic utility functions - using modern JavaScript equivalents
export const vals = <T>(obj: Record<string, T>): T[] => Object.values(obj);
export const keys = <T>(obj: Record<string, T>): string[] => Object.keys(obj);
export const each = <T>(list: T[], func: (item: T, index: number) => void): void => 
	list.forEach(func);

export function dict<T>(keys: string[], values: T[]): Record<string, T> {
	return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
}

export function print(s: string): void {
	console.log(s + '\r\n');
}

// Array utility functions - using modern JavaScript equivalents
export const all = <T>(list: T[], func: (item: T) => boolean): boolean => 
	list.every(func);

export const any = <T>(list: T[], func: (item: T) => any): any => 
	list.find(func);

export const filter = <T>(list: T[], func: (item: T, index?: number) => boolean): T[] => 
	list.filter(func);

export const map = <T, U>(list: T[], expr: (value: T) => U): U[] => 
	list.map(expr);

export const some = <T>(seq: T[], func: (item: T) => any): any => 
	seq.find(func);

export const max = (list: number[]): number => Math.max(...list);
export const min = (list: number[]): number => Math.min(...list);
export const randomElement = <T>(list: T[]): T => 
	list[Math.floor(Math.random() * list.length)];
export const contains = <T>(list: T[], val: T): boolean => list.includes(val);

export function set<T>(list: T[]): T[] {
	return [...new Set(list)];
}

export const concat = <T>(...arrays: T[][]): T[] => arrays.flat();

export const repeat = (str: string, times: number): string => str.repeat(times);

export function center(str: string, width: number): string {
	const pad = width - str.length;
	if (pad <= 0) {
		return str;
	}
	return ' '.repeat(Math.floor(pad / 2)) + str + ' '.repeat(Math.ceil(pad / 2));
}

export const copy = (board: Values): Values => ({ ...board });

export const randomInt = (min: number, max: number): number => 
	Math.floor(Math.random() * (max - min + 1)) + min;

export function shuffle<T>(seq: T[]): T[] {
	const result = [...seq];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export const range = (count: number): number[] => 
	Array.from({ length: count }, (_, i) => i);

export const chars = (s: string): string[] => [...s];

export function cross(a: string[], b: string[]): string[] {
	return a.flatMap(x => b.map(y => x + y));
}

// Generate the core data structures
export const SQUARES: Square[] = cross(ROWS, COLS);
export const UNIT_LIST: Unit[] = [];
export const UNITS: Record<Square, Unit[]> = {};
export const PEERS: Record<Square, Square[]> = {};

// Initialize unit list - rows, columns, and boxes
ROWS.forEach(row => UNIT_LIST.push(cross([row], COLS)));
COLS.forEach(col => UNIT_LIST.push(cross(ROWS, [col])));

const groupCols = ['123', '456', '789'];
const groupRows = ['ABC', 'DEF', 'GHI'];
groupRows.forEach(rowGroup => 
	groupCols.forEach(colGroup => 
		UNIT_LIST.push(cross(chars(rowGroup), chars(colGroup)))
	)
);

// Initialize units and peers for each square
SQUARES.forEach(square => {
	const squarePeers: Square[] = [];
	const squareUnits: Unit[] = [];

	UNIT_LIST.forEach(unit => {
		if (contains(unit, square)) {
			squareUnits.push(unit);
			unit.forEach(unitSquare => {
				if (!contains(squarePeers, unitSquare) && unitSquare !== square) {
					squarePeers.push(unitSquare);
				}
			});
		}
	});
	
	UNITS[square] = squareUnits;
	PEERS[square] = squarePeers;
});

/**
 * Helper function to convert values to candidates format for hint detection
 */
export function valuesToCandidates(values: Values): Candidates {
	const candidates: Candidates = {};

	// Initialize all empty cells with all possible digits
	for (const square of SQUARES) {
		if (!values[square] || values[square].length > 1) {
			candidates[square] = new Set(DIGITS.split(''));
		}
	}

	// Eliminate candidates based on placed values
	for (const square in values) {
		if (values[square] && values[square].length === 1) {
			const digit = values[square];
			// Remove this digit from all peers
			for (const peer of PEERS[square]) {
				if (candidates[peer]) {
					candidates[peer].delete(digit);
				}
			}
		}
	}

	return candidates;
}

/**
 * Determines the type of a sudoku unit (row, column, or box)
 * @param unit - Array of squares that form a unit
 * @returns 'row', 'column', or 'box'
 */
export function getUnitType(unit: Unit): 'row' | 'column' | 'box' {
	if (unit.length < 9) return 'box'; // Safety check

	// Check if all squares are in the same row (same first character)
	if (unit[0].charAt(0) === unit[8].charAt(0)) {
		return 'row';
	}

	// Check if all squares are in the same column (same second character)
	if (unit[0].charAt(1) === unit[8].charAt(1)) {
		return 'column';
	}

	// Otherwise it's a box
	return 'box';
}
