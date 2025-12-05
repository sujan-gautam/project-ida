// Script to make a user an admin
// Usage: node scripts/make-admin.js <email>

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// User schema (simplified)
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  isAdmin: Boolean,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function makeAdmin(email) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/data-analysis';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find and update user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { isAdmin: true } },
      { new: true }
    );

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`✅ User "${user.name}" (${user.email}) is now an admin!`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin: ${user.isAdmin}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'sujaan1919@gmail.com';

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

makeAdmin(email);

