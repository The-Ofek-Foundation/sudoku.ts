
import { getSudoku } from 'sudoku-gen';
import { evaluatePuzzleDifficulty } from '../hints/difficulty';
import type { Grid } from '../hints/types';

// Map our difficulty categories to sudoku-gen difficulties
// sudoku-gen supports: 'easy', 'medium', 'hard', 'expert'
const DIFFICULTY_MAP: Record<string, 'easy' | 'medium' | 'hard' | 'expert'> = {
    trivial: 'easy',
    basic: 'medium',
    intermediate: 'hard',
    tough: 'expert',
    diabolical: 'expert', // Fallback
    extreme: 'expert', // Fallback
    master: 'expert', // Fallback
};

export function generateFast(
    category: string,
    targetDifficulty: number,
    tolerance: number
): { puzzle: Grid; solved: Grid; difficulty: number; attempts: number } | null {
    const libDifficulty = DIFFICULTY_MAP[category] || 'expert';
    const maxAttempts = 50;

    for (let i = 0; i < maxAttempts; i++) {
        const raw = getSudoku(libDifficulty);

        // Convert to our Grid format
        const puzzle: Grid = {};
        const solved: Grid = {};
        const rows = 'ABCDEFGHI';
        const cols = '123456789';

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = rows[r] + cols[c];
                const val = raw.puzzle[r * 9 + c];
                const sol = raw.solution[r * 9 + c];

                if (val !== '-') {
                    puzzle[cell] = parseInt(val);
                }
                solved[cell] = parseInt(sol);
            }
        }

        // Evaluate Difficulty
        // Use a high maxDifficulty to ensure we get a real reading, but maybe cap it for speed if needed.
        // For 'tough', we expect ~56.
        const evaluation = evaluatePuzzleDifficulty(puzzle, 1000, targetDifficulty + tolerance + 20);
        const diff = evaluation.difficulty;

        if (Math.abs(diff - targetDifficulty) <= tolerance) {
            return {
                puzzle,
                solved,
                difficulty: diff,
                attempts: i + 1
            };
        }
    }

    return null;
}
