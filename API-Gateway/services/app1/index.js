import express from "express"

const app = express();

app.use(express.json());

app.get("/health",(req,res) => {
    res.status(200).json({status: "api healthy"});
})

app.get("/api/data",(req,res) => {
    res.json({
        service: "app1",
        message: "Hello from app1",
        time: new Date().toISOString()
    });
});

app.listen(3000,() => {
    console.log("app1 running on port 3000");
})

