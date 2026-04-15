const mongoose = require("mongoose");

// Simple Dashboard Data Model - stores only data displayed in dashboard
const dashboardDataSchema = new mongoose.Schema(
  {
    meterId: {
      type: String,
      default: "simulator",
      index: true,
    },
    current: {
      type: Number,
      required: true,
    },
    voltage: {
      type: Number,
      default: 230,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    integrityVerified: {
      type: Boolean,
      default: false,
    },
    payloadHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: "dashboard_data",
  }
);

// Index for efficient queries
dashboardDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model("DashboardData", dashboardDataSchema);
