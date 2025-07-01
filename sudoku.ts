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
type Candidates = Record<Square, Set<Digit>>;

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

// ============ NEW HINT DETECTION FUNCTIONS ============

// STAGE 1: MISTAKE DETECTION

/**
 * Detects values that are placed incorrectly (don't match the solution)
 */
function detectIncorrectValues(puzzle: string | Grid, values: Values): { square: Square; actualValue: Digit; correctValue: Digit }[] {
	const solved = solve(puzzle);
	if (!solved) {
		return [];
	}

	const mistakes: { square: Square; actualValue: Digit; correctValue: Digit }[] = [];
	
	for (const square in values) {
		const guess = values[square];
		if (guess && guess.length === 1 && guess !== solved[square]) {
			mistakes.push({
				square,
				actualValue: guess,
				correctValue: solved[square]
			});
		}
	}
	
	return mistakes;
}

/**
 * Detects cells that are missing candidates for their correct solution digit
 */
function detectMissingCandidates(puzzle: string | Grid, values: Values, candidates: Candidates): { square: Square; missingDigit: Digit }[] {
	const solved = solve(puzzle);
	if (!solved) {
		return [];
	}

	const missingCandidates: { square: Square; missingDigit: Digit }[] = [];
	
	for (const square in solved) {
		// Skip cells that already have values
		if (values[square] && values[square].length === 1) {
			continue;
		}
		
		const correctDigit = solved[square];
		const cellCandidates = candidates[square] || new Set();
		
		if (!cellCandidates.has(correctDigit)) {
			missingCandidates.push({
				square,
				missingDigit: correctDigit
			});
		}
	}
	
	return missingCandidates;
}

// STAGE 2: TRIVIAL HINTS

/**
 * Detects cells that are the last remaining empty cell in a box
 */
function detectLastRemainingInBox(values: Values): { square: Square; digit: Digit; unit: Unit }[] {
	const results: { square: Square; digit: Digit; unit: Unit }[] = [];
	
	// Check each 3x3 box
	const groupCols = ['ABC', 'DEF', 'GHI'];
	const groupRows = ['123', '456', '789'];
	
	for (let c = 0; c < groupCols.length; c++) {
		for (let r = 0; r < groupRows.length; r++) {
			const boxSquares = cross(chars(groupCols[c]), chars(groupRows[r]));
			const emptyCells = boxSquares.filter(square => !values[square] || values[square].length > 1);
			
			if (emptyCells.length === 1) {
				const square = emptyCells[0];
				const usedDigits = new Set<Digit>();
				
				// Find all digits already used in this box
				for (const boxSquare of boxSquares) {
					if (values[boxSquare] && values[boxSquare].length === 1) {
						usedDigits.add(values[boxSquare]);
					}
				}
				
				// The missing digit must go in the empty cell
				for (const digit of DIGITS) {
					if (!usedDigits.has(digit)) {
						results.push({
							square,
							digit,
							unit: boxSquares
						});
						break;
					}
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects cells that are the last remaining empty cell in a row
 */
function detectLastRemainingInRow(values: Values): { square: Square; digit: Digit; unit: Unit }[] {
	const results: { square: Square; digit: Digit; unit: Unit }[] = [];
	
	for (const row of ROWS) {
		const rowSquares = cross(COLS, [row]);
		const emptyCells = rowSquares.filter(square => !values[square] || values[square].length > 1);
		
		if (emptyCells.length === 1) {
			const square = emptyCells[0];
			const usedDigits = new Set<Digit>();
			
			// Find all digits already used in this row
			for (const rowSquare of rowSquares) {
				if (values[rowSquare] && values[rowSquare].length === 1) {
					usedDigits.add(values[rowSquare]);
				}
			}
			
			// The missing digit must go in the empty cell
			for (const digit of DIGITS) {
				if (!usedDigits.has(digit)) {
					results.push({
						square,
						digit,
						unit: rowSquares
					});
					break;
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects cells that are the last remaining empty cell in a column
 */
function detectLastRemainingInColumn(values: Values): { square: Square; digit: Digit; unit: Unit }[] {
	const results: { square: Square; digit: Digit; unit: Unit }[] = [];
	
	for (const col of COLS) {
		const colSquares = cross([col], ROWS);
		const emptyCells = colSquares.filter(square => !values[square] || values[square].length > 1);
		
		if (emptyCells.length === 1) {
			const square = emptyCells[0];
			const usedDigits = new Set<Digit>();
			
			// Find all digits already used in this column
			for (const colSquare of colSquares) {
				if (values[colSquare] && values[colSquare].length === 1) {
					usedDigits.add(values[colSquare]);
				}
			}
			
			// The missing digit must go in the empty cell
			for (const digit of DIGITS) {
				if (!usedDigits.has(digit)) {
					results.push({
						square,
						digit,
						unit: colSquares
					});
					break;
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects naked singles - cells that have only one possible digit
 */
function detectNakedSingles(candidates: Candidates): { square: Square; digit: Digit }[] {
	const results: { square: Square; digit: Digit }[] = [];
	
	for (const square in candidates) {
		const cellCandidates = candidates[square];
		if (cellCandidates && cellCandidates.size === 1) {
			const digit = Array.from(cellCandidates)[0] as Digit;
			results.push({ square, digit });
		}
	}
	
	return results;
}

// STAGE 3: BASIC HINTS

/**
 * Detects naked pairs - two cells in the same unit that have exactly the same two candidates
 */
function detectNakedPairs(candidates: Candidates): { squares: [Square, Square]; digits: [Digit, Digit]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square]; digits: [Digit, Digit]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const emptyCells = unit.filter(square => candidates[square] && candidates[square].size > 0);
		
		// Check all pairs of empty cells
		for (let i = 0; i < emptyCells.length; i++) {
			for (let j = i + 1; j < emptyCells.length; j++) {
				const square1 = emptyCells[i];
				const square2 = emptyCells[j];
				const cands1 = candidates[square1];
				const cands2 = candidates[square2];
				
				// Both cells must have exactly 2 candidates and they must be identical
				if (cands1.size === 2 && cands2.size === 2) {
					const candidates1 = Array.from(cands1).sort() as [Digit, Digit];
					const candidates2 = Array.from(cands2).sort() as [Digit, Digit];
					
					if (candidates1[0] === candidates2[0] && candidates1[1] === candidates2[1]) {
						let unitType = 'box';
						if (unit[0].charAt(1) === unit[8].charAt(1)) {
							unitType = 'column';
						} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
							unitType = 'row';
						}
						
						results.push({
							squares: [square1, square2],
							digits: candidates1,
							unit,
							unitType
						});
					}
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects naked triples - three cells in the same unit that collectively have only three possible digits
 */
function detectNakedTriples(candidates: Candidates): { squares: [Square, Square, Square]; digits: Digit[]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square, Square]; digits: Digit[]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const cellsWithFewCandidates = unit.filter(square => candidates[square] && candidates[square].size >= 2 && candidates[square].size <= 3);
		
		// Check all combinations of 3 cells
		for (let i = 0; i < cellsWithFewCandidates.length; i++) {
			for (let j = i + 1; j < cellsWithFewCandidates.length; j++) {
				for (let k = j + 1; k < cellsWithFewCandidates.length; k++) {
					const square1 = cellsWithFewCandidates[i];
					const square2 = cellsWithFewCandidates[j];
					const square3 = cellsWithFewCandidates[k];
					
					const combinedCandidates = new Set([
						...Array.from(candidates[square1]),
						...Array.from(candidates[square2]),
						...Array.from(candidates[square3])
					]);
					
					// Check if the combined candidates contain exactly 3 digits
					if (combinedCandidates.size === 3) {
						let unitType = 'box';
						if (unit[0].charAt(1) === unit[8].charAt(1)) {
							unitType = 'column';
						} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
							unitType = 'row';
						}
						
						results.push({
							squares: [square1, square2, square3],
							digits: Array.from(combinedCandidates).sort() as Digit[],
							unit,
							unitType
						});
					}
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects naked quads - four cells in the same unit that collectively have only four possible digits
 */
function detectNakedQuads(candidates: Candidates): { squares: [Square, Square, Square, Square]; digits: Digit[]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square, Square, Square]; digits: Digit[]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const cellsWithFewCandidates = unit.filter(square => candidates[square] && candidates[square].size >= 2 && candidates[square].size <= 4);
		
		// Check all combinations of 4 cells
		for (let i = 0; i < cellsWithFewCandidates.length; i++) {
			for (let j = i + 1; j < cellsWithFewCandidates.length; j++) {
				for (let k = j + 1; k < cellsWithFewCandidates.length; k++) {
					for (let l = k + 1; l < cellsWithFewCandidates.length; l++) {
						const square1 = cellsWithFewCandidates[i];
						const square2 = cellsWithFewCandidates[j];
						const square3 = cellsWithFewCandidates[k];
						const square4 = cellsWithFewCandidates[l];
						
						const combinedCandidates = new Set([
							...Array.from(candidates[square1]),
							...Array.from(candidates[square2]),
							...Array.from(candidates[square3]),
							...Array.from(candidates[square4])
						]);
						
						// Check if the combined candidates contain exactly 4 digits
						if (combinedCandidates.size === 4) {
							let unitType = 'box';
							if (unit[0].charAt(1) === unit[8].charAt(1)) {
								unitType = 'column';
							} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
								unitType = 'row';
							}
							
							results.push({
								squares: [square1, square2, square3, square4],
								digits: Array.from(combinedCandidates).sort() as Digit[],
								unit,
								unitType
							});
						}
					}
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects hidden pairs - two digits that can only appear in two cells within a unit
 */
function detectHiddenPairs(candidates: Candidates): { squares: [Square, Square]; digits: [Digit, Digit]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square]; digits: [Digit, Digit]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const digitPositions: Record<Digit, Square[]> = {};
		
		// Map each digit to the squares where it can appear in this unit
		for (const square of unit) {
			if (candidates[square]) {
				for (const digit of Array.from(candidates[square])) {
					if (!digitPositions[digit]) {
						digitPositions[digit] = [];
					}
					digitPositions[digit].push(square);
				}
			}
		}
		
		// Find pairs of digits that each appear in exactly the same two squares
		const digits = Object.keys(digitPositions);
		for (let i = 0; i < digits.length; i++) {
			for (let j = i + 1; j < digits.length; j++) {
				const digit1 = digits[i];
				const digit2 = digits[j];
				const positions1 = digitPositions[digit1];
				const positions2 = digitPositions[digit2];
				
				if (positions1 && positions2 && positions1.length === 2 && positions2.length === 2 &&
					positions1[0] === positions2[0] && positions1[1] === positions2[1]) {
					
					let unitType = 'box';
					if (unit[0].charAt(1) === unit[8].charAt(1)) {
						unitType = 'column';
					} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
						unitType = 'row';
					}
					
					results.push({
						squares: [positions1[0], positions1[1]],
						digits: [digit1, digit2],
						unit,
						unitType
					});
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects hidden triples - three digits that can only appear in three cells within a unit
 */
function detectHiddenTriples(candidates: Candidates): { squares: [Square, Square, Square]; digits: [Digit, Digit, Digit]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square, Square]; digits: [Digit, Digit, Digit]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const digitPositions: Record<Digit, Square[]> = {};
		
		// Map each digit to the squares where it can appear in this unit
		for (const square of unit) {
			if (candidates[square]) {
				for (const digit of Array.from(candidates[square])) {
					if (!digitPositions[digit]) {
						digitPositions[digit] = [];
					}
					digitPositions[digit].push(square);
				}
			}
		}
		
		// Find triples of digits that collectively appear in exactly the same three squares
		const digits = Object.keys(digitPositions);
		for (let i = 0; i < digits.length; i++) {
			for (let j = i + 1; j < digits.length; j++) {
				for (let k = j + 1; k < digits.length; k++) {
					const digit1 = digits[i];
					const digit2 = digits[j];
					const digit3 = digits[k];
					
					const allPositions = new Set([
						...(digitPositions[digit1] || []),
						...(digitPositions[digit2] || []),
						...(digitPositions[digit3] || [])
					]);
					
					// Check if these three digits appear in exactly three squares
					if (allPositions.size === 3 &&
						digitPositions[digit1] && digitPositions[digit1].length <= 3 &&
						digitPositions[digit2] && digitPositions[digit2].length <= 3 &&
						digitPositions[digit3] && digitPositions[digit3].length <= 3) {
						
						let unitType = 'box';
						if (unit[0].charAt(1) === unit[8].charAt(1)) {
							unitType = 'column';
						} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
							unitType = 'row';
						}
						
						const squareArray = Array.from(allPositions);
						results.push({
							squares: [squareArray[0], squareArray[1], squareArray[2]],
							digits: [digit1, digit2, digit3],
							unit,
							unitType
						});
					}
				}
			}
		}
	}
	
	return results;
}

/**
 * Detects hidden quads - four digits that can only appear in four cells within a unit
 */
function detectHiddenQuads(candidates: Candidates): { squares: [Square, Square, Square, Square]; digits: [Digit, Digit, Digit, Digit]; unit: Unit; unitType: string }[] {
	const results: { squares: [Square, Square, Square, Square]; digits: [Digit, Digit, Digit, Digit]; unit: Unit; unitType: string }[] = [];
	
	// Check all units (rows, columns, boxes)
	for (const unit of UNITLIST) {
		const digitPositions: Record<Digit, Square[]> = {};
		
		// Map each digit to the squares where it can appear in this unit
		for (const square of unit) {
			if (candidates[square]) {
				for (const digit of Array.from(candidates[square])) {
					if (!digitPositions[digit]) {
						digitPositions[digit] = [];
					}
					digitPositions[digit].push(square);
				}
			}
		}
		
		// Find quads of digits that collectively appear in exactly the same four squares
		const digits = Object.keys(digitPositions);
		for (let i = 0; i < digits.length; i++) {
			for (let j = i + 1; j < digits.length; j++) {
				for (let k = j + 1; k < digits.length; k++) {
					for (let l = k + 1; l < digits.length; l++) {
						const digit1 = digits[i];
						const digit2 = digits[j];
						const digit3 = digits[k];
						const digit4 = digits[l];
						
						const allPositions = new Set([
							...(digitPositions[digit1] || []),
							...(digitPositions[digit2] || []),
							...(digitPositions[digit3] || []),
							...(digitPositions[digit4] || [])
						]);
						
						// Check if these four digits appear in exactly four squares
						if (allPositions.size === 4 &&
							digitPositions[digit1] && digitPositions[digit1].length <= 4 &&
							digitPositions[digit2] && digitPositions[digit2].length <= 4 &&
							digitPositions[digit3] && digitPositions[digit3].length <= 4 &&
							digitPositions[digit4] && digitPositions[digit4].length <= 4) {
							
							let unitType = 'box';
							if (unit[0].charAt(1) === unit[8].charAt(1)) {
								unitType = 'column';
							} else if (unit[0].charAt(0) === unit[8].charAt(0)) {
								unitType = 'row';
							}
							
							const squareArray = Array.from(allPositions);
							results.push({
								squares: [squareArray[0], squareArray[1], squareArray[2], squareArray[3]],
								digits: [digit1, digit2, digit3, digit4],
								unit,
								unitType
							});
						}
					}
				}
			}
		}
	}
	
	return results;
}

// ============ COMPREHENSIVE HINT SYSTEM ============

interface HintBase {
	technique: string;
	description: string;
}

interface ErrorHint extends HintBase {
	type: 'error';
	technique: 'incorrect_value';
	square: Square;
	actualValue: Digit;
	correctValue: Digit;
}

interface MissingCandidateHint extends HintBase {
	type: 'missing_candidate';
	technique: 'missing_candidate';
	square: Square;
	missingDigit: Digit;
}

interface SingleCellHint extends HintBase {
	type: 'single_cell';
	technique: 'last_remaining_in_box' | 'last_remaining_in_row' | 'last_remaining_in_column' | 'naked_single';
	square: Square;
	digit: Digit;
	unit?: Unit;
}

interface NakedSetHint extends HintBase {
	type: 'naked_set';
	technique: 'naked_pairs' | 'naked_triples' | 'naked_quads';
	squares: Square[];
	digits: Digit[];
	unit: Unit;
	unitType: string;
	eliminationCells: Square[];
	eliminationDigits: Digit[];
}

interface HiddenSetHint extends HintBase {
	type: 'hidden_set';
	technique: 'hidden_pairs' | 'hidden_triples' | 'hidden_quads';
	squares: Square[];
	digits: Digit[];
	unit: Unit;
	unitType: string;
	eliminationCells: Square[];
	eliminationDigits: Digit[];
}

type ComprehensiveHint = ErrorHint | MissingCandidateHint | SingleCellHint | NakedSetHint | HiddenSetHint;

/**
 * Helper function to convert values to candidates format for hint detection
 */
function valuesToCandidates(values: Values): Candidates {
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
 * Find cells that would have candidates eliminated by a naked set
 */
function findNakedSetEliminations(squares: Square[], digits: Digit[], unit: Unit, candidates: Candidates): { cells: Square[], digits: Digit[] } {
	const eliminationCells: Square[] = [];
	const eliminationDigits: Digit[] = [];
	
	for (const square of unit) {
		if (!squares.includes(square) && candidates[square]) {
			for (const digit of digits) {
				if (candidates[square].has(digit)) {
					if (!eliminationCells.includes(square)) {
						eliminationCells.push(square);
					}
					if (!eliminationDigits.includes(digit)) {
						eliminationDigits.push(digit);
					}
				}
			}
		}
	}
	
	return { cells: eliminationCells, digits: eliminationDigits };
}

/**
 * Find cells that would have candidates eliminated by a hidden set
 */
function findHiddenSetEliminations(squares: Square[], digits: Digit[], candidates: Candidates): { cells: Square[], digits: Digit[] } {
	const eliminationCells: Square[] = [];
	const eliminationDigits: Digit[] = [];
	
	for (const square of squares) {
		if (candidates[square]) {
			for (const candidate of Array.from(candidates[square])) {
				if (!digits.includes(candidate)) {
					if (!eliminationCells.includes(square)) {
						eliminationCells.push(square);
					}
					if (!eliminationDigits.includes(candidate)) {
						eliminationDigits.push(candidate);
					}
				}
			}
		}
	}
	
	return { cells: eliminationCells, digits: eliminationDigits };
}

/**
 * Comprehensive hint detection function that checks all techniques in order of difficulty
 */
function getComprehensiveHint(puzzle: string | Grid, values: Values): ComprehensiveHint | null {
	// Convert values to candidates for advanced techniques
	const candidates = valuesToCandidates(values);
	
	// STAGE 1: MISTAKE DETECTION
	
	// Check for incorrect values (highest priority)
	const incorrectValues = detectIncorrectValues(puzzle, values);
	if (incorrectValues.length > 0) {
		const error = incorrectValues[0];
		return {
			type: 'error',
			technique: 'incorrect_value',
			description: `Cell ${error.square} contains ${error.actualValue}, but the correct value is ${error.correctValue}`,
			square: error.square,
			actualValue: error.actualValue,
			correctValue: error.correctValue
		};
	}
	
	// Check for missing candidates
	const missingCandidates = detectMissingCandidates(puzzle, values, candidates);
	if (missingCandidates.length > 0) {
		const missing = missingCandidates[0];
		return {
			type: 'missing_candidate',
			technique: 'missing_candidate',
			description: `Cell ${missing.square} is missing candidate ${missing.missingDigit}`,
			square: missing.square,
			missingDigit: missing.missingDigit
		};
	}
	
	// STAGE 2: TRIVIAL HINTS (Single cell solutions)
	
	// Check for last remaining in box
	const lastInBox = detectLastRemainingInBox(values);
	if (lastInBox.length > 0) {
		const hint = lastInBox[0];
		return {
			type: 'single_cell',
			technique: 'last_remaining_in_box',
			description: `Cell ${hint.square} is the last empty cell in its box and must contain ${hint.digit}`,
			square: hint.square,
			digit: hint.digit,
			unit: hint.unit
		};
	}
	
	// Check for last remaining in row
	const lastInRow = detectLastRemainingInRow(values);
	if (lastInRow.length > 0) {
		const hint = lastInRow[0];
		return {
			type: 'single_cell',
			technique: 'last_remaining_in_row',
			description: `Cell ${hint.square} is the last empty cell in its row and must contain ${hint.digit}`,
			square: hint.square,
			digit: hint.digit,
			unit: hint.unit
		};
	}
	
	// Check for last remaining in column
	const lastInColumn = detectLastRemainingInColumn(values);
	if (lastInColumn.length > 0) {
		const hint = lastInColumn[0];
		return {
			type: 'single_cell',
			technique: 'last_remaining_in_column',
			description: `Cell ${hint.square} is the last empty cell in its column and must contain ${hint.digit}`,
			square: hint.square,
			digit: hint.digit,
			unit: hint.unit
		};
	}
	
	// Check for naked singles
	const nakedSingles = detectNakedSingles(candidates);
	if (nakedSingles.length > 0) {
		const hint = nakedSingles[0];
		return {
			type: 'single_cell',
			technique: 'naked_single',
			description: `Cell ${hint.square} has only one possible candidate: ${hint.digit}`,
			square: hint.square,
			digit: hint.digit
		};
	}
	
	// STAGE 3: BASIC HINTS (Naked sets)
	
	// Check for naked pairs
	const nakedPairs = detectNakedPairs(candidates);
	if (nakedPairs.length > 0) {
		const hint = nakedPairs[0];
		const eliminations = findNakedSetEliminations(hint.squares, hint.digits, hint.unit, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'naked_set',
				technique: 'naked_pairs',
				description: `Naked pair ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from ${eliminations.cells.join(',')}`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// Check for naked triples
	const nakedTriples = detectNakedTriples(candidates);
	if (nakedTriples.length > 0) {
		const hint = nakedTriples[0];
		const eliminations = findNakedSetEliminations(hint.squares, hint.digits, hint.unit, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'naked_set',
				technique: 'naked_triples',
				description: `Naked triple ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from ${eliminations.cells.join(',')}`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// Check for naked quads
	const nakedQuads = detectNakedQuads(candidates);
	if (nakedQuads.length > 0) {
		const hint = nakedQuads[0];
		const eliminations = findNakedSetEliminations(hint.squares, hint.digits, hint.unit, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'naked_set',
				technique: 'naked_quads',
				description: `Naked quad ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from ${eliminations.cells.join(',')}`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// STAGE 4: ADVANCED HINTS (Hidden sets)
	
	// Check for hidden pairs
	const hiddenPairs = detectHiddenPairs(candidates);
	if (hiddenPairs.length > 0) {
		const hint = hiddenPairs[0];
		const eliminations = findHiddenSetEliminations(hint.squares, hint.digits, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'hidden_set',
				technique: 'hidden_pairs',
				description: `Hidden pair ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from these cells`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// Check for hidden triples
	const hiddenTriples = detectHiddenTriples(candidates);
	if (hiddenTriples.length > 0) {
		const hint = hiddenTriples[0];
		const eliminations = findHiddenSetEliminations(hint.squares, hint.digits, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'hidden_set',
				technique: 'hidden_triples',
				description: `Hidden triple ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from these cells`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// Check for hidden quads
	const hiddenQuads = detectHiddenQuads(candidates);
	if (hiddenQuads.length > 0) {
		const hint = hiddenQuads[0];
		const eliminations = findHiddenSetEliminations(hint.squares, hint.digits, candidates);
		if (eliminations.cells.length > 0) {
			return {
				type: 'hidden_set',
				technique: 'hidden_quads',
				description: `Hidden quad ${hint.digits.join(',')} found in cells ${hint.squares.join(',')} in ${hint.unitType}. Eliminates ${eliminations.digits.join(',')} from these cells`,
				squares: hint.squares,
				digits: hint.digits,
				unit: hint.unit,
				unitType: hint.unitType,
				eliminationCells: eliminations.cells,
				eliminationDigits: eliminations.digits
			};
		}
	}
	
	// No hints found
	return null;
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
	getComprehensiveHint,
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

export type { 
	Square, 
	Digit, 
	Row, 
	Column, 
	Unit, 
	Grid, 
	Values, 
	Candidates, 
	Hint, 
	HintError, 
	HintSquare, 
	HintUnit, 
	HintDontKnow, 
	Conflict, 
	SolverOptions, 
	Difficulty,
	ComprehensiveHint,
	ErrorHint,
	MissingCandidateHint,
	SingleCellHint,
	NakedSetHint,
	HiddenSetHint
};

export default sudoku;
