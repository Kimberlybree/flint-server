const express = require('express');
const router = express.Router();

const Budget = require("../models/budgetModel")

router.get("/", (req, res, next) => {
    Budget.find({})
    .then((record) => res.json(record))
    .catch(next);
})

router.get("/:id", (req, res, next) => {
    Budget.findById(req.params.id)
    .then((record) => res.json(record))
    .catch(next);
})

router.post('/', (req, res) => {
    Budget.create(req.body).then(record => {
        Budget.find({}).then(record => {
            res.json(record)
        })
    })
})

router.put('/:id', (req, res) => {
    Budget.findOneAndUpdate({_id: req.params.id}, req.body)
    .then(record => Budget.find({})
        .then(record => {res.json(record)})
    )
})

router.delete('/:id', (req, res) => {
    Budget.findOneAndDelete({_id: req.params.id}, req.body)
    .then(gif => Budget.find({})
        .then(record => {res.json(record)})
    )
})

module.exports = router