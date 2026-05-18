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
  
  // Remove surrounding quotes if any
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  console.log(`Adding env var: ${key}...`);
  try {
    // Add to all environments
    execSync(`cmd.exe /c echo "${value}" | vercel env add ${key} production preview development`, { stdio: 'ignore' });
  } catch (e) {
    // If it already exists, Vercel throws an error. We can ignore it or rm and add.
    console.log(`Failed to add ${key} (might already exist)`);
  }
}
console.log("Finished adding env vars!");
