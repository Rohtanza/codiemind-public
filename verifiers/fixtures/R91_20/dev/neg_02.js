const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { findUserByEmail, checkPassword } = require("./users");

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    const user = await findUserByEmail(email);
    if (!user || !(await checkPassword(user, password))) {
      return done(null, false, { message: "Invalid credentials" });
    }
    return done(null, user);
  }),
);

module.exports = passport;
