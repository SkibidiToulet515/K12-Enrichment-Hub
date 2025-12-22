const JWT_SECRET = process.env.JWT_SECRET || 'real_user_auth_secret_2025';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production.');
}

module.exports = {
  JWT_SECRET
};
