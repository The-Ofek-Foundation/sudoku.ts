
use crate::grid::{Grid, SIZE};

pub fn solve(grid: &Grid) -> Option<Grid> {
    let mut solution = *grid;
    // We need to update candidates based on initial values first
    update_candidates(&mut solution);
    
    if solve_recursive(&mut solution) {
        Some(solution)
    } else {
        None
    }
}

pub fn is_unique(grid: &Grid) -> bool {
    let mut g = *grid;
    update_candidates(&mut g);
    let mut count = 0;
    count_solutions(&mut g, &mut count);
    count == 1
}

pub fn check_uniqueness_after_removal(grid: &Grid, cell: usize, removed_val: u8) -> bool {
    // We know 'grid' (with 'val' at 'cell') has 1 solution (the original full grid).
    // We want to check if there is ANY solution where cell != removed_val.
    // If we find one, then the puzzle is NOT unique (original solution + new solution).
    // If we find none, then the puzzle IS unique (only original solution exists).
    
    let mut g = *grid;
    // The grid passed in has 0 at 'cell'.
    // We want to forbid 'removed_val' at 'cell'.
    
    // Update candidates for the whole grid first
    update_candidates(&mut g);
    
    // Now remove 'removed_val' from candidates of 'cell'
    g.candidates[cell] &= !(1 << (removed_val - 1));
    
    // If no candidates left, then no other solution exists -> Unique
    if g.candidates[cell] == 0 {
        return true;
    }
    
    // Try to find ONE solution
    solve_recursive(&mut g) == false
}

fn count_solutions(grid: &mut Grid, count: &mut usize) {
    if *count > 1 { return; }
    
    let mut min_candidates = 10;
    let mut best_cell = SIZE;
    
    for i in 0..SIZE {
        if grid.values[i] == 0 {
            let c = grid.candidates[i].count_ones();
            if c == 0 { return; } // Invalid state
            if c < min_candidates {
                min_candidates = c;
                best_cell = i;
                if c == 1 { break; }
            }
        }
    }
    
    if best_cell == SIZE {
        *count += 1;
        return;
    }
    
    let candidates = grid.candidates[best_cell];
    for digit in 1..=9 {
        if (candidates >> (digit - 1)) & 1 == 1 {
            let mut next_grid = *grid;
            next_grid.values[best_cell] = digit;
            if update_candidates_after_move(&mut next_grid, best_cell, digit) {
                count_solutions(&mut next_grid, count);
            }
        }
    }
}

fn solve_recursive(grid: &mut Grid) -> bool {
    let mut min_candidates = 10;
    let mut best_cell = SIZE;
    
    for i in 0..SIZE {
        if grid.values[i] == 0 {
            let c = grid.candidates[i].count_ones();
            if c == 0 { return false; } // Invalid state
            if c < min_candidates {
                min_candidates = c;
                best_cell = i;
                if c == 1 { break; }
            }
        }
    }
    
    if best_cell == SIZE {
        return true; // Solved
    }
    
    let candidates = grid.candidates[best_cell];
    for digit in 1..=9 {
        if (candidates >> (digit - 1)) & 1 == 1 {
            let mut next_grid = *grid;
            next_grid.values[best_cell] = digit;
            if update_candidates_after_move(&mut next_grid, best_cell, digit) {
                if solve_recursive(&mut next_grid) {
                    *grid = next_grid;
                    return true;
                }
            }
        }
    }
    
    false
}

pub fn update_candidates(grid: &mut Grid) {
    // Reset candidates
    grid.candidates = [0x1FF; SIZE];
    
    // Apply constraints from existing values
    for i in 0..SIZE {
        if grid.values[i] != 0 {
            let val = grid.values[i];
            update_candidates_after_move(grid, i, val);
        }
    }
}

pub fn update_candidates_after_move(grid: &mut Grid, cell: usize, val: u8) -> bool {
    let row = cell / 9;
    let col = cell % 9;
    let box_idx = (row / 3) * 3 + (col / 3);
    
    let mask = !(1 << (val - 1));
    
    for i in 0..SIZE {
        if grid.values[i] == 0 {
            let r = i / 9;
            let c = i % 9;
            let b = (r / 3) * 3 + (c / 3);
            
            if r == row || c == col || b == box_idx {
                grid.candidates[i] &= mask;
                if grid.candidates[i] == 0 {
                    return false; // Conflict
                }
            }
        }
    }
    true
}
