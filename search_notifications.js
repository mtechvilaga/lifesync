const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('notify') || line.toLowerCase().includes('notification') || line.toLowerCase().includes('showtoast')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
