import express from "express";
import Joi from "joi";

const app = express();
app.use(express.urlencoded({ extended: true }));

const signupForm = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
  confirm: Joi.ref("password"),
});

app.post("/signup", (req, res) => {
  const { error, value } = signupForm.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).render("signup", { errors: error.details });
  }
  res.redirect(`/welcome?u=${encodeURIComponent(value.username)}`);
});

export default app;
