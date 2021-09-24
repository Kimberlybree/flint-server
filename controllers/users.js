const express = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const router = express.Router();

const User = require("../models/userModel")

router.get("/", (req, res, next) => {
    User.find({})
    .then((record) => res.json(record))
    .catch(next);
})

router.get("/:id", (req, res, next) => {
    User.findById(req.params.id)
    .then((record) => res.json(record))
    .catch(next);
})

// account creation
router.post('/', async (req, res, next) => {
    // const hash = bcrypt.hashSync(req.body.password, saltRounds); // this is syncronous and may cause issues later
    // req.body.password = hash // <-- this too
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

router.post('/login', async (req, res, next) => {

    User.findOne({username: req.body.username})
        .then(async (user) => {
            if(user == null){
                return res.status(400).send("User doesn't exist")
            }
            const match = await bcrypt.compare(req.body.password, user.password)
            if(match){
                res.json(user)
            } else {
                res.send('Not Allowed')
            }
            
        })
        .catch(next)
})

router.put('/:id', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, req.body, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

//new transaction
router.put('/:id/addtransaction', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $push: { transactions: req.body.transactions}})
        .then((user) => res.json(user))
        .catch(next)
})

// edit exsisting transaction
router.put('/:id/edittransaction/:tid', (req, res, next) => {
    User.updateOne(
        {_id: req.params.id},
        {$set : {"transactions.$[elem]": req.body}},
        {arrayFilters: [{"elem._id": req.params.tid}]})
        .then((user) => res.json(user))
        .catch(next)
})

router.delete('/:id', (req, res, next) => {
    User.findOneAndDelete({_id: req.params.id})
        .then((user) => res.json(user))
        .catch(next)
})

module.exports = router