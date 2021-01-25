const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const messageController = require("../controllers/messageController");

// Messages routes
router.get("/", messageController.get_messages);

router.post("/", messageController.post_messages);

router.get("/:id/delete", messageController.delete_msgs);

// User routes
router.get("/log-in", userController.get_login);

router.post("/log-in", userController.post_login);

router.get("/log-out", userController.get_logout);

router.get("/sign-up", userController.get_signup);

router.post("/sign-up", userController.post_signup);

router.post("/join", userController.join_post);

router.get("/join", userController.join_get);

module.exports = router;
