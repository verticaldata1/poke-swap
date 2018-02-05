var express = require("express");
var passport = require("passport");
var User = require("../models/user");

var rt = express.Router();



rt.get("/login", function(req, res) {
  res.render("login");
});

rt.post("/login", passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));

rt.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

rt.get("/signup", function (req, res) {
  res.render("signup");
});

rt.post("/signup", function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  
  if(username.length > 20) {
    req.flash("error", "Keep username under 20 characters!");
    res.redirect("/signup");
  }
  else {
    User.findOne({username: username}, function(err, user) {
      if(err) { return next(err); }
      if(user) {
        req.flash("error", "Username taken");
        return res.redirect("/signup");
      }
      var newUser = new User({
        username: username,
        password: password
      });
      newUser.save(next);
    });
  }
}, passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/signup",
  failureFlash: true
}));


module.exports = rt;