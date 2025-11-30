import { generateByCategory } from './generator.js';

const ITERATIONS = 5;
const CATEGORY = 'tough';

console.log(
	`Benchmarking generateByCategory('${CATEGORY}') for ${ITERATIONS} iterations...`,
);

let totalTime = 0;

for (let i = 0; i < ITERATIONS; i++) {
	const start = Date.now();
	const result = generateByCategory(CATEGORY);
	const end = Date.now();
	const duration = end - start;
	totalTime += duration;
	console.log(
		`Iteration ${i + 1}: ${duration}ms (Difficulty: ${result.actualDifficulty}, Clues: ${result.clues})`,
	);
}

const averageTime = totalTime / ITERATIONS;
console.log(`Average time: ${averageTime}ms`);
