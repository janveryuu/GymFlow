/* eslint-env node */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'node_modules', '@bryllim', 'workout-guide', 'assets');
const targetAssetsDir = path.join(rootDir, 'assets', 'workouts');
const targetMapFile = path.join(rootDir, 'src', 'assets', 'workoutAssetMap.ts');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(targetAssetsDir)) {
    fs.mkdirSync(targetAssetsDir, { recursive: true });
  }
  console.log('Copying @bryllim/workout-guide assets to local assets/workouts...');
  fs.cpSync(srcDir, targetAssetsDir, { recursive: true });
  console.log('Workout assets copied successfully.');
} else if (!fs.existsSync(targetAssetsDir)) {
  console.error('Error: Source @bryllim/workout-guide assets not found and local assets/workouts does not exist.');
  process.exit(1);
}

const exerciseDirs = fs
  .readdirSync(targetAssetsDir)
  .filter((f) => fs.statSync(path.join(targetAssetsDir, f)).isDirectory())
  .sort();

console.log(`Found ${exerciseDirs.length} exercise asset directories.`);

let code = '/* Auto-generated workout asset map for offline bundler support */\n';
code += 'export const workoutAssetMap: Record<string, any[]> = {\n';

for (const slug of exerciseDirs) {
  code += `  '${slug}': [\n`;
  code += `    require('../../assets/workouts/${slug}/frame-1.png'),\n`;
  code += `    require('../../assets/workouts/${slug}/frame-2.png'),\n`;
  code += `    require('../../assets/workouts/${slug}/frame-3.png'),\n`;
  code += '  ],\n';
}

code += '};\n\n';
code += `export function getLocalWorkoutFrame(slug: string, frame: 1 | 2 | 3 = 1) {
  const frames = workoutAssetMap[slug];
  if (frames && frames[frame - 1]) return frames[frame - 1];
  return null;
}
`;

const targetMapDir = path.dirname(targetMapFile);
if (!fs.existsSync(targetMapDir)) {
  fs.mkdirSync(targetMapDir, { recursive: true });
}

fs.writeFileSync(targetMapFile, code, 'utf8');
console.log(`Successfully generated ${targetMapFile} with ${exerciseDirs.length} exercises.`);
