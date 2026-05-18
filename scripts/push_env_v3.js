const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const splitIndex = trimmed.indexOf('=');
  if (splitIndex === -1) continue;
  
  const key = trimmed.slice(0, splitIndex).trim();
  let value = trimmed.slice(splitIndex + 1).trim();
  
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  console.log(`Adding ${key}...`);
  const envs = ['production', 'preview', 'development'];
  
  for (const env of envs) {
    try {
      execSync(`cmd.exe /c vercel env add ${key} ${env}`, { 
        input: value, 
        stdio: ['pipe', 'ignore', 'ignore'] 
      });
    } catch (e) {
      // Ignore if exists
    }
  }
}
console.log("Done adding env variables!");
