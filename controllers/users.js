const express = require('express');
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

router.post('/', (req, res) => {
    User.create(req.body).then(record => {
        User.find({}).then(record => {
            res.json(record)
        })
    })
})

router.put('/:id', (req, res) => {
    User.findOneAndUpdate({_id: req.params.id}, req.body)
    .then(record => User.find({})
        .then(record => {res.json(record)})
    )
})

router.delete('/:id', (req, res) => {
    User.findOneAndDelete({_id: req.params.id}, req.body)
    .then(gif => User.find({})
        .then(record => {res.json(record)})
    )
})

module.exports = router