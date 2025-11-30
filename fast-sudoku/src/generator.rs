
use crate::grid::{Grid, SIZE};
use crate::solver::{solve, is_unique};
use crate::difficulty::evaluate_difficulty;
use rand::prelude::*;
use rand::seq::SliceRandom;
use rand::rngs::SmallRng;

pub struct Generator {
    rng: SmallRng,
}

impl Generator {
    pub fn new() -> Self {
        Generator {
            rng: SmallRng::from_entropy(),
        }
    }

    pub fn new_with_seed(seed: u64) -> Self {
        Generator {
            rng: SmallRng::seed_from_u64(seed),
        }
    }
    
    pub fn generate(&mut self, category: &str) -> String {
        let (target, tolerance) = match category {
            "trivial" => (4, 4),
            "basic" => (17, 8),
            "intermediate" => (36, 10),
            "tough" => (56, 12),
            "diabolical" => (76, 8),
            "extreme" => (88, 4),
            "master" => (94, 2),
            "grandmaster" => (98, 1),
            _ => (17, 8),
        };
        
        let max_attempts = 2000; 
        let mut best_puzzle = Grid::new();
        let mut best_diff_diff = 100;
        let mut evaluations = 0;
        
        for _round in 0..max_attempts/100 { // Rounds
            // Generate full grid
            let mut full_grid = Grid::new();
            // Randomly fill diagonal boxes
            for i in 0..3 {
                let _box_idx = i * 4; 
                let mut digits: Vec<u8> = (1..=9).collect();
                digits.shuffle(&mut self.rng);
                let start_row = i * 3;
                let start_col = i * 3;
                for r in 0..3 {
                    for c in 0..3 {
                        let cell = (start_row + r) * 9 + (start_col + c);
                        full_grid.set_value(cell, digits[r*3+c]);
                    }
                }
            }
            
            if let Some(solved) = solve(&full_grid) {
                full_grid = solved;
            } else {
                continue;
            }
            
            // Remove clues to reach start state
            let mut current_grid = full_grid;
            let mut clues: Vec<usize> = (0..SIZE).collect();
            clues.shuffle(&mut self.rng);
            
            // Remove until ~24 clues
            let target_clues = 24;
            let mut current_clues = SIZE;
            
            for &cell in &clues {
                if current_clues <= target_clues { break; }
                let val = current_grid.values[cell];
                current_grid.set_value(cell, 0); // Remove
                
                // Optimized uniqueness check
                if !crate::solver::check_uniqueness_after_removal(&current_grid, cell, val) {
                    current_grid.set_value(cell, val); // Restore
                } else {
                    current_clues -= 1;
                }
            }
            
            // Annealing / Hill Climbing
            let mut current_diff = evaluate_difficulty(&current_grid).score;

            for _step in 0..50 {
                let diff = current_diff - target;
                if diff.abs() <= tolerance {
                    // println!("Found target! Rounds: {}, Evals: {}", _round, evaluations);
                    return current_grid.to_string();
                }

                if diff.abs() < best_diff_diff {
                    best_diff_diff = diff.abs();
                    best_puzzle = current_grid;
                }

                let mut improved = false;
                let mut attempts = 0;
                
                // First Improvement Strategy
                while attempts < 20 {
                    attempts += 1;
                    let mut next_grid = current_grid;
                    
                    if diff > 0 {
                        // Too hard -> Add clue (make easier)
                        let mut holes = Vec::new();
                        for i in 0..SIZE {
                            if next_grid.values[i] == 0 {
                                holes.push(i);
                            }
                        }
                        if let Some(&idx) = holes.choose(&mut self.rng) {
                            next_grid.values[idx] = full_grid.values[idx]; // Use solution value
                            next_grid.candidates[idx] = 0;
                        }
                    } else {
                        // Too easy -> Remove clue (make harder)
                        let mut clues = Vec::new();
                        for i in 0..SIZE {
                            if next_grid.values[i] != 0 {
                                clues.push(i);
                            }
                        }
                        if let Some(&idx) = clues.choose(&mut self.rng) {
                            let val = next_grid.values[idx];
                            next_grid.values[idx] = 0;
                            
                            if !crate::solver::check_uniqueness_after_removal(&next_grid, idx, val) {
                                continue;
                            }
                        }
                    }
                    
                    let next_diff = evaluate_difficulty(&next_grid).score;
                    evaluations += 1;
                    
                    if (next_diff - target).abs() < diff.abs() {
                        current_grid = next_grid;
                        current_diff = next_diff;
                        improved = true;
                        break; // First improvement found
                    }
                    
                    // Swap Strategy (Escape Local Minima)
                    if !improved && attempts > 10 {
                        // Try swapping: Add a random clue, then remove a random clue
                        let mut holes = Vec::new();
                        for i in 0..SIZE { if current_grid.values[i] == 0 { holes.push(i); } }
                        
                        if let Some(&add_cell) = holes.choose(&mut self.rng) {
                            let add_val = full_grid.values[add_cell];
                            next_grid.set_value(add_cell, add_val);
                            
                            let mut clues = Vec::new();
                            for i in 0..SIZE { if next_grid.values[i] != 0 && i != add_cell { clues.push(i); } }
                            
                            if let Some(&rem_cell) = clues.choose(&mut self.rng) {
                                let rem_val = next_grid.values[rem_cell];
                                next_grid.set_value(rem_cell, 0);
                                
                                if crate::solver::check_uniqueness_after_removal(&next_grid, rem_cell, rem_val) {
                                    let d = evaluate_difficulty(&next_grid).score;
                                    evaluations += 1;
                                    // Accept swap if it helps or just to change state
                                    if (d - target).abs() <= diff.abs() + 2 { // Allow slight degradation
                                        current_grid = next_grid;
                                        current_diff = d;
                                        improved = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // println!("Finished max rounds. Best diff: {}", best_diff_diff);
        best_puzzle.to_string()
    }
}
