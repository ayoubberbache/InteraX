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
  try {
    execSync(`cmd.exe /c vercel env add ${key} production preview development`, { 
      input: value, 
      stdio: ['pipe', 'inherit', 'inherit'] 
    });
  } catch (e) {
    console.error(`Failed to add ${key}`);
  }
}
console.log("Done!");
