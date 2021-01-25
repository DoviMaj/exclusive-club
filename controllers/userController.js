const User = require("../models/user");
const he = require("he");
const { body, validationResult } = require("express-validator");
const fetch = require("node-fetch");
const passport = require("passport");
const bcrypt = require("bcryptjs");

exports.get_login = (req, res) => res.render("log-in");

exports.post_login = passport.authenticate("local", {
  failureRedirect: "/log-in",
  successRedirect: "/",
});

exports.get_logout = (req, res) => {
  req.logout();
  res.redirect("/");
};

exports.get_signup = (req, res) => res.render("sign-up");

exports.post_signup = [
  body("username", "Empty name")
    .trim()
    .escape()
    .custom(async (username) => {
      try {
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
          throw new Error("username already in use");
        }
      } catch (err) {
        throw new Error(err);
      }
    }),
  body("email", "Not an Email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Invalid email")
    .custom(async (email) => {
      try {
        const existingEmail = await User.findOne({ email: email });
        if (existingEmail) {
          throw new Error("Email already in use");
        }
      } catch (err) {
        throw new Error(err);
      }
    }),
  body("password").isLength(6).withMessage("Minimum length 6 characters"),
  body("confirm-password").custom((value, { req }) => {
    if (value !== req.body.password) {
      return next("Password confirmation does not match password");
    }
    // Indicates the success of this synchronous custom validator
    return true;
  }),
  (req, res, next) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("sign-up", {
        username: req.body.username,
        email: errors.array(),
      });
      return;
    }

    const user = new User({
      username: req.body.username,
      email: req.body.email,
    });

    bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
      if (err) return next(err);
      user.password = hashedPassword;
      user.save((err) => {
        if (err) {
          return next(err);
        }
        req.login(user, function (err) {
          if (err) {
            return next(err);
          }
          return res.redirect("/");
        });
      });
    });
  },
];

let currentQuestion = {};
let wrongAnswer = false;
exports.join_get = async (req, res, next) => {
  // fetch random question
  try {
    const quest = await fetch(
      "https://opentdb.com/api.php?amount=1&difficulty=hard&type=multiple"
    );
    if (res.status >= 400) {
      return next("Bad response from server");
    }
    const question = await quest.json();
    currentQuestion = question.results[0];
    // decode special characters

    currentQuestion.correct_answer = he.decode(currentQuestion.correct_answer);
    currentQuestion.incorrect_answers = currentQuestion.incorrect_answers.map(
      (answer) => {
        return he.decode(answer);
      }
    );
    currentQuestion.question = he.decode(currentQuestion.question);

    // create answers array
    let answersArr = [...currentQuestion.incorrect_answers];
    const randomNum = () =>
      Math.floor(Math.random() * Math.floor(answersArr.length));

    const newRandomNum = randomNum();
    const randomIndexValue = answersArr[newRandomNum];
    answersArr[newRandomNum] = currentQuestion.correct_answer;
    answersArr.push(randomIndexValue);

    // render
    res.render("join", { question: currentQuestion, answersArr, wrongAnswer });
  } catch (err) {
    return next(err);
  }
};

exports.join_post = async (req, res, next) => {
  if (
    req.body.riddle.toLowerCase() ===
    currentQuestion.correct_answer.toLowerCase()
  ) {
    try {
      await User.findByIdAndUpdate(req.session.currentUser._id, {
        role: req.body.role,
      });
      wrongAnswer = false;
      res.redirect("/");
    } catch (err) {
      return next(err);
    }
  } else {
    wrongAnswer = true;
    res.redirect("/join");
  }
};
