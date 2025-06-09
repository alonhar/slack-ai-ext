import crypto from 'node:crypto';
import * as asar from '@electron/asar';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ALGORITHM = 'SHA256';

export function generateAsarIntegrity(asarPath) {
  // Ensure the file exists before attempting to read it
  if (!fs.existsSync(asarPath)) {
    throw new Error(`ASAR file not found at path: ${asarPath}`);
  }
  const headerString = asar.getRawHeader(asarPath).headerString;
  const hash = crypto.createHash(ALGORITHM).update(headerString).digest('hex');
  
  return {
    algorithm: ALGORITHM,
    hash: hash,
  };
};

// This part makes it runnable from the command line
async function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Error: Please provide an ASAR file path as an argument.');
        console.error('Usage: node integrity.js <path_to_asar_file>');
        process.exit(1);
    }

    try {
        const integrity = generateAsarIntegrity(filePath);
        console.log(integrity.hash);
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        process.exit(1);
    }
}

// Check if the script is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
} 