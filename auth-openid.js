var express = require("express");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");
var bodyParser = require("body-parser");
var passport = require("passport");
var util = require("util");
const axios = require("axios");
var { config } = require("./config");

var OIDCStrategy = require("passport-azure-ad").OIDCStrategy;

passport.serializeUser(function(user, done) {
  done(null, user.displayName);
});

passport.deserializeUser(function(id, done) {
  findByEmail(id, function(err, user) {
    done(err, user);
  });
});

var users = [];

var findByEmail = function(email, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.displayName === email) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};

passport.use(
  new OIDCStrategy(config, function(
    iss,
    sub,
    profile,
    accessToken,
    refreshToken,
    done
  ) {
    if (!profile.displayName) {
      return done(new Error("No email found"), null);
    }
    process.nextTick(function() {
      findByEmail(profile.displayName, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          profile.accessToken = accessToken;
          users.push(profile);
          return done(null, profile);
        }
        return done(null, user);
      });
    });
  })
);

const authRouter = express.Router();
const SessionHandler = expressSession({
  secret: "voting",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Secure is Recommeneded, However it requires an HTTPS enabled website (SSL Certificate)
    maxAge: 600000 // 10 Days in miliseconds
  }
});

authRouter.use(bodyParser.urlencoded({ extended: false }));
authRouter.use(cookieParser());
authRouter.use(SessionHandler);
authRouter.use(passport.initialize());
authRouter.use(passport.session());

const providerAuth = passport.authenticate("azuread-openidconnect", {
  failureRedirect: "/login"
});

authRouter.get("/login", providerAuth, function(req, res) {
  res.redirect(`http://localhost:3000/admin/${req.user.accessToken}`);
});

authRouter.get("/auth/openid", providerAuth, function(req, res) {
  res.redirect(`http://localhost:3000/admin/${req.user.accessToken}`);
});

authRouter.get("/auth/openid/return", providerAuth, function(req, res) {
  res.redirect(`http://localhost:3000/admin/${req.user.accessToken}`);
});

authRouter.post("/auth/openid/return", providerAuth, function(req, res) {
  res.redirect(`http://localhost:3000/admin/${req.user.accessToken}`);
});

authRouter.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

function check(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    axios
      .get(`https://graph.microsoft.com/v1.0/me/`, {
        headers: {
          Authorization: authHeader
        }
      })
      .then(() => {
        return next();
      })
      .catch(err => {
        res.status(401);
        res.send("Unauthorized");
      });
  } else {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401);
    res.send("Unauthorized");
  }
}

function login(req, res) {
  passport.authenticate("azuread-openidconnect", { failureRedirect: "/login" }),
    function(req, res) {
      res.redirect("/login");
    };
}

authRouter.get("/profile", check, (req, res) => {
  res.json(req.user);
});

module.exports = { authRouter, check, login };
