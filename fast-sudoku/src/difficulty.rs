
use crate::grid::Grid;
use crate::techniques::get_hint;
use crate::solver::update_candidates_after_move;
use std::collections::HashSet;

pub struct DifficultyResult {
    pub score: i32,
    pub solvable: bool,
}

pub fn evaluate_difficulty(grid: &Grid) -> DifficultyResult {
    let mut current_grid = *grid;
    crate::solver::update_candidates(&mut current_grid);
    
    let mut max_difficulty = 0.0;
    let mut total_difficulty = 0.0;
    let mut steps = 0;
    let mut techniques_used = HashSet::new();
    
    loop {
        if current_grid.is_solved() {
            // Calculate score
            let diversity_bonus = (techniques_used.len() as f32 * 0.5).min(5.0);
            let avg_difficulty = if steps > 0 { total_difficulty / steps as f32 } else { 0.0 };
            let weighted_score = max_difficulty * 0.7 + avg_difficulty * 0.2 + diversity_bonus;
            let final_score = weighted_score.round() as i32;
            return DifficultyResult { score: final_score.clamp(1, 100), solvable: true };
        }
        
        if let Some(hint) = get_hint(&current_grid) {
            max_difficulty = max_difficulty.max(hint.difficulty);
            total_difficulty += hint.difficulty;
            steps += 1;
            techniques_used.insert(hint.technique);
            
            // Apply hint
            apply_hint(&mut current_grid, &hint);
        } else {
            // Stuck
            return DifficultyResult { score: 100, solvable: false };
        }
    }
}

fn apply_hint(grid: &mut Grid, hint: &crate::techniques::Hint) {
    for &(cell, digit) in &hint.placements {
        grid.set_value(cell, digit);
        update_candidates_after_move(grid, cell, digit);
    }
    for &(cell, digit) in &hint.eliminations {
        grid.candidates[cell] &= !(1 << (digit - 1));
    }
}
