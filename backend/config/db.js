const mongoose = require('mongoose');

let cached = null;

async function connectDB(){
  // Agar pehle se connected hai to wahi connection use karo
  if (cached && mongoose.connection.readyState === 1) return cached;

  // Nahi to naya connection banao aur yaad rakh lo
  cached = await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  return cached;
}

module.exports = connectDB;
