const Message = require("../models/message");

exports.get_messages = async (req, res, next) => {
  try {
    const messages = await Message.find({}).sort({ date: "desc" });
    if (!messages) {
      return next("messages not found");
    }
    res.render("index", { user: req.user, messages: messages });
  } catch (err) {
    return next(err);
  }
};

exports.post_messages = (req, res, next) => {
  const message = new Message({
    user: req.user,
    text: req.body.text,
  });
  message.save((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
};

exports.delete_msgs = async (req, res, next) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
  } catch (err) {
    return next(err);
  }
  res.redirect("/");
};
