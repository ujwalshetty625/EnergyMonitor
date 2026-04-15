import mongoose from "mongoose";

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
    // Adding ML evaluation storage directly to the schema
    anomaly: {
      type: Boolean,
      default: false,
    },
    severity: {
      type: String,
      default: "normal",
    },
    confidence: {
      type: Number,
      default: 0.0,
    }
  },
  {
    timestamps: false,
    collection: "dashboard_data",
  }
);

// Index for efficient queries
dashboardDataSchema.index({ timestamp: -1 });

export default mongoose.model("DashboardData", dashboardDataSchema);
