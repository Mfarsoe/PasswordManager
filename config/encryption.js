const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const KEY_FILE = path.join(__dirname, '..', 'vault.key');

// Retrieves the encryption key from the vault.key file or generates a new one if it doesn't exist.
function getOrCreateKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key);
  console.log('Vault key genereret og gemt i vault.key');
  return key;
}

// Encrypts a vault object and returns an encrypted file payload string.
function encryptVault(data) {
  const key = getOrCreateKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypts an encrypted file payload string and returns the original vault object.
function decryptVault(encryptedData) {
  const key = getOrCreateKey();
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

module.exports = { encryptVault, decryptVault };