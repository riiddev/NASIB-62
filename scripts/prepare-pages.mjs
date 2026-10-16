import { copyFileSync, writeFileSync } from 'node:fs';

// Vite builds from app.html so the source stays modular while GitHub Pages can
// continue using a root-branch publication without requiring a Settings change.
copyFileSync('dist/app.html', 'dist/index.html');
writeFileSync('dist/.nojekyll', '');
console.log('Prepared dist/index.html and .nojekyll for GitHub Pages.');
