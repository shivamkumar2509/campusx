const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const upload = require("../controllers/upload.controller");
const att = require("../controllers/attachment.controller");

const router = express.Router();

router.post("/uploads/signature", auth, upload.getUploadSignature);

// Task attachments
router.post("/tasks/:taskId/attachments", auth, att.attachToTask);
router.get("/tasks/:taskId/attachments", auth, att.listTaskAttachments);

router.use(routeError);
module.exports = router;
