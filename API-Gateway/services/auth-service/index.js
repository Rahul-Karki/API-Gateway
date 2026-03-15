import express from "express"
import jwt from "jsonwebtoken"

const app = express();
const SECRET = "supersecret";

app.get("/health",(req,res) => {
    res.json({status: "auth service is healthy"})
})

app.get("/validate", (req, res) => {
  const auth = req.headers["authorization"];
  if (!auth) return res.sendStatus(401);

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);

    // 👇 USER ID HEADER
    res.setHeader("X-User-Id", decoded.userId);
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(401);
  }
});


app.listen(4000,() => {
    console.log("auth-service running on port 4000")
})

