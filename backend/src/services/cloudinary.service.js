const crypto = require("crypto");

/**
 * Generate a signature for a direct Cloudinary upload (unsigned preset alternative).
 * Frontend must POST multipart/form-data to:
 *   https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload
 * with fields: file, api_key, timestamp, folder, signature
 */
function generateUploadSignature({
  folder = "campusx",
  resourceType = "image",
} = {}) {
  const cloudName = process.env.CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary env vars missing (CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Params that must be signed — keep alphabetically sorted (Cloudinary requires it)
  const paramsToSign = {
    folder,
    timestamp,
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const toSign = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join("&");

  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return {
    signature,
    timestamp,
    folder,
    api_key: apiKey,
    cloud_name: cloudName,
    resource_type: resourceType,
    upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
  };
}

module.exports = { generateUploadSignature };
