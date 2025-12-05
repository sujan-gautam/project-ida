// Quick script to make sujaan1919@gmail.com an admin
// Run this with: node scripts/quick-make-admin.js

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Match the User model structure
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: String,
  name: String,
  isAdmin: {
    type: Boolean,
    default: false,
  },
}, { 
  timestamps: true,
  collection: 'users' 
});

const User = mongoose.model('User', UserSchema);

async function makeAdmin() {
  const email = 'sujaan1919@gmail.com';
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/data-analysis';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { isAdmin: true } },
      { new: true }
    );

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      console.log('\nChecking available users...');
      const allUsers = await User.find({}, 'name email isAdmin');
      if (allUsers.length === 0) {
        console.log('  No users found in database. Please create a user first.');
      } else {
        console.log('  Available users:');
        allUsers.forEach((u) => {
          console.log(`    - ${u.name} (${u.email}) - Admin: ${u.isAdmin || false}`);
        });
      }
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n✅ Success! User "${user.name}" (${user.email}) is now an admin!`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`\n🎉 You can now access the admin panel at /admin/dashboard`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

makeAdmin();

