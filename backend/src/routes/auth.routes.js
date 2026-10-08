const router = require("express").Router();
const { signup, login, me } = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", auth, me);

module.exports = router;
