// SUDOKU

// 2014 - Einar Egilsson

// This sudoku library is based HEAVILY on Peter Norvig's excellent Sudoku solver,
// available at http://norvig.com/sudoku.html.

// This library contains a solver, generator, serialization of puzzles
// and methods to get conflicts and hints for puzzles that are in progress.
// For a completely straight port of Norvig's solver, look at
// https://github.com/einaregilsson/sudoku.js/sudoku-norvig.js

// To see a better explanation of this library, look at the blog post
// at http://einaregilsson.com/sudoku and to see it in action try
// my Sudoku game at http://www.sudoku-webgame.com

// Start by setting up some basic datastructures and connections
// between them. Each row is numbered from 1-9, each column
// from A-I. Each square has an id like E4.

// Throughout this library we will often use the following variable names:

//    d - digit
//    r - row
//    c - column
//    s - square, e.g. E5
//    u - unit, e.g. one whole row, column or box of squares.

type Square = string;
type Digit = string;
type Row = string;
type Column = string;
type Unit = Square[];
type Grid = Record<Square, Digit>;
type Values = Record<Square, string>;

interface HintError {
	type: 'error';
	square: Square;
}

interface HintSquare {
	type: 'squarehint';
	square: Square;
}

interface HintUnit {
	type: 'unithint';
	unitType: 'row' | 'column' | 'box';
	unit: Unit;
	digit: Digit;
}

interface HintDontKnow {
	type: 'dontknow';
	squares: Values;
}

type Hint = HintError | HintSquare | HintUnit | HintDontKnow;

interface Conflict {
	unit: Unit;
	errorFields: Square[];
}

interface SolverOptions {
	chooseDigit?: 'min' | 'max' | 'random';
	chooseSquare?: 'minDigits' | 'maxDigits' | 'random';
}

type Difficulty = 'easy' | 'medium' | 'hard';

const ROWS: Row[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const COLS: Column[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const DIGITS = '123456789';
const SQUARES: Square[] = cross(COLS, ROWS); //Simple list of all squares, [A1, A2, ..., I9]
const UNITLIST: Unit[] = []; //List of all units. Each unit contains 9 squares. [ [A1,A2,...A9], [B1,B2,...,B9]...]
const UNITS: Record<Square, Unit[]> = {}; //Units organized by square. UNITS['A1'] = [ ['A1'...'A9'], ['A1'...'I1'], ['A1'...'C3']]
const PEERS: Record<Square, Square[]> = {}; //For each square, the list of other square that share a unit with it. PEERS['A1'] = ['A1', 'A2' ... 'H1','I1']

for (let i = 0; i < ROWS.length; i++) {
	UNITLIST.push(cross(COLS, [ROWS[i]]));
}

for (let i = 0; i < COLS.length; i++) {
	UNITLIST.push(cross([COLS[i]], ROWS));
}

const groupCols = ['ABC', 'DEF', 'GHI'];
const groupRows = ['123', '456', '789'];
for (let c = 0; c < groupCols.length; c++) {
	for (let r = 0; r < groupRows.length; r++) {
		UNITLIST.push(cross(chars(groupCols[c]), chars(groupRows[r])));
	}
}

for (let i = 0; i < SQUARES.length; i++) {
	const square = SQUARES[i];
	const squarePeers: Square[] = [];
	const squareUnits: Unit[] = [];

	for (let j = 0; j < UNITLIST.length; j++) {
		const unit = UNITLIST[j];
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

///// Utility methods. /////

//Array.indexOf is not supported in old IEs
function vals<T>(obj: Record<string, T>): T[] {
	const result: T[] = [];
	for (const key in obj) {
		result.push(obj[key]);
	}
	return result;
}

function keys<T>(obj: Record<string, T>): string[] {
	const result: string[] = [];
	for (const key in obj) {
		result.push(key);
	}
	return result;
}

function each<T>(list: T[], func: (item: T, index?: number) => void): void {
	for (let i = 0; i < list.length; i++) {
		func(list[i], i);
	}
}

function dict<T>(keys: string[], values: T[]): Record<string, T> {
	const result: Record<string, T> = {};
	each(keys, (key, i) => {
		result[key] = values[i!];
	});
	return result;
}

function print(s: string): void {
	console.log(s + '\r\n');
}

function all<T>(list: T[], func: (item: T) => boolean): boolean {
	for (let i = 0; i < list.length; i++) {
		if (!func(list[i])) {
			return false;
		}
	}
	return true;
}

function any<T>(list: T[], func: (item: T) => any): any {
	for (let i = 0; i < list.length; i++) {
		const result = func(list[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

function filter<T>(list: T[], func: (item: T, index?: number) => boolean): T[] {
	const result: T[] = [];
	for (let i = 0; i < list.length; i++) {
		if (func(list[i], i)) {
			result.push(list[i]);
		}
	}
	return result;
}

function sum(list: (number | boolean)[]): number {
	let result = 0;
	each(list, (l) => {
		if (typeof l === 'number') {
			result += l;
		} else if (typeof l === 'boolean') {
			result += l ? 1 : 0;
		} else {
			throw 'Only numbers and booleans supported';
		}
	});
	return result;
}

function some<T>(seq: T[], func: (item: T) => any): any {
	//Return some element of seq that is true.
	for (let i = 0; i < seq.length; i++) {
		const result = func(seq[i]);
		if (result) {
			return result;
		}
	}
	return false;
}

function first<T>(list: T[], func: (item: T, index?: number) => boolean): T | null {
	for (let i = 0; i < list.length; i++) {
		if (func(list[i], i)) {
			return list[i];
		}
	}
	return null;
}

function map<T, U>(list: T[], expr: (value: T) => U): U[] {
	const result: U[] = [];
	each(list, (value) => {
		result.push(expr(value));
	});
	return result;
}

function max(list: number[]): number {
	let maxValue: number | undefined;
	each(list, (value) => {
		if (typeof maxValue === 'undefined' || value > maxValue) {
			maxValue = value;
		}
	});
	return maxValue!;
}

function min(list: number[]): number {
	let minValue: number | undefined;
	each(list, (value) => {
		if (typeof minValue === 'undefined' || value < minValue) {
			minValue = value;
		}
	});
	return minValue!;
}

function randomElement<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

//Array.indexOf is not supported in old IEs
function contains<T>(list: T[], val: T): boolean {
	return any(list, (x: T) => x === val);
}

function set<T>(list: T[]): T[] {
	const result: T[] = [];
	each(list, (val) => {
		if (!contains(result, val)) {
			result.push(val);
		}
	});
	return result;
}

function concat<T>(...arrays: T[][]): T[] {
	return Array.prototype.concat.apply([], arrays);
}

function repeat(str: string, times: number): string {
	return Array(times + 1).join(str);
}

function center(str: string, width: number): string {
	const pad = width - str.length;
	if (pad <= 0) {
		return str;
	}
	return (
		repeat(' ', Math.floor(pad / 2)) + str + repeat(' ', Math.ceil(pad / 2))
	);
}

function copy(board: Values): Values {
	return dict(keys(board), vals(board));
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(seq: T[]): T[] {
	//Return a randomly shuffled copy of the input sequence.
	seq = map(seq, (x) => x);
	//Fisher yates shuffle
	let i = seq.length;
	while (--i) {
		const j = Math.floor(Math.random() * (i + 1));
		const ival = seq[i];
		const jval = seq[j];
		seq[i] = jval;
		seq[j] = ival;
	}

	return seq;
}

function range(count: number): number[] {
	const result: number[] = [];
	for (let i = 0; i < count; i++) {
		result.push(i);
	}
	return result;
}

function chars(s: string): string[] {
	const result: string[] = [];
	for (let i = 0; i < s.length; i++) {
		result.push(s.charAt(i));
	}
	return result;
}

function cross(a: string[], b: string[]): string[] {
	const result: string[] = [];
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			result.push(a[i] + b[j]);
		}
	}
	return result;
}

function getHint(puzzle: string | Grid, values: Values): Hint {
	if (!values) {
		throw { message: 'Values must be sent in' };
	}
	const solved = solve(puzzle);

	if (!solved) {
		throw { message: 'Failed to solve puzzle' };
	}

	const errorSquares: Square[] = [];
	// 1. Check if there are any wrong fields, Hint about those first
	for (const s in values) {
		const guess = values[s];
		if (guess && guess !== solved[s]) {
			errorSquares.push(s);
		}
	}

	if (errorSquares.length > 0) {
		return {
			type: 'error',
			square: randomElement(errorSquares),
		};
	}

	// 2. Find a field that has only one possibility and give a hint about that.
	const elimValues: Values = {};
	for (const s in solved) {
		elimValues[s] = DIGITS;
	}

	// One round of elimination only
	for (const s in values) {
		elimValues[s] = values[s];
		const digit = values[s];
		for (let i = 0; i < PEERS[s].length; i++) {
			const elimSquare = PEERS[s][i];
			elimValues[elimSquare] = elimValues[elimSquare].replace(digit, '');
		}
	}

	const hintSquares: Square[] = [];
	for (const s in elimValues) {
		if (elimValues[s].length === 1 && !values[s]) {
			hintSquares.push(s);
		}
	}
	if (hintSquares.length > 0) {
		return {
			type: 'squarehint',
			square: randomElement(hintSquares),
		};
	}

	const unitHints: HintUnit[] = [];
	// 3. Is there a unit where one digit is only a possibility in one square?
	for (const s in elimValues) {
		const value = elimValues[s];
		if (value.length === 1) {
			continue;
		}
		const units = UNITS[s];
		for (let i = 0; i < value.length; i++) {
			const d = value.charAt(i);
			for (let u = 0; u < units.length; u++) {
				const unit = units[u];
				if (
					all(unit, (s2) => {
						return s2 === s || elimValues[s2].indexOf(d) === -1;
					})
				) {
					let unitType: 'row' | 'column' | 'box' = 'box';
					if (unit[0].charAt(0) === unit[8].charAt(0)) {
						unitType = 'row';
					} else if (unit[0].charAt(1) === unit[8].charAt(1)) {
						unitType = 'column';
					}
					unitHints.push({
						type: 'unithint',
						unitType: unitType,
						unit: unit,
						digit: d,
					});
				}
			}
		}
	}

	if (unitHints.length > 0) {
		return randomElement(unitHints);
	}

	return {
		type: 'dontknow',
		squares: elimValues,
	};
}

function getConflicts(values: Values): Conflict[] {
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

function solve(grid: string | Grid, options?: SolverOptions): Values | false {
	return search(parseGrid(grid), options);
}

function search(values: Values | false, options?: SolverOptions): Values | false {
	const opts: SolverOptions = options || {};
	opts.chooseDigit = opts.chooseDigit || 'random';
	opts.chooseSquare = opts.chooseSquare || 'minDigits';

	//Using depth-first search and propagation, try all possible values."
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
	} else if (opts.chooseSquare === 'random') {
		s = candidates[Math.floor(Math.random() * candidates.length)];
	} else {
		s = candidates[0]; // fallback
	}

	let digitsLeft = chars(values[s]);
	if (opts.chooseDigit === 'max') {
		digitsLeft.reverse();
	} else if (opts.chooseDigit === 'random') {
		digitsLeft = shuffle(digitsLeft);
	}

	return some(digitsLeft, (d) => {
		return search(assign(copy(values), s, d), opts);
	});
}

function isUnique(grid: string | Grid): boolean {
	const input = typeof grid === 'string' ? gridValues(grid) : grid;

	const solved1 = solve(input, { chooseDigit: 'min' });
	const solved2 = solve(input, { chooseDigit: 'max' });
	if (!solved1 || !solved2) {
		throw 'Failed to solve';
	}

	for (const s in solved1) {
		if (solved2[s] !== solved1[s]) {
			return false;
		}
	}
	return true;
}

function serialize(values: Values): string {
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

function deserialize(serialized: string): Values {
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

function isSolvableWithElimination(grid: string | Grid): boolean {
	return isSolved(parseGrid(grid));
}

function isSolved(values: Values | false): boolean {
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

function squareCount(difficulty: Difficulty): number {
	if (difficulty === 'easy') {
		return 35;
	} else if (difficulty === 'medium') {
		return 28;
	}
	return 20;
}

function generate(difficulty?: Difficulty): Grid {
	const start = new Date().getTime();
	const minSquares = squareCount(difficulty || 'easy');

	const fullGrid = solve({});
	if (!fullGrid) {
		throw new Error('Failed to generate full grid');
	}
	
	let generatedGrid = copy(fullGrid);
	const shuffledSquares = shuffle(SQUARES);
	let filledSquares = shuffledSquares.length;

	for (let i = 0; i < shuffledSquares.length; i++) {
		const s = shuffledSquares[i];

		delete generatedGrid[s];
		filledSquares--;
		if (
			!isSolvableWithElimination(generatedGrid) ||
			!isUnique(generatedGrid)
		) {
			generatedGrid[s] = fullGrid[s];
			filledSquares++;
		}

		if (filledSquares === minSquares) {
			break;
		}
	}
	const time = new Date().getTime() - start;
	debug(
		'Generated puzzle with ' +
			keys(generatedGrid).length +
			' squares in ' +
			time +
			'ms',
	);
	return generatedGrid;
}

function parseGrid(grid: string | Grid): Values | false {
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

function gridValues(grid: string): Grid {
	//Convert grid into a dict of {square: char} with '0' or '.' for empties.
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

//################ Constraint Propagation ################

function assign(values: Values, s: Square, d: Digit): Values | false {
	//Eliminate all the other values (except d) from values[s] and propagate.
	//Return values, except return false if a contradiction is detected.
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

function eliminate(values: Values, s: Square, d: Digit): Values | false {
	//Eliminate d from values[s]; propagate when values or places <= 2.
	//return values, except return false if a contradiction is detected.

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

const sudoku = {
	solve,
	getConflicts,
	getHint,
	isUnique,
	generate,
	serialize,
	deserialize,
	debug: false,
	test: parseGrid,
	unitList: UNITLIST,
};

function debug(msg: string): void {
	if (sudoku.debug) {
		print(msg);
	}
}

export type { Square, Digit, Row, Column, Unit, Grid, Values, Hint, HintError, HintSquare, HintUnit, HintDontKnow, Conflict, SolverOptions, Difficulty };

export default sudoku;
