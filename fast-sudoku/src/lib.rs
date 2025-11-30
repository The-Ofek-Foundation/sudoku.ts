
mod utils;
mod grid;
mod solver;
mod generator;
mod difficulty;
mod techniques;

use wasm_bindgen::prelude::*;
use generator::Generator;

#[wasm_bindgen]
pub fn generate_by_category_fast(category: &str) -> String {
    let mut gen = Generator::new();
    gen.generate(category)
}

#[wasm_bindgen]
pub fn generate_with_seed_fast(category: &str, seed: u64) -> String {
    let mut gen = Generator::new_with_seed(seed);
    gen.generate(category)
}

#[wasm_bindgen]
pub fn evaluate_difficulty_fast(puzzle_str: &str) -> i32 {
    let grid = crate::grid::Grid::from_string(puzzle_str);
    crate::difficulty::evaluate_difficulty(&grid).score
}
