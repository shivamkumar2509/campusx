const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const conv = require("../controllers/conversation.controller");
const msg = require("../controllers/message.controller");

const router = express.Router();

// Conversations
router.get("/conversations", auth, conv.listMyConversations);
router.get("/teams/:teamId/conversation", auth, conv.getTeamConversation);
router.get("/conversations/:convId/messages", auth, conv.listMessages);
router.patch("/conversations/:convId/mute", auth, conv.toggleMute);

// Messages
router.post("/conversations/:convId/messages", auth, msg.sendMessage);
router.patch("/messages/:messageId", auth, msg.editMessage);
router.delete("/messages/:messageId", auth, msg.deleteMessage);

// Attachments on message
router.post("/messages/:messageId/attachments", auth, msg.attachToMessage);
router.get("/messages/:messageId/attachments", auth, msg.listAttachments);

router.use(routeError);
module.exports = router;
