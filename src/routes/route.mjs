import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
const router = new express.Router();
import registrationSchema from "../validators/regschema.mjs";
import RegisteredStudents from "../models/regStudent.mjs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.mjs";
import mongoose from "mongoose";

//routes
router.get("/", (req, res) => {
    res.status(200).send("Hi..! You Are Now On The HomePage")
})

//post
router.post('/register', async (req, res) => {
    const { fullName, userName, email, phoneNumber, password, confirmPassword } = req.body;

    // Validate user input against the Joi schema
    const { error } = registrationSchema.validate({ fullName, userName, email, phoneNumber, password, confirmPassword });
    if (error) {
        console.log('error', 'Validation Error: ' + error.message);
        req.flash('error', 'Validation Error: ' + error.message);

        // Render the registration page with flash messages
        return res.render('regForm', { error: req.flash('error'), fullName, userName, email, phoneNumber });
    }

    // Continue with the registration logic
    if (password === confirmPassword) {
        try {
            // Create a new user instance and save it to the database
            const newUser = new RegisteredStudents({ fullName, userName, email, phoneNumber, password, confirmPassword });

            // Create JWT token
            const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Save the token in the user's document
            newUser.tokens = await newUser.tokens.concat({ token });

            /**************setting cookie in registratin form starts********************/
            // Set the cookie to expire in 1 minute
            const expiration = new Date(Date.now() + 60 * 1000); // 1 minute in milliseconds
            const options = {
                expires: expiration,
                httpOnly: true,
            };
            const regCookies = await res.cookie('jwt', token, options); // Set a cookie named 'token'
            console.log(`Token set in cookie with 1 minute expiration and token is : ${regCookies}`);
            /**************setting cookie in registratin form ends********************/

            // On successful registration
            req.flash('success', 'Registration successful! Login Now');

            // Saving the data to MongoDB
            await newUser.save();

            // Redirect to the login page
            res.redirect('/login-page');
        } catch (error) {
            // On error
            req.flash('error', 'Registration failed: ' + error.message);
            res.redirect('/registration-page');
        }
    } else {
        req.flash('error', 'Passwords do not match.');
        res.redirect('/registration-page');
    }
});

//get register page
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
router.get('/registration-page', async (req, res) => {
    res.status(200).render("regForm")
    // res.status(200).sendFile(path.join(__dirname, '../../public/regForm.html')); static registration page path
});

//get login page
// const __dir = path.dirname(fileURLToPath(import.meta.url)); // for static path of login page
router.get('/login-page', async (req, res) => {
    // Retrieve flash messages
    const successMessage = req.flash('success');
    const errorMessage = req.flash('error');

    // console.log(req.flash('success'))
    // console.log(req.flash('error'))
    res.status(200).render("loginForm", { successMessage, errorMessage });
})

//get home page
const __dirHome = path.dirname(fileURLToPath(import.meta.url));
router.get('/home-page', async (req, res) => {
    res.status(200).sendFile(path.join(__dirHome, '../../public/index.html'));
})

//get secret page
const __dirSecret = path.dirname(fileURLToPath(import.meta.url));
router.get('/secret-page', auth, (req, res) => {
    // The auth middleware already checks for a valid token, so jwtToken is assumed to be valid here
    res.status(200).sendFile(path.join(__dirSecret, '../../public/secret.html'));
});

//logout from the secret page
router.get('/logout-page', auth, async (req, res) => {
    try {
        // console.log("TOKEN");
        // console.log(req.token);

        // find user by _id
        const user = await RegisteredStudents.findOne({ _id: new mongoose.Types.ObjectId(req.user._id) });
        // console.log("USER");
        // console.log(user);

        // remove current provided token (logout from 1 device only)
        // user.tokens = req.user.tokens.filter(({ token }) => {
        //     return token !== req.token;
        // });

        //remove from all devices
        req.user.tokens = [];

        // save user
        await req.user.save();

        // Clear the cookie named 'session_token'
        res.clearCookie('jwt');

        // Redirect to home page or login page
        res.redirect('/login-page');
    } catch (error) {
        console.log(error);
        res.status(500).send(error)
    }

});

//post login (this one is of login but i have named it homepage) credentials and compare it with registration details saved in db
router.post("/homepage", async (req, res) => {
    try {
        const { email, password } = req.body;
        let registerEmail = await RegisteredStudents.findOne({ email })

        console.log(registerEmail.email)

        //using becrypt compare function to compare the bcrypt password stored in db with password entered by user
        const isValid = await bcrypt.compare(password, registerEmail.password)

        // Create JWT token
        const token = jwt.sign({ id: registerEmail._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        //  console.log(`this is the token generated by login form ${token}`)

        /**************setting cookie in registratin form starts********************/
        // Set the cookie to expire in 1 minute
        const expiration = new Date(Date.now() + 60 * 1000); // 1 minute in milliseconds

        const options = {
            expires: expiration, // Set the expiration date
            httpOnly: true, // The cookie is only accessible by the web server
            // signed: false, // Indicates if the cookie should be signed
            // You can set other options here, such as 'secure: true' for HTTPS
        };

        registerEmail.tokens = [...registerEmail.tokens, { token }];
        await registerEmail.save();

        const logCookies = await res.cookie('jwt', token, options); // Set a cookie named 'token'
        console.log(`Token set in cookie with 1 minute expiration and token is : ${logCookies}`);
        /**************setting cookie in registratin form ends********************/
        if (isValid) {
            res.status(200).redirect('/home-page')
        } else {
            res.status(400).send("your credentials are not correct")
        }
        // console.log(`name is ${email} and password is ${password}`)
    } catch (err) {
        console.log(err)
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

// Get entire data with pagination from db
router.get('/data', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        const totalCount = await RegisteredStudents.countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        const data = await RegisteredStudents.find()
            .skip((page - 1) * limit)
            .limit(limit);

        const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
        res.status(200).render('pagination', {
            data,
            currentPage: page,
            totalPages,
            totalCount,
            pages
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router