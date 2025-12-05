// TypeScript script to make a user an admin
// Usage: ts-node scripts/make-admin.ts <email>

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function makeAdmin(email: string) {
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
      console.log('Available users in database:');
      const allUsers = await User.find({}, 'name email isAdmin');
      allUsers.forEach((u) => {
        console.log(`  - ${u.name} (${u.email}) - Admin: ${u.isAdmin || false}`);
      });
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n✅ User "${user.name}" (${user.email}) is now an admin!`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`\n🎉 Success! You can now access the admin panel.`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'sujaan1919@gmail.com';

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: ts-node scripts/make-admin.ts <email>');
  console.log('   Or: npm run make-admin <email>');
  process.exit(1);
}

makeAdmin(email);

