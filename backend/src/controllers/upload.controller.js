const { generateUploadSignature } = require("../services/cloudinary.service");
const HttpError = require("../utils/httpError");

// POST /api/uploads/signature
exports.getUploadSignature = async (req, res) => {
  const { folder, resource_type } = req.body || {};

  try {
    const payload = generateUploadSignature({
      folder:
        typeof folder === "string" && folder.trim() ? folder.trim() : "campusx",
      resourceType: resource_type === "raw" ? "raw" : "image",
    });

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    throw new HttpError(500, "CLOUDINARY_NOT_CONFIGURED", err.message);
  }
};
