import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
const router = new express.Router();
import RegisteredStudents from "../models/regStudent.mjs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


//routes
router.get("/", (req, res) => {
    res.status(200).send("Hi..! You Are Now On The HomePage")
})

//post
router.post('/register', async(req, res) => {
    const { fullName, userName, email, phoneNumber, password, confirmPassword } = req.body;

    if (password === confirmPassword) {
        // Create a new user instance and save it to the database
        const newUser = new RegisteredStudents({ fullName, userName, email, phoneNumber, password, confirmPassword });

        //middleware of becrypt is used in between newUser and save() and itss physically in regStudents

        // Create JWT token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Save the token in the user's document
        newUser.tokens = await newUser.tokens.concat({ token });

        // res.status(201).send({ message: 'Registration successful!', token });

        //saving the data to mongodb
        newUser.save()
            // .then(RegisteredStudents => res.send('Registration successful!'))
            .then(RegisteredStudents => res.status(200).sendFile(path.join(__dir, '../../public/loginForm.html')))

            .catch(err => {
                console.error(err); // Log the error internally
                res.status(500).send('Error registering new user.');
            });
    } else {
        return res.status(400).send('Passwords do not match.');
    }
});


//get register page
const __dirname = path.dirname(fileURLToPath(import.meta.url));
router.get('/registration-page', async (req, res) => {
    res.status(200).sendFile(path.join(__dirname, '../../public/regForm.html'));
});

//get login page
const __dir = path.dirname(fileURLToPath(import.meta.url));
router.get('/login-page', async (req, res) => {
    res.status(200).sendFile(path.join(__dir, '../../public/loginForm.html'));
});

//post login credentials and compare it with registration details saved in db
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const registerEmail = await RegisteredStudents.findOne({ email })

        //using becrypt compare function to compare the bcrypt password stored in db with password entered by user
        const isValid = await bcrypt.compare(password, registerEmail.password)

         // Create JWT token
         const token = jwt.sign({ id: registerEmail._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        //  console.log(`this is the token generated by login form ${token}`)

        if (isValid) {
            res.status(200).sendFile(path.join(__dir, '../../public/index.html'))
        } else {
            res.status(400).send("your credentials are not correct")
        }
        // console.log(`name is ${email} and password is ${password}`)
    } catch (err) {
        res.status(400).send("invalid credentials")
    }
})

// router.post("/login", (req, res) => {
//     const { email, password } = req.body;

//     // Log the received email and password to the console
//     console.log(`Email: ${email}, Password: ${password}`);

//     // You can then send a response back to the client.
//     // For example, a simple confirmation message
//     res.send("Credentials received");
// });


//get
router.get('/data', async (req, res) => {
    const readData = await RegisteredStudents.find()
    res.status(200).send(readData)
})

export default router