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

// Basic utility functions
export function vals<T>(obj: Record<string, T>): T[] {
	const result: T[] = [];
	for (const key in obj) {
		result.push(obj[key]);
	}
	return result;
}

export function keys<T>(obj: Record<string, T>): string[] {
	const result: string[] = [];
	for (const key in obj) {
		result.push(key);
	}
	return result;
}

export function each<T>(
	list: T[],
	func: (item: T, index?: number) => void,
): void {
	for (let i = 0; i < list.length; i++) {
		func(list[i], i);
	}
}

export function dict<T>(keys: string[], values: T[]): Record<string, T> {
	const result: Record<string, T> = {};
	each(keys, (key, i) => {
		result[key] = values[i!];
	});
	return result;
}

export function print(s: string): void {
	console.log(s + '\r\n');
}

export function all<T>(list: T[], func: (item: T) => boolean): boolean {
	for (let i = 0; i < list.length; i++) {
		if (!func(list[i])) {
			return false;
		}
	}
	return true;
}

export function any<T>(list: T[], func: (item: T) => any): any {
	for (let i = 0; i < list.length; i++) {
		const result = func(list[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

export function filter<T>(
	list: T[],
	func: (item: T, index?: number) => boolean,
): T[] {
	const result: T[] = [];
	for (let i = 0; i < list.length; i++) {
		if (func.length > 1) {
			if (func(list[i], i)) {
				result.push(list[i]);
			}
		} else if (func(list[i])) {
			result.push(list[i]);
		}
	}
	return result;
}

export function sum(list: (number | boolean)[]): number {
	let result = 0;
	each(list, (l) => {
		if (typeof l === 'number') {
			result += l;
		} else if (typeof l === 'boolean') {
			result += l ? 1 : 0;
		} else {
			throw new Error('Only numbers and booleans supported');
		}
	});
	return result;
}

export function some<T>(seq: T[], func: (item: T) => any): any {
	for (let i = 0; i < seq.length; i++) {
		const result = func(seq[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

export function map<T, U>(list: T[], expr: (value: T) => U): U[] {
	const result: U[] = [];
	each(list, (value) => {
		result.push(expr(value));
	});
	return result;
}

export function max(list: number[]): number {
	let result = list[0];
	for (let i = 1; i < list.length; i++) {
		if (list[i] > result) {
			result = list[i];
		}
	}
	return result;
}

export function min(list: number[]): number {
	let result = list[0];
	for (let i = 1; i < list.length; i++) {
		if (list[i] < result) {
			result = list[i];
		}
	}
	return result;
}

export function randomElement<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

export function contains<T>(list: T[], val: T): boolean {
	return list.indexOf(val) !== -1;
}

export function set<T>(list: T[]): T[] {
	const result: T[] = [];
	each(list, (val) => {
		if (!contains(result, val)) {
			result.push(val);
		}
	});
	return result;
}

export function concat<T>(...arrays: T[][]): T[] {
	return Array.prototype.concat.apply([], arrays);
}

export function repeat(str: string, times: number): string {
	return Array(times + 1).join(str);
}

export function center(str: string, width: number): string {
	const pad = width - str.length;
	if (pad <= 0) {
		return str;
	}
	return (
		repeat(' ', Math.floor(pad / 2)) + str + repeat(' ', Math.ceil(pad / 2))
	);
}

export function copy(board: Values): Values {
	return dict(keys(board), vals(board));
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(seq: T[]): T[] {
	const result = [...seq];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function range(count: number): number[] {
	const result: number[] = [];
	for (let i = 0; i < count; i++) {
		result.push(i);
	}
	return result;
}

export function chars(s: string): string[] {
	const result: string[] = [];
	for (let i = 0; i < s.length; i++) {
		result.push(s.charAt(i));
	}
	return result;
}

export function cross(a: string[], b: string[]): string[] {
	const result: string[] = [];
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			result.push(a[i] + b[j]);
		}
	}
	return result;
}

// Generate the core data structures
export const SQUARES: Square[] = cross(ROWS, COLS);
export const UNIT_LIST: Unit[] = [];
export const UNITS: Record<Square, Unit[]> = {};
export const PEERS: Record<Square, Square[]> = {};

// Initialize unit list
for (let i = 0; i < ROWS.length; i++) {
	UNIT_LIST.push(cross([ROWS[i]], COLS));
}

for (let i = 0; i < COLS.length; i++) {
	UNIT_LIST.push(cross(ROWS, [COLS[i]]));
}

const groupCols = ['123', '456', '789'];
const groupRows = ['ABC', 'DEF', 'GHI'];
for (let c = 0; c < groupCols.length; c++) {
	for (let r = 0; r < groupRows.length; r++) {
		UNIT_LIST.push(cross(chars(groupRows[r]), chars(groupCols[c])));
	}
}

// Initialize units and peers for each square
for (let i = 0; i < SQUARES.length; i++) {
	const square = SQUARES[i];
	const squarePeers: Square[] = [];
	const squareUnits: Unit[] = [];

	for (let j = 0; j < UNIT_LIST.length; j++) {
		const unit = UNIT_LIST[j];
		if (contains(unit, square)) {
			squareUnits.push(unit);
			for (let k = 0; k < unit.length; k++) {
				if (!contains(squarePeers, unit[k]) && unit[k] !== square) {
					squarePeers.push(unit[k]);
				}
			}
		}
	}
	UNITS[square] = squareUnits;
	PEERS[square] = squarePeers;
}

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
