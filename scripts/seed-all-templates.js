import { seedTemplates } from './seed-latex-templates.js';

// Run the seeding process
console.log('Starting LaTeX template seeding process...');
seedTemplates().then(() => {
  console.log('LaTeX template seeding completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Error during seeding:', error);
  process.exit(1);
}); 