const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/chat.controller");

const router = express.Router();

router.get("/conversations/:convId/messages", auth, c.listMessages);
router.post(
  "/conversations/:convId/messages",
  auth,
  audit("chat.message.send", "Message"),
  c.sendMessage,
);
router.post("/conversations/:convId/read", auth, c.markConversationRead);
router.post(
  "/conversations/:convId/attachments",
  auth,
  audit("chat.attachment.add", "Attachment"),
  c.addAttachment,
);
router.patch(
  "/messages/:messageId",
  auth,
  audit("chat.message.edit", "Message"),
  c.editMessage,
);

router.use(routeError);

module.exports = router;
