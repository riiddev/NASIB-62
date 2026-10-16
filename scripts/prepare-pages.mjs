import { writeFileSync } from 'node:fs';

writeFileSync('dist/.nojekyll', '');
console.log('GitHub Pages artifact prepared in dist/');
