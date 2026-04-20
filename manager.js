const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encryptVault, decryptVault } = require('./config/encryption');

const VAULT_PATH = path.join(__dirname, 'vault.encrypted');
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const CHECK_TEXT = 'vault-check-ok';
const DEFAULT_GENERATED_PASSWORD_LENGTH = 20;

// Converts a Buffer to a Base64 string.
function toB64(buffer) {
  return buffer.toString('base64');
}

// Converts a Base64 string back to a Buffer.
function fromB64(value) {
  return Buffer.from(value, 'base64');
}

// Derives a fixed-length encryption key from the master password and salt.
function deriveKey(masterPassword, saltB64, iterations = ITERATIONS) {
  return crypto.pbkdf2Sync(
    masterPassword,
    fromB64(saltB64),
    iterations,
    KEY_LENGTH,
    DIGEST
  );
}

// Encrypts a payload object using AES-256-GCM and returns an envelope.
function encryptRecord(payload, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: toB64(iv),
    tag: toB64(tag),
    data: toB64(encrypted)
  };
}

// Decrypts an AES-256-GCM envelope and returns the original payload object.
function decryptRecord(envelope, key) {
  const iv = fromB64(envelope.iv);
  const tag = fromB64(envelope.tag);
  const data = fromB64(envelope.data);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// Reads and parses the encrypted vault file from disk.
function readVault() {
  if (!fs.existsSync(VAULT_PATH)) {
    throw new Error('Vault findes ikke. Kør: node manager.js init <masterPassword>');
  }

  const raw = fs.readFileSync(VAULT_PATH, 'utf8');
  return decryptVault(raw);
}

// Writes the vault object to disk as encrypted data.
function writeVault(vault) {
  const encrypted = encryptVault(vault);
  fs.writeFileSync(VAULT_PATH, encrypted, 'utf8');
}

// Validates the master password by decrypting the stored password check value.
function validateMasterPassword(masterPassword, vault) {
  const key = deriveKey(masterPassword, vault.kdf.salt, vault.kdf.iterations);
  const check = decryptRecord(vault.passwordCheck, key);
  if (check.value !== CHECK_TEXT) {
    throw new Error('Forkert master password.');
  }
  return key;
}

// Generates a random password with configurable length.
function generatePassword(length = DEFAULT_GENERATED_PASSWORD_LENGTH) {
  const passwordLength = Number(length);
  if (!Number.isInteger(passwordLength) || passwordLength < 8 || passwordLength > 128) {
    throw new Error('Ugyldig længde. Brug et helt tal mellem 8 og 128.');
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.?';
  const random = crypto.randomBytes(passwordLength);
  let generated = '';

  for (let index = 0; index < passwordLength; index += 1) {
    generated += chars[random[index] % chars.length];
  }

  return generated;
}

// Resolves password input by either using user input or generating a new password.
function resolvePasswordInput(passwordArg) {
  if (!passwordArg || passwordArg === '--generate' || passwordArg === '-g') {
    return generatePassword();
  }

  if (passwordArg.startsWith('--generate=')) {
    const lengthValue = passwordArg.split('=')[1];
    return generatePassword(lengthValue);
  }

  return passwordArg;
}

// Initializes a new encrypted vault using the provided master password.
function cmdInit(masterPassword) {
  if (!masterPassword) {
    throw new Error('Manglende parameter. Brug: node manager.js init <masterPassword>');
  }

  if (fs.existsSync(VAULT_PATH)) {
    throw new Error('Vault findes allerede. Slet vault.encrypted hvis du vil starte forfra.');
  }

  const salt = crypto.randomBytes(16);
  const key = deriveKey(masterPassword, toB64(salt), ITERATIONS);
  const passwordCheck = encryptRecord({ value: CHECK_TEXT }, key);

  const vault = {
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: {
      algorithm: 'pbkdf2',
      digest: DIGEST,
      iterations: ITERATIONS,
      keyLength: KEY_LENGTH,
      salt: toB64(salt)
    },
    passwordCheck,
    entries: []
  };

  writeVault(vault);
  console.log('Vault oprettet som krypteret fil (vault.encrypted)');
}

// Adds a new encrypted entry to the vault.
function cmdAdd(masterPassword, site, username, password) {
  if (!masterPassword || !site || !username) {
    throw new Error(
      'Manglende parametre. Brug: node manager.js add <masterPassword> "<site>" "<username>" ["<password>"|--generate|--generate=<længde>]'
    );
  }

  const vault = readVault();
  const key = validateMasterPassword(masterPassword, vault);
  const resolvedPassword = resolvePasswordInput(password);

  const entry = {
    site,
    username,
    password: resolvedPassword,
    createdAt: new Date().toISOString()
  };

  vault.entries.push(encryptRecord(entry, key));
  writeVault(vault);
  console.log(`Entry gemt for site: ${site}`);
  if (!password || password === '--generate' || password === '-g' || password.startsWith('--generate=')) {
    console.log(`Genereret password: ${resolvedPassword}`);
  }
}

// Decrypts and prints all stored entries from the vault.
function cmdList(masterPassword) {
  if (!masterPassword) {
    throw new Error('Manglende parameter. Brug: node manager.js list <masterPassword>');
  }

  const vault = readVault();
  const key = validateMasterPassword(masterPassword, vault);

  if (!vault.entries.length) {
    console.log('Ingen entries gemt endnu.');
    return;
  }

  console.log(`Fundet ${vault.entries.length} entries:\n`);

  vault.entries.forEach((encryptedEntry, index) => {
    const entry = decryptRecord(encryptedEntry, key);
    console.log(`#${index + 1}`);
    console.log(`Site     : ${entry.site}`);
    console.log(`Bruger   : ${entry.username}`);
    console.log(`Password : ${entry.password}`);
    console.log(`Oprettet : ${entry.createdAt}`);
    console.log('');
  });
}

// Prints command usage instructions.
function printHelp() {
  console.log('Brug:');
  console.log('  node manager.js init <masterPassword>');
  console.log('  node manager.js add <masterPassword> "<site>" "<username>" ["<password>"|--generate|--generate=<længde>]');
  console.log('  node manager.js list <masterPassword>');
}

// Parses CLI arguments and routes execution to the selected command.
function main() {
  const [, , command, ...args] = process.argv;

  try {
    if (!command) {
      printHelp();
      return;
    }

    if (command === 'init') {
      cmdInit(args[0]);
      return;
    }

    if (command === 'add') {
      cmdAdd(args[0], args[1], args[2], args[3]);
      return;
    }

    if (command === 'list') {
      cmdList(args[0]);
      return;
    }

    throw new Error(`Ukendt kommando: ${command}`);
  } catch (error) {
    console.error(`Fejl: ${error.message}`);
    process.exit(1);
  }
}

main();