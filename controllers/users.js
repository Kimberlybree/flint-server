const express = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const router = express.Router();
const jwt = require('jsonwebtoken');

const User = require("../models/userModel")

// verify function for jwt authentication
const verify = (req, res, next) => {
    const authHeader = req.headers.authorization
    if(authHeader){
        const token = authHeader.split(" ")[1];

        jwt.verify(token, 'mySecretKey', (err, user) => {
            if(err){
                return res.status(401).json({"message": "Token is not valid"})
            }

            req.user = user;
            next()
        })
    } else {
        res.status(401).json({"message": "Invalid Authentication"})
    }
}

// Get ALL Users
router.get("/", (req, res, next) => {
    User.find({})
    .then((record) => res.json(record))
    .catch(next);
})

// Get Individual Users by ID
router.get("/:id", (req, res, next) => {
    User.findById(req.params.id)
    .then((record) => res.json(record))
    .catch(next);
})

// Create a User (Signup)
router.post('/', async (req, res, next) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds)
        req.body.password = hashedPassword
        User.create(req.body)
        .then((user) => res.json(user))
        .catch(next)
    } catch {
        res.status(201).send('Account creation failed')
    }
    
})

// Sign In Authentication
router.post('/login', async (req, res, next) => {
    User.findOne({email: req.body.email})
        .then(async (user) => {
            if(user === null){
                return res.status(400).send("User doesn't exist")
            }
            const match = await bcrypt.compare(req.body.password, user.password)
            if(match){
                // Generate an access token
                const accessToken = jwt.sign({id: user._id, email: user.email}, 'mySecretKey')
                res.json({
                    userobj: user,
                    accessToken,
                })
            } else {
                res.send('Not Allowed')
            }
            
        })
        .catch(next)
})

// Update a Users (Use carefully)
router.put('/:id', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, req.body, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Delete a User and all related data
router.delete('/:id', verify, (req, res) => {
    if(req.user.id === req.params.id || req.user.isAdmin){
        res.status(200).json({"message": "User has been deleted"})
    } else {
        res.status(403).json({"message": "You are not allowed to delete this user"})
    }
    // User.findOneAndDelete({_id: req.params.id})
    //     .then((user) => res.json(user))
    //     .catch(next)
})

// Get individual Transaction of User
router.get('/:id/gettransaction/:tid', (req, res, next) => {
    User.findById({_id: req.params.id})
        .then((user) => res.json(user.transactions))
        .catch(next)
})

// Add a transaction to the Specified User
router.put('/:id/addtransaction', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $push: { transactions: req.body}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Edit a existing transaction on User
router.put('/:id/edittransaction/:tid', (req, res, next) => {
    User.findOneAndUpdate(
        {_id: req.params.id},
        {$set : {"transactions.$[elem]": req.body}},
        {arrayFilters: [{"elem._id": req.params.tid}], new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Delete a transaction from a User
router.put('/:id/deletetransaction/:tid', (req, res, next) => {
    User.findOneAndUpdate({_id: req.params.id}, {$pull: {"transactions": {"_id": req.params.tid}}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Add a Budget to a User
router.put('/:id/addbudget', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $push: { budgets: req.body}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Edit a Budget on User
router.put('/:id/editbudget/:bid', (req, res, next) => {
    User.findOneAndUpdate(
        {_id: req.params.id},
        {$set : {"budgets.$[elem]": req.body}},
        {arrayFilters: [{"elem._id": req.params.bid}], new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// Delete a Budget from a User
router.put('/:id/deletebudget/:bid', (req, res, next) => {
    User.findOneAndUpdate({_id: req.params.id}, {$pull: {"budgets": {"_id": req.params.bid}}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

module.exports = router