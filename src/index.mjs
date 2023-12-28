import express from "express";
import bodyParser from "body-parser";
const port = process.env.PORT || 3000;
import "./db/conn.mjs";
import router from "./routes/route.mjs";
 import dotenv from "dotenv";
const app = express();

//config dotenv
dotenv.config();

// Middleware for parsing application/json
app.use(express.json());

//Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// connect the static 
app.use(express.static('public'))

//connect template engine "hbs"
    // app.set("view engine" , "hbs")
    // app.set("views" , "./template/views")

//routes
app.use(router)


//server
app.listen(port, () => {
    console.log(`Your server is started on Port ${port}`)
})