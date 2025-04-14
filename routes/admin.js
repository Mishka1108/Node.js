const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

// ადმინის შესვლა
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'არასწორი ელფოსტა ან პაროლი' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'არასწორი ელფოსტა ან პაროლი' });
    }
    
    const token = jwt.sign(
      { adminId: admin._id }, 
      process.env.ADMIN_JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    res.status(200).json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა შესვლისას' });
  }
});

// ადმინის მიმდინარე სესიის ინფორმაცია
router.get('/me', adminAuth, (req, res) => {
  try {
    res.status(200).json({
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა პროფილის მიღებისას' });
  }
});

// შევქმნათ ახალი ადმინის დამატების მარშრუტი
router.post('/create-admin', adminAuth, async (req, res) => {
  const { name, email, password, role } = req.body;
  
  // მხოლოდ სუპერადმინისტრატორს შეუძლია სხვა ადმინების შექმნა
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'მხოლოდ სუპერადმინისტრატორს აქვს ადმინების შექმნის უფლება' });
  }

  try {
    // შევამოწმოთ არ არსებობს თუ არა უკვე ასეთი ელფოსტით ადმინი
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'ასეთი ელფოსტით ადმინი უკვე არსებობს' });
    }

    // დავაჰეშოთ პაროლი
    const hashedPassword = await bcrypt.hash(password, 10);

    // შევქმნათ ახალი ადმინი
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: role || 'admin'
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'ადმინი წარმატებით შეიქმნა',
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა ადმინის შექმნისას' });
  }
});

// ადმინების სიის მიღება
router.get('/admins', adminAuth, async (req, res) => {
  // მხოლოდ სუპერადმინისტრატორს შეუძლია ადმინების სიის ნახვა
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'მხოლოდ სუპერადმინისტრატორს აქვს ადმინების სიის ნახვის უფლება' });
  }

  try {
    const admins = await Admin.find().select('-password');
    
    res.status(200).json({
      admins
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა ადმინების სიის მიღებისას' });
  }
});

// ადმინის წაშლა
router.delete('/admins/:id', adminAuth, async (req, res) => {
  // მხოლოდ სუპერადმინისტრატორს შეუძლია ადმინების წაშლა
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'მხოლოდ სუპერადმინისტრატორს აქვს ადმინების წაშლის უფლება' });
  }

  try {
    // არ დავუშვათ საკუთარი თავის წაშლა
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ message: 'საკუთარი თავის წაშლა არ შეიძლება' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'ადმინი ვერ მოიძებნა' });
    }

    res.status(200).json({ message: 'ადმინი წარმატებით წაიშალა' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა ადმინის წაშლისას' });
  }
});

// მომხმარებელთა ანალიტიკა
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    // მივიღოთ რეგისტრაციების რაოდენობა ბოლო 30 დღის განმავლობაში დღეების მიხედვით
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationsByDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // ვერიფიკაციის სტატისტიკა
    const verificationStats = {
      verified: await User.countDocuments({ isVerified: true }),
      unverified: await User.countDocuments({ isVerified: false }),
      verificationRate: 0
    };
    
    const totalUsers = verificationStats.verified + verificationStats.unverified;
    verificationStats.verificationRate = totalUsers > 0 
      ? (verificationStats.verified / totalUsers * 100).toFixed(2) 
      : 0;
      
    res.status(200).json({
      registrationsByDay,
      verificationStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა ანალიტიკის მიღებისას' });
  }
});

// პროფილის განახლება
router.put('/profile', adminAuth, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  
  try {
    const admin = await Admin.findById(req.admin._id);
    
    // განვაახლოთ სახელი და ელფოსტა თუ მოცემულია
    if (name) admin.name = name;
    
    // თუ ელფოსტას ვცვლით, უნდა შევამოწმოთ არ არის თუ არა დაკავებული
    if (email && email !== admin.email) {
      const emailExists = await Admin.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'ასეთი ელფოსტა უკვე დაკავებულია' });
      }
      admin.email = email;
    }
    
    // პაროლის შეცვლა (თუ მოცემულია)
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'მიმდინარე პაროლი არასწორია' });
      }
      
      // პაროლის სიძლიერის შემოწმება
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'ახალი პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს' });
      }
      
      admin.password = await bcrypt.hash(newPassword, 10);
    }
    
    await admin.save();
    
    res.status(200).json({
      message: 'პროფილი განახლდა წარმატებით',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა პროფილის განახლებისას' });
  }
});

// სისტემური ანგარიში
router.get('/system-info', adminAuth, async (req, res) => {
  try {
    // მხოლოდ სუპერადმინისტრატორს შეუძლია სისტემური ინფორმაციის ნახვა
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'მხოლოდ სუპერადმინისტრატორს აქვს სისტემური ინფორმაციის ნახვის უფლება' });
    }
    
    // ბაზის სტატისტიკა
    const dbStats = {
      users: await User.countDocuments(),
      admins: await Admin.countDocuments()
    };
    
    // აპის სტატისტიკა
    const apiInfo = {
      name: 'Auth API',
      version: '1.0.0',
      uptime: process.uptime(), // სერვერის აპტაიმი წამებში
      node: process.version,
      memory: process.memoryUsage()
    };
    
    res.status(200).json({
      database: dbStats,
      api: apiInfo,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა სისტემური ინფორმაციის მიღებისას' });
  }
});

// მომხმარებლის რედაქტირება (ადმინისთვის)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, firstName, lastName, age, email, isVerified } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    // განვაახლოთ ველები თუ მოცემულია
    if (name) user.name = name;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (age) user.age = age;
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'ეს ელფოსტა უკვე დაკავებულია' });
      }
      user.email = email;
    }
    if (isVerified !== undefined) user.isVerified = isVerified;
    
    await user.save();
    
    res.status(200).json({
      message: 'მომხმარებელი განახლდა წარმატებით',
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა მომხმარებლის განახლებისას' });
  }
});

// კონკრეტული მომხმარებლის ნახვა
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა მომხმარებლის მიღებისას' });
  }
});

// მომხმარებელთა სია პაგინაციით
router.get('/users-paginated', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    
    let query = {};
    if (searchQuery) {
      query = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } }
        ]
      };
    }
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა მომხმარებლების სიის მიღებისას' });
  }
});

// ფილტრაცია და დალაგება
router.get('/users-advanced', adminAuth, async (req, res) => {
  try {
    const { sort, order, isVerified, minAge, maxAge } = req.query;
    
    // ფილტრაცია
    let query = {};
    
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }
    
    if (minAge !== undefined || maxAge !== undefined) {
      query.age = {};
      if (minAge !== undefined) query.age.$gte = parseInt(minAge);
      if (maxAge !== undefined) query.age.$lte = parseInt(maxAge);
    }
    
    // დალაგება
    let sortOptions = { createdAt: -1 }; // ნაგულისხმევად ახლიდან ძველისკენ
    if (sort && ['name', 'email', 'createdAt', 'age'].includes(sort)) {
      sortOptions = { [sort]: order === 'asc' ? 1 : -1 };
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions);
    
    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა მომხმარებლების სიის მიღებისას' });
  }
});

// მომხმარებელთა წაშლა (ადმინისთვის)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    res.status(200).json({ message: 'მომხმარებელი წარმატებით წაიშალა' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'შეცდომა მომხმარებლის წაშლისას' });
  }
});

module.exports = router;