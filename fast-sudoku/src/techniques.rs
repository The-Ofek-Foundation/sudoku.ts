
use crate::grid::{Grid, SIZE};
use crate::utils::{ROWS, COLS, BOXES, get_peers};
use std::collections::{HashSet, HashMap};

#[derive(Debug, Clone)]
pub struct Hint {
    pub difficulty: f32,
    pub technique: &'static str,
    pub eliminations: Vec<(usize, u8)>, // (cell_idx, digit)
    pub placements: Vec<(usize, u8)>,   // (cell_idx, digit)
}

pub fn get_hint(grid: &Grid) -> Option<Hint> {
    // Stage 2: Trivial/Getting Started
    if let Some(h) = detect_naked_single(grid) { return Some(h); }
    if let Some(h) = detect_hidden_single(grid) { return Some(h); }
    
    // Stage 3: Basic Elimination
    if let Some(h) = detect_naked_subset(grid, 2) { return Some(h); } // Naked Pair
    if let Some(h) = detect_pointing_pairs(grid) { return Some(h); }
    if let Some(h) = detect_box_line_reduction(grid) { return Some(h); }
    if let Some(h) = detect_hidden_subset(grid, 2) { return Some(h); } // Hidden Pair
    if let Some(h) = detect_naked_subset(grid, 3) { return Some(h); } // Naked Triple
    if let Some(h) = detect_hidden_subset(grid, 3) { return Some(h); } // Hidden Triple
    
    // Stage 4: Advanced Elimination
    if let Some(h) = detect_naked_subset(grid, 4) { return Some(h); } // Naked Quad
    if let Some(h) = detect_hidden_subset(grid, 4) { return Some(h); } // Hidden Quad
    
    // Stage 5: Fish and Wings
    if let Some(h) = detect_x_wing(grid) { return Some(h); }
    if let Some(h) = detect_y_wing(grid) { return Some(h); }
    
    // Stage 6: Intermediate Patterns
    if let Some(h) = detect_simple_coloring(grid) { return Some(h); }
    
    None
}

fn get_candidates(grid: &Grid, cell: usize) -> Vec<u8> {
    let mut res = Vec::with_capacity(9);
    let mask = grid.candidates[cell];
    for d in 1..=9 {
        if (mask >> (d - 1)) & 1 == 1 {
            res.push(d as u8);
        }
    }
    res
}

fn detect_naked_single(grid: &Grid) -> Option<Hint> {
    for i in 0..SIZE {
        if grid.values[i] == 0 {
            let mask = grid.candidates[i];
            if mask.count_ones() == 1 {
                let digit = mask.trailing_zeros() as u8 + 1;
                return Some(Hint {
                    difficulty: 1.0,
                    technique: "naked_single",
                    eliminations: vec![],
                    placements: vec![(i, digit)],
                });
            }
        }
    }
    None
}

fn detect_hidden_single(grid: &Grid) -> Option<Hint> {
    for unit in ROWS.iter().chain(COLS.iter()).chain(BOXES.iter()) {
        for d in 1..=9 {
            let mut count = 0;
            let mut last_pos = 0;
            for &cell in unit.iter() {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    count += 1;
                    last_pos = cell;
                } else if grid.values[cell] == d as u8 {
                    count = 0; // Already placed
                    break;
                }
            }
            
            if count == 1 {
                return Some(Hint {
                    difficulty: 7.0,
                    technique: "hidden_single",
                    eliminations: vec![],
                    placements: vec![(last_pos, d as u8)],
                });
            }
        }
    }
    None
}

fn detect_naked_subset(grid: &Grid, size: usize) -> Option<Hint> {
    let difficulty = match size {
        2 => 9.0,
        3 => 22.0,
        4 => 35.0,
        _ => 0.0,
    };
    let technique = match size {
        2 => "naked_pairs",
        3 => "naked_triples",
        4 => "naked_quads",
        _ => "",
    };

    for unit in ROWS.iter().chain(COLS.iter()).chain(BOXES.iter()) {
        let mut empty_cells = [0usize; 9];
        let mut count = 0;
        for &cell in unit.iter() {
            if grid.values[cell] == 0 {
                empty_cells[count] = cell;
                count += 1;
            }
        }
        
        if count < size { continue; }

        // Hardcoded combinations to avoid allocation
        if size == 2 {
            for i in 0..count {
                for j in i+1..count {
                    let c1 = empty_cells[i];
                    let c2 = empty_cells[j];
                    let union_candidates = grid.candidates[c1] | grid.candidates[c2];
                    
                    if union_candidates.count_ones() == 2 {
                        // Found naked pair
                        let mut eliminations = Vec::new();
                        for k in 0..count {
                            let cell = empty_cells[k];
                            if cell != c1 && cell != c2 {
                                let common = grid.candidates[cell] & union_candidates;
                                if common != 0 {
                                    for d in 1..=9 {
                                        if (common >> (d - 1)) & 1 == 1 {
                                            eliminations.push((cell, d as u8));
                                        }
                                    }
                                }
                            }
                        }
                        if !eliminations.is_empty() {
                            return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                        }
                    }
                }
            }
        } else if size == 3 {
             for i in 0..count {
                for j in i+1..count {
                    for k in j+1..count {
                        let c1 = empty_cells[i];
                        let c2 = empty_cells[j];
                        let c3 = empty_cells[k];
                        let union_candidates = grid.candidates[c1] | grid.candidates[c2] | grid.candidates[c3];
                        
                        if union_candidates.count_ones() == 3 {
                            // Found naked triple
                            let mut eliminations = Vec::new();
                            for l in 0..count {
                                let cell = empty_cells[l];
                                if cell != c1 && cell != c2 && cell != c3 {
                                    let common = grid.candidates[cell] & union_candidates;
                                    if common != 0 {
                                        for d in 1..=9 {
                                            if (common >> (d - 1)) & 1 == 1 {
                                                eliminations.push((cell, d as u8));
                                            }
                                        }
                                    }
                                }
                            }
                            if !eliminations.is_empty() {
                                return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                            }
                        }
                    }
                }
            }
        } else if size == 4 {
            for i in 0..count {
                for j in i+1..count {
                    for k in j+1..count {
                        for l in k+1..count {
                            let c1 = empty_cells[i];
                            let c2 = empty_cells[j];
                            let c3 = empty_cells[k];
                            let c4 = empty_cells[l];
                            let union_candidates = grid.candidates[c1] | grid.candidates[c2] | grid.candidates[c3] | grid.candidates[c4];
                            
                            if union_candidates.count_ones() == 4 {
                                // Found naked quad
                                let mut eliminations = Vec::new();
                                for m in 0..count {
                                    let cell = empty_cells[m];
                                    if cell != c1 && cell != c2 && cell != c3 && cell != c4 {
                                        let common = grid.candidates[cell] & union_candidates;
                                        if common != 0 {
                                            for d in 1..=9 {
                                                if (common >> (d - 1)) & 1 == 1 {
                                                    eliminations.push((cell, d as u8));
                                                }
                                            }
                                        }
                                    }
                                }
                                if !eliminations.is_empty() {
                                    return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn detect_hidden_subset(grid: &Grid, size: usize) -> Option<Hint> {
    let difficulty = match size {
        2 => 18.0,
        3 => 28.0,
        4 => 42.0,
        _ => 0.0,
    };
    let technique = match size {
        2 => "hidden_pairs",
        3 => "hidden_triples",
        4 => "hidden_quads",
        _ => "",
    };

    for unit in ROWS.iter().chain(COLS.iter()).chain(BOXES.iter()) {
        // Map digits to cells
        let mut digit_cells: [u16; 10] = [0; 10]; // Bitmask of cells in unit (0-8)
        let mut digit_counts: [u8; 10] = [0; 10];
        
        for (idx, &cell) in unit.iter().enumerate() {
            if grid.values[cell] == 0 {
                let mask = grid.candidates[cell];
                for d in 1..=9 {
                    if (mask >> (d - 1)) & 1 == 1 {
                        digit_cells[d] |= 1 << idx;
                        digit_counts[d] += 1;
                    }
                }
            }
        }
        
        let mut candidate_digits = [0usize; 9];
        let mut count = 0;
        for d in 1..=9 {
            if digit_counts[d] > 0 && digit_counts[d] as usize <= size {
                candidate_digits[count] = d;
                count += 1;
            }
        }
        
        if count < size { continue; }
        
        // Hardcoded combinations
        if size == 2 {
            for i in 0..count {
                for j in i+1..count {
                    let d1 = candidate_digits[i];
                    let d2 = candidate_digits[j];
                    let union_cells = digit_cells[d1] | digit_cells[d2];
                    
                    if union_cells.count_ones() as usize == 2 {
                         // Found hidden pair
                        let mut eliminations = Vec::new();
                        for idx in 0..9 {
                            if (union_cells >> idx) & 1 == 1 {
                                let cell = unit[idx];
                                let mask = grid.candidates[cell];
                                for d in 1..=9 {
                                    if d != d1 && d != d2 && (mask >> (d - 1)) & 1 == 1 {
                                        eliminations.push((cell, d as u8));
                                    }
                                }
                            }
                        }
                        if !eliminations.is_empty() {
                            return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                        }
                    }
                }
            }
        } else if size == 3 {
            for i in 0..count {
                for j in i+1..count {
                    for k in j+1..count {
                        let d1 = candidate_digits[i];
                        let d2 = candidate_digits[j];
                        let d3 = candidate_digits[k];
                        let union_cells = digit_cells[d1] | digit_cells[d2] | digit_cells[d3];
                        
                        if union_cells.count_ones() as usize == 3 {
                             // Found hidden triple
                            let mut eliminations = Vec::new();
                            for idx in 0..9 {
                                if (union_cells >> idx) & 1 == 1 {
                                    let cell = unit[idx];
                                    let mask = grid.candidates[cell];
                                    for d in 1..=9 {
                                        if d != d1 && d != d2 && d != d3 && (mask >> (d - 1)) & 1 == 1 {
                                            eliminations.push((cell, d as u8));
                                        }
                                    }
                                }
                            }
                            if !eliminations.is_empty() {
                                return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                            }
                        }
                    }
                }
            }
        } else if size == 4 {
            for i in 0..count {
                for j in i+1..count {
                    for k in j+1..count {
                        for l in k+1..count {
                            let d1 = candidate_digits[i];
                            let d2 = candidate_digits[j];
                            let d3 = candidate_digits[k];
                            let d4 = candidate_digits[l];
                            let union_cells = digit_cells[d1] | digit_cells[d2] | digit_cells[d3] | digit_cells[d4];
                            
                            if union_cells.count_ones() as usize == 4 {
                                 // Found hidden quad
                                let mut eliminations = Vec::new();
                                for idx in 0..9 {
                                    if (union_cells >> idx) & 1 == 1 {
                                        let cell = unit[idx];
                                        let mask = grid.candidates[cell];
                                        for d in 1..=9 {
                                            if d != d1 && d != d2 && d != d3 && d != d4 && (mask >> (d - 1)) & 1 == 1 {
                                                eliminations.push((cell, d as u8));
                                            }
                                        }
                                    }
                                }
                                if !eliminations.is_empty() {
                                    return Some(Hint { difficulty, technique, eliminations, placements: vec![] });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn detect_pointing_pairs(grid: &Grid) -> Option<Hint> {
    // Box-Line interaction
    for box_idx in 0..9 {
        let box_cells = BOXES[box_idx];
        for d in 1..=9 {
            let mut candidates_in_box = [0usize; 9];
            let mut count = 0;
            for &cell in &box_cells {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    candidates_in_box[count] = cell;
                    count += 1;
                }
            }
            
            if count >= 2 && count <= 3 {
                // Check Row
                let row0 = candidates_in_box[0] / 9;
                let mut all_same_row = true;
                for i in 1..count {
                    if candidates_in_box[i] / 9 != row0 {
                        all_same_row = false;
                        break;
                    }
                }
                
                if all_same_row {
                    // All in same row
                    let mut eliminations = Vec::new();
                    for &cell in &ROWS[row0] {
                        // Check if cell is in candidates_in_box
                        let mut is_candidate = false;
                        for i in 0..count {
                            if candidates_in_box[i] == cell {
                                is_candidate = true;
                                break;
                            }
                        }
                        
                        if !is_candidate && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                            eliminations.push((cell, d as u8));
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 12.0,
                            technique: "pointing_pairs",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
                
                // Check Col
                let col0 = candidates_in_box[0] % 9;
                let mut all_same_col = true;
                for i in 1..count {
                    if candidates_in_box[i] % 9 != col0 {
                        all_same_col = false;
                        break;
                    }
                }
                
                if all_same_col {
                    // All in same col
                    let mut eliminations = Vec::new();
                    for &cell in &COLS[col0] {
                         // Check if cell is in candidates_in_box
                        let mut is_candidate = false;
                        for i in 0..count {
                            if candidates_in_box[i] == cell {
                                is_candidate = true;
                                break;
                            }
                        }
                        
                        if !is_candidate && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                            eliminations.push((cell, d as u8));
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 12.0,
                            technique: "pointing_pairs",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
            }
        }
    }
    None
}

fn detect_box_line_reduction(grid: &Grid) -> Option<Hint> {
    // Line-Box interaction
    for d in 1..=9 {
        // Rows
        for r in 0..9 {
            let mut candidates_in_row = [0usize; 9];
            let mut count = 0;
            for &cell in &ROWS[r] {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    candidates_in_row[count] = cell;
                    count += 1;
                }
            }
            
            if count >= 2 && count <= 3 {
                let box0 = (candidates_in_row[0] / 9 / 3) * 3 + (candidates_in_row[0] % 9 / 3);
                let mut all_same_box = true;
                for i in 1..count {
                    let c = candidates_in_row[i];
                    if (c / 9 / 3) * 3 + (c % 9 / 3) != box0 {
                        all_same_box = false;
                        break;
                    }
                }
                
                if all_same_box {
                    // All in same box
                    let mut eliminations = Vec::new();
                    for &cell in &BOXES[box0] {
                        // Check if cell is in candidates_in_row
                        let mut is_candidate = false;
                        for i in 0..count {
                            if candidates_in_row[i] == cell {
                                is_candidate = true;
                                break;
                            }
                        }
                        
                        if !is_candidate && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                            eliminations.push((cell, d as u8));
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 14.0,
                            technique: "box_line_reduction",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
            }
        }
        // Cols
        for c in 0..9 {
            let mut candidates_in_col = [0usize; 9];
            let mut count = 0;
            for &cell in &COLS[c] {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    candidates_in_col[count] = cell;
                    count += 1;
                }
            }
            
            if count >= 2 && count <= 3 {
                let box0 = (candidates_in_col[0] / 9 / 3) * 3 + (candidates_in_col[0] % 9 / 3);
                let mut all_same_box = true;
                for i in 1..count {
                    let c = candidates_in_col[i];
                    if (c / 9 / 3) * 3 + (c % 9 / 3) != box0 {
                        all_same_box = false;
                        break;
                    }
                }
                
                if all_same_box {
                    // All in same box
                    let mut eliminations = Vec::new();
                    for &cell in &BOXES[box0] {
                         // Check if cell is in candidates_in_col
                        let mut is_candidate = false;
                        for i in 0..count {
                            if candidates_in_col[i] == cell {
                                is_candidate = true;
                                break;
                            }
                        }
                        
                        if !is_candidate && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                            eliminations.push((cell, d as u8));
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 14.0,
                            technique: "box_line_reduction",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
            }
        }
    }
    None
}

fn detect_x_wing(grid: &Grid) -> Option<Hint> {
    for d in 1..=9 {
        // Rows
        let mut rows_with_2 = [0usize; 9]; // Stores row index
        let mut row_cells = [[0usize; 2]; 9]; // Stores the 2 cell indices for each row
        let mut count = 0;
        
        for r in 0..9 {
            let mut cells = [0usize; 9];
            let mut c_count = 0;
            for &cell in &ROWS[r] {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    cells[c_count] = cell;
                    c_count += 1;
                }
            }
            if c_count == 2 {
                rows_with_2[count] = r;
                row_cells[count][0] = cells[0];
                row_cells[count][1] = cells[1];
                count += 1;
            }
        }
        
        for i in 0..count {
            for j in i+1..count {
                let r1 = rows_with_2[i];
                let r2 = rows_with_2[j];
                let cells1 = row_cells[i];
                let cells2 = row_cells[j];
                
                let c1a = cells1[0] % 9;
                let c1b = cells1[1] % 9;
                let c2a = cells2[0] % 9;
                let c2b = cells2[1] % 9;
                
                if c1a == c2a && c1b == c2b {
                    // Found X-Wing in Rows (elim in Cols)
                    let mut eliminations = Vec::new();
                    for &c in &[c1a, c1b] {
                        for &cell in &COLS[c] {
                            if cell != cells1[0] && cell != cells1[1] && cell != cells2[0] && cell != cells2[1] && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                                eliminations.push((cell, d as u8));
                            }
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 46.0,
                            technique: "x_wing",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
            }
        }
        
        // Cols
        let mut cols_with_2 = [0usize; 9];
        let mut col_cells = [[0usize; 2]; 9];
        let mut count = 0;
        
        for c in 0..9 {
            let mut cells = [0usize; 9];
            let mut c_count = 0;
            for &cell in &COLS[c] {
                if grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                    cells[c_count] = cell;
                    c_count += 1;
                }
            }
            if c_count == 2 {
                cols_with_2[count] = c;
                col_cells[count][0] = cells[0];
                col_cells[count][1] = cells[1];
                count += 1;
            }
        }
        
        for i in 0..count {
            for j in i+1..count {
                let c1 = cols_with_2[i];
                let c2 = cols_with_2[j];
                let cells1 = col_cells[i];
                let cells2 = col_cells[j];
                
                let r1a = cells1[0] / 9;
                let r1b = cells1[1] / 9;
                let r2a = cells2[0] / 9;
                let r2b = cells2[1] / 9;
                
                if r1a == r2a && r1b == r2b {
                    // Found X-Wing in Cols (elim in Rows)
                    let mut eliminations = Vec::new();
                    for &r in &[r1a, r1b] {
                        for &cell in &ROWS[r] {
                            if cell != cells1[0] && cell != cells1[1] && cell != cells2[0] && cell != cells2[1] && grid.values[cell] == 0 && (grid.candidates[cell] >> (d - 1)) & 1 == 1 {
                                eliminations.push((cell, d as u8));
                            }
                        }
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 46.0,
                            technique: "x_wing",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
            }
        }
    }
    None
}

fn detect_y_wing(grid: &Grid) -> Option<Hint> {
    let mut bivalue_cells = Vec::new();
    for i in 0..SIZE {
        if grid.values[i] == 0 && grid.candidates[i].count_ones() == 2 {
            bivalue_cells.push(i);
        }
    }
    
    if bivalue_cells.len() < 3 { return None; }
    
    for i in 0..bivalue_cells.len() {
        for j in i+1..bivalue_cells.len() {
            for k in j+1..bivalue_cells.len() {
                let c1 = bivalue_cells[i];
                let c2 = bivalue_cells[j];
                let c3 = bivalue_cells[k];
                
                // Try each as pivot
                if let Some(h) = check_y_wing(grid, c1, c2, c3) { return Some(h); }
                if let Some(h) = check_y_wing(grid, c2, c1, c3) { return Some(h); }
                if let Some(h) = check_y_wing(grid, c3, c1, c2) { return Some(h); }
            }
        }
    }
    None
}

fn check_y_wing(grid: &Grid, pivot: usize, p1: usize, p2: usize) -> Option<Hint> {
    if !can_see(pivot, p1) || !can_see(pivot, p2) { return None; }
    
    let cand_pivot = grid.candidates[pivot];
    let cand_p1 = grid.candidates[p1];
    let cand_p2 = grid.candidates[p2];
    
    // Union of all candidates must have exactly 3 bits set
    let all_cands = cand_pivot | cand_p1 | cand_p2;
    if all_cands.count_ones() != 3 { return None; }
    
    // Check structure: Pivot(AB), P1(AC), P2(BC)
    // Common between Pivot and P1: A
    let common_p1 = cand_pivot & cand_p1;
    if common_p1.count_ones() != 1 { return None; }
    
    // Common between Pivot and P2: B
    let common_p2 = cand_pivot & cand_p2;
    if common_p2.count_ones() != 1 { return None; }
    
    let a = common_p1;
    let b = common_p2;
    
    if a == b { return None; }
    
    // C must be in P1 and P2, but not A or B
    let c_p1 = cand_p1 & !a;
    let c_p2 = cand_p2 & !b;
    
    if c_p1.count_ones() != 1 || c_p2.count_ones() != 1 { return None; }
    let c = c_p1;
    if c != c_p2 { return None; }
    
    // c is a bitmask (1 << (digit-1))
    let digit_c = c.trailing_zeros() as u8 + 1;
    
    // Elimination: Cells seeing both P1 and P2 containing C
    let mut eliminations = Vec::new();
    let peers1 = get_peers(p1);
    let peers2 = get_peers(p2);
    
    for &peer in &peers1 {
        if peers2.contains(&peer) && grid.values[peer] == 0 && (grid.candidates[peer] & c) != 0 {
            eliminations.push((peer, digit_c));
        }
    }
    
    if !eliminations.is_empty() {
        return Some(Hint {
            difficulty: 50.0,
            technique: "y_wing",
            eliminations,
            placements: vec![],
        });
    }
    
    None
}

fn can_see(s1: usize, s2: usize) -> bool {
    let r1 = s1 / 9;
    let c1 = s1 % 9;
    let b1 = (r1 / 3) * 3 + (c1 / 3);
    
    let r2 = s2 / 9;
    let c2 = s2 % 9;
    let b2 = (r2 / 3) * 3 + (c2 / 3);
    
    r1 == r2 || c1 == c2 || b1 == b2
}

fn detect_simple_coloring(grid: &Grid) -> Option<Hint> {
    // Simplified implementation of Simple Coloring
    // Only checking Rule 2 (Conflict) and Rule 4 (Witness)
    // Using BFS to build chains
    
    // We build graphs for all 9 digits in one pass
    // neighbors[d][cell * 4 + i]
    // But 9 * 81 * 4 * 8 bytes = 23KB on stack. Might be too big?
    // 23KB is fine for stack (usually 1MB+).
    // Let's use a single flat array: neighbors[d * 324 + cell * 4 + i]
    // 9 * 324 = 2916 usize elements. 2916 * 4 bytes (wasm32) = ~11KB. Safe.
    
    // Bitwise Counting Optimization
    // We scan each unit once to find digits that appear exactly twice
    
    let mut neighbor_counts = [0usize; 729]; // 9 * 81
    let mut neighbors = [0usize; 2916]; // 9 * 81 * 4
    let mut has_links = [false; 9];
    
    for unit in ROWS.iter().chain(COLS.iter()).chain(BOXES.iter()) {
        let mut seen_once = 0u16;
        let mut seen_twice = 0u16;
        let mut seen_more = 0u16;
        
        // Pass 1: Count occurrences using bitmasks
        for &cell in unit.iter() {
            if grid.values[cell] == 0 {
                let c = grid.candidates[cell];
                seen_more |= seen_twice & c;
                seen_twice |= seen_once & c;
                seen_once |= c;
            }
        }
        
        let exactly_twice = seen_twice & !seen_more;
        
        if exactly_twice == 0 { continue; }
        
        // Pass 2: Find the cells for the valid digits
        // We only care about digits in exactly_twice
        
        let mut found_first = 0u16;
        let mut firsts = [0usize; 9];
        
        for &cell in unit.iter() {
            if grid.values[cell] == 0 {
                let c = grid.candidates[cell] & exactly_twice;
                if c == 0 { continue; }
                
                for d in 0..9 {
                    if (c >> d) & 1 == 1 {
                        if (found_first >> d) & 1 == 0 {
                            firsts[d] = cell;
                            found_first |= 1 << d;
                        } else {
                            // Found second one, add edge
                            let c1 = firsts[d];
                            let c2 = cell;
                            let base_idx = d * 81;
                            let base_neighbor_idx = d * 324;
                            
                            if neighbor_counts[base_idx + c1] < 4 {
                                neighbors[base_neighbor_idx + c1 * 4 + neighbor_counts[base_idx + c1]] = c2;
                                neighbor_counts[base_idx + c1] += 1;
                            }
                            if neighbor_counts[base_idx + c2] < 4 {
                                neighbors[base_neighbor_idx + c2 * 4 + neighbor_counts[base_idx + c2]] = c1;
                                neighbor_counts[base_idx + c2] += 1;
                            }
                            has_links[d] = true;
                        }
                    }
                }
            }
        }
    }
    
    // Now process each digit
    for d_idx in 0..9 {
        if !has_links[d_idx] { continue; }
        
        let d = (d_idx + 1) as u8;
        let base_idx = d_idx * 81;
        let base_neighbor_idx = d_idx * 324;
        
        let mut colors = [0i8; 81]; // 0 = unvisited, 1 = color A, 2 = color B
        
        for start_node in 0..81 {
            if neighbor_counts[base_idx + start_node] > 0 && colors[start_node] == 0 {
                // BFS/DFS
                let mut stack = [0usize; 81];
                let mut stack_ptr = 0;
                
                stack[stack_ptr] = start_node;
                stack_ptr += 1;
                colors[start_node] = 1; 
                
                let mut color_a_nodes = [0usize; 81];
                let mut color_a_count = 0;
                let mut color_b_nodes = [0usize; 81];
                let mut color_b_count = 0;
                
                color_a_nodes[color_a_count] = start_node;
                color_a_count += 1;
                
                while stack_ptr > 0 {
                    stack_ptr -= 1;
                    let node = stack[stack_ptr];
                    let current_color = colors[node];
                    let next_color = if current_color == 1 { 2 } else { 1 };
                    
                    let count = neighbor_counts[base_idx + node];
                    for i in 0..count {
                        let neighbor = neighbors[base_neighbor_idx + node * 4 + i];
                        if colors[neighbor] == 0 {
                            colors[neighbor] = next_color;
                            stack[stack_ptr] = neighbor;
                            stack_ptr += 1;
                            
                            if next_color == 1 {
                                color_a_nodes[color_a_count] = neighbor;
                                color_a_count += 1;
                            } else {
                                color_b_nodes[color_b_count] = neighbor;
                                color_b_count += 1;
                            }
                        } else if colors[neighbor] == current_color {
                            // Conflict
                        }
                    }
                }
                
                // Rule 2
                let mut false_color = 0;
                if check_color_conflict_fast(&color_a_nodes[0..color_a_count]) { false_color = 1; }
                else if check_color_conflict_fast(&color_b_nodes[0..color_b_count]) { false_color = 2; }
                
                if false_color != 0 {
                    let mut eliminations = Vec::new();
                    let target_nodes = if false_color == 1 { &color_a_nodes[0..color_a_count] } else { &color_b_nodes[0..color_b_count] };
                    for &cell in target_nodes {
                        eliminations.push((cell, d));
                    }
                    if !eliminations.is_empty() {
                        return Some(Hint {
                            difficulty: 54.0,
                            technique: "simple_coloring",
                            eliminations,
                            placements: vec![],
                        });
                    }
                }
                
                // Rule 4
                let mut eliminations = Vec::new();
                for i in 0..SIZE {
                    if grid.values[i] == 0 && (grid.candidates[i] >> d_idx) & 1 == 1 && colors[i] == 0 {
                        let mut sees_a = false;
                        let mut sees_b = false;
                        for &peer in &get_peers(i) {
                            if colors[peer] == 1 { sees_a = true; }
                            else if colors[peer] == 2 { sees_b = true; }
                        }
                        if sees_a && sees_b {
                            eliminations.push((i, d));
                        }
                    }
                }
                
                if !eliminations.is_empty() {
                    return Some(Hint {
                        difficulty: 54.0,
                        technique: "simple_coloring",
                        eliminations,
                        placements: vec![],
                    });
                }
                
                // Mark visited as processed (3) to avoid re-processing in this digit
                for i in 0..color_a_count { colors[color_a_nodes[i]] = 3; }
                for i in 0..color_b_count { colors[color_b_nodes[i]] = 3; }
            }
        }
    }
    None
}

fn check_color_conflict_fast(cells: &[usize]) -> bool {
    for i in 0..cells.len() {
        for j in i+1..cells.len() {
            if can_see(cells[i], cells[j]) {
                return true;
            }
        }
    }
    false
}
