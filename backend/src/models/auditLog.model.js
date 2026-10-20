const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    entity_type: { type: String, default: "" },
    entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    ip_address: { type: String, default: "" },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ user_id: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
