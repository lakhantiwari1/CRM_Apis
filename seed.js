require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models/User');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out in production)
    // await User.deleteMany({});

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@crm.com' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@crm.com',
        phone: '+1234567890',
        password: 'Admin@123',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created: admin@crm.com / Admin@123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create a Sales Manager
    const managerExists = await User.findOne({ email: 'manager@crm.com' });
    if (!managerExists) {
      await User.create({
        name: 'Sales Manager',
        email: 'manager@crm.com',
        phone: '+1234567891',
        password: 'Manager@123',
        role: 'sales_manager',
        isActive: true,
      });
      console.log('✅ Manager user created: manager@crm.com / Manager@123');
    }

    // Create a Sales Executive
    const execExists = await User.findOne({ email: 'executive@crm.com' });
    if (!execExists) {
      await User.create({
        name: 'Sales Executive',
        email: 'executive@crm.com',
        phone: '+1234567892',
        password: 'Executive@123',
        role: 'sales_executive',
        isActive: true,
      });
      console.log('✅ Executive user created: executive@crm.com / Executive@123');
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin:     admin@crm.com     / Admin@123');
    console.log('   Manager:   manager@crm.com   / Manager@123');
    console.log('   Executive: executive@crm.com / Executive@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
