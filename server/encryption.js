const crypto = require('crypto');

// Use environment variable or fallback for development
const SECRET = process.env.ENCRYPTION_KEY || 'unimanage_secret_key_fallback_123';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET, 'salt', 32); 
const ALGORITHM = 'aes-256-cbc';

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    content: encrypted
  };
};

const decrypt = (hash) => {
  const iv = Buffer.from(hash.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(hash.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { encrypt, decrypt };
