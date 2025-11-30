
pub const SIZE: usize = 81;

#[derive(Clone, Copy, Debug)]
pub struct Grid {
    pub values: [u8; SIZE],
    pub candidates: [u16; SIZE],
}

impl Grid {
    pub fn new() -> Self {
        Grid {
            values: [0; SIZE],
            candidates: [0x1FF; SIZE], // All 9 bits set
        }
    }

    pub fn from_string(s: &str) -> Self {
        let mut grid = Grid::new();
        for (i, c) in s.chars().enumerate() {
            if i >= SIZE { break; }
            if let Some(d) = c.to_digit(10) {
                if d > 0 {
                    grid.set_value(i, d as u8);
                }
            }
        }
        grid
    }

    pub fn to_string(&self) -> String {
        let mut s = String::with_capacity(SIZE);
        for v in self.values.iter() {
            if *v == 0 {
                s.push('.');
            } else {
                s.push(std::char::from_digit(*v as u32, 10).unwrap());
            }
        }
        s
    }

    pub fn set_value(&mut self, index: usize, value: u8) {
        self.values[index] = value;
        self.candidates[index] = 0;
        // Propagate constraints? For now, just set.
        // In a real solver, we would update peers.
    }
    
    pub fn is_solved(&self) -> bool {
        self.values.iter().all(|&v| v != 0)
    }
}
