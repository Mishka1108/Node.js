// utils/adminSeeder.js
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    // შევამოწმოთ არსებობს თუ არა ადმინი
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    
    if (!existingAdmin) {
      // შექმენით ახალი ადმინი
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = new Admin({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'superadmin'
      });
      
      await newAdmin.save();
      console.log('✅ Default admin account created');
    } else {
      console.log('✅ Default admin account already exists');
    }
  } catch (err) {
    console.error('❌ Error managing admin account:', err);
  }
};

module.exports = seedAdmin;