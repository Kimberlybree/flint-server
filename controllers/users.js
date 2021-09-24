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

router.post('/', (req, res, next) => {
    User.create(req.body)
    .then((user) => res.json(user))
    .catch(next)
})

router.put('/:id', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, req.body, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

router.delete('/:id', (req, res, next) => {
    User.findOneAndDelete({_id: req.params.id})
        .then((user) => res.json(user))
        .catch(next)
})

module.exports = router