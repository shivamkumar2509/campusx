const router = require("express").Router();
const {
  signup,
  login,
  me,
  changePassword,
} = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");
const { audit } = require("../middleware/audit.middleware");

router.post("/signup", audit("auth.signup", "User"), signup);
router.post("/login", audit("auth.login", "User"), login);
router.get("/me", auth, me);
router.post(
  "/change-password",
  auth,
  audit("auth.password.change", "User"),
  changePassword,
);

module.exports = router;
