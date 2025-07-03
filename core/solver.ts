// SUDOKU CORE SOLVER

import type {
	Square,
	Digit,
	Grid,
	Values,
	SolverOptions,
	Conflict,
} from '../types.js';
import {
	SQUARES,
	DIGITS,
	UNITS,
	PEERS,
	chars,
	all,
	filter,
	each,
	randomElement,
	copy,
	keys,
	vals,
	dict,
} from './utils.js';

/**
 * Solve a sudoku puzzle using constraint propagation and search
 */
export function solve(
	grid: string | Grid,
	options?: SolverOptions,
): Values | false {
	return search(parseGrid(grid), options);
}

/**
 * Parse a grid into the internal Values format
 */
export function parseGrid(grid: string | Grid): Values | false {
	//Convert grid to a dict of possible values, {square: digits}, or
	//return false if a contradiction is detected

	// To start, every square can be any digit; then assign values from the grid.
	const values: Values = {};
	each(SQUARES, (s) => {
		values[s] = DIGITS;
	});

	const input = typeof grid === 'string' ? gridValues(grid) : grid;
	for (const s in input) {
		const d = input[s];
		if (!assign(values, s, d)) {
			return false; // (Fail if we can't assign d to square s.)
		}
	}
	return values;
}

/**
 * Convert grid string into a dict of {square: char} with '0' or '.' for empties
 */
export function gridValues(grid: string): Grid {
	grid = grid.replace(/[^0-9\.]/g, '');
	const input: Grid = {};
	for (let i = 0; i < SQUARES.length; i++) {
		const val = grid[i];
		if (DIGITS.indexOf(val) !== -1) {
			input[SQUARES[i]] = val;
		}
	}
	return input;
}

/**
 * Using depth-first search and propagation, try all possible values
 */
function search(
	values: Values | false,
	options?: SolverOptions,
): Values | false {
	const opts: SolverOptions = options || {};
	opts.chooseDigit = opts.chooseDigit || 'random';
	opts.chooseSquare = opts.chooseSquare || 'minDigits';

	if (values === false) {
		return false; //Failed earlier
	}

	if (
		all(SQUARES, (s) => {
			return values[s].length === 1;
		})
	) {
		return values; // Solved!
	}

	//Chose the unfilled square s with the fewest possibilities
	let candidates = filter(SQUARES, (s) => {
		return values[s].length > 1;
	});
	candidates.sort((s1, s2) => {
		if (values[s1].length !== values[s2].length) {
			return values[s1].length - values[s2].length;
		}
		if (s1 < s2) {
			return -1;
		} else {
			return 1;
		}
	});

	let s: Square;
	if (opts.chooseSquare === 'minDigits') {
		s = candidates[0];
	} else if (opts.chooseSquare === 'maxDigits') {
		s = candidates[candidates.length - 1];
	} else {
		s = randomElement(candidates);
	}

	let digits = values[s];
	if (opts.chooseDigit === 'max') {
		digits = digits.split('').sort().reverse().join('');
	} else if (opts.chooseDigit === 'min') {
		digits = digits.split('').sort().join('');
	} else {
		// random
		const digitArray = digits.split('');
		for (let i = digitArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[digitArray[i], digitArray[j]] = [digitArray[j], digitArray[i]];
		}
		digits = digitArray.join('');
	}

	for (let di = 0; di < digits.length; di++) {
		const d = digits.charAt(di);
		const result = search(assign(copy(values), s, d), options);
		if (result !== false) {
			return result;
		}
	}
	return false;
}

/**
 * Eliminate all the other values (except d) from values[s] and propagate
 */
function assign(values: Values, s: Square, d: Digit): Values | false {
	const otherValues = values[s].replace(d, '');
	if (
		all(chars(otherValues), (d2) => {
			return !!eliminate(values, s, d2);
		})
	) {
		return values;
	} else {
		return false;
	}
}

/**
 * Eliminate d from values[s]; propagate when values or places <= 2
 */
function eliminate(values: Values, s: Square, d: Digit): Values | false {
	if (values[s].indexOf(d) === -1) {
		return values; //Already eliminated
	}

	values[s] = values[s].replace(d, '');
	// (1) If a square s is reduced to one value d2, then eliminate d2 from the peers.
	if (values[s].length === 0) {
		return false; //Contradiction: removed last value
	} else if (values[s].length === 1) {
		const d2 = values[s];
		if (
			!all(PEERS[s], (s2) => {
				return !!eliminate(values, s2, d2);
			})
		) {
			return false;
		}
	}
	// (2) If a unit u is reduced to only one place for a value d, then put it there.
	for (let i = 0; i < UNITS[s].length; i++) {
		const u = UNITS[s][i];
		const dplaces = filter(u, (s2) => {
			return values[s2].indexOf(d) !== -1;
		});
		if (dplaces.length === 0) {
			return false; //Contradiction: no place for this value
		} else if (dplaces.length === 1) {
			// d can only be in one place in unit; assign it there
			if (!assign(values, dplaces[0], d)) {
				return false;
			}
		}
	}

	return values;
}

/**
 * Check if a puzzle is uniquely solvable
 */
export function isUnique(grid: string | Grid): boolean {
	const input = typeof grid === 'string' ? gridValues(grid) : grid;

	const solved1 = solve(input, { chooseDigit: 'min' });
	const solved2 = solve(input, { chooseDigit: 'max' });
	if (!solved1 || !solved2) {
		throw new Error('Failed to solve');
	}

	for (const s in solved1) {
		if (solved2[s] !== solved1[s]) {
			return false;
		}
	}
	return true;
}

/**
 * Get conflicts in the current values
 */
export function getConflicts(values: Values): Conflict[] {
	const errors: Conflict[] = [];
	for (const key in values) {
		const value = values[key] + '';
		if (!value || value.length > 1) {
			continue;
		}

		const units = UNITS[key];
		for (let i = 0; i < UNITS[key].length; i++) {
			const unit = UNITS[key][i];
			for (let j = 0; j < unit.length; j++) {
				const otherKey = unit[j];
				const otherValue = values[otherKey] + '';

				if (otherKey !== key && value === otherValue) {
					errors.push({
						unit: unit,
						errorFields: [key, otherKey],
					});
				}
			}
		}
	}
	return errors;
}

/**
 * Check if values represent a solved puzzle
 */
export function isSolved(values: Values | false): boolean {
	if (values === false) {
		return false;
	}
	for (const s in values) {
		if (values[s].length > 1) {
			return false;
		}
	}
	return true;
}

/**
 * Check if a puzzle can be solved with constraint propagation alone
 */
export function isSolvableWithElimination(grid: string | Grid): boolean {
	return isSolved(parseGrid(grid));
}

/**
 * Serialize a solved puzzle to a compact string
 */
export function serialize(values: Values): string {
	let serialized = '';
	for (let i = 0; i < SQUARES.length; i++) {
		serialized += values[SQUARES[i]] || 'x';
	}
	serialized = serialized
		.replace(/xxxxxx/g, 'f')
		.replace(/xxxxx/g, 'e')
		.replace(/xxxx/g, 'd')
		.replace(/xxx/g, 'c')
		.replace(/xx/g, 'b')
		.replace(/x/g, 'a');
	return serialized;
}

/**
 * Deserialize a compact string back to values
 */
export function deserialize(serialized: string): Values {
	const values: Values = {};
	serialized = serialized
		.replace(/f/g, 'xxxxxx')
		.replace(/e/g, 'xxxxx')
		.replace(/d/g, 'xxxx')
		.replace(/c/g, 'xxx')
		.replace(/b/g, 'xx')
		.replace(/a/g, 'x');

	for (let i = 0; i < SQUARES.length; i++) {
		if (serialized.charAt(i) !== 'x') {
			values[SQUARES[i]] = serialized.charAt(i);
		}
	}
	return values;
}
