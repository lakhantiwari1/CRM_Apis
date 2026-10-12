require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

let server;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed.');
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown on signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`\n🚀 CRM API Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`\n📌 Key Endpoints:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/leads`);
    console.log(`   GET    /api/customers`);
    console.log(`   GET    /api/deals`);
    console.log(`   GET    /api/activities`);
    console.log(`   GET    /api/dashboard/stats`);
    console.log(`   GET    /api/dashboard/pipeline`);
    console.log(`   GET    /api/timeline/:entityType/:entityId`);
    console.log(`\n✅ Server ready!\n`);
  });

  return server;
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
