const express = require('express');
const router = express.Router();

const Transaction = require("../models/transactionModel")

router.get("/", (req, res, next) => {
    Transaction.find({})
    .then((record) => res.json(record))
    .catch(next);
})

router.get("/:id", (req, res, next) => {
    Transaction.findById(req.params.id)
    .then((record) => res.json(record))
    .catch(next);
})

router.post('/', (req, res) => {
    Transaction.create(req.body).then(record => {
        Transaction.find({}).then(record => {
            res.json(record)
        })
    })
})

router.put('/:id', (req, res) => {
    Transaction.findOneAndUpdate({_id: req.params.id}, req.body)
    .then(record => Transaction.find({})
        .then(record => {res.json(record)})
    )
})

router.delete('/:id', (req, res) => {
    Transaction.findOneAndDelete({_id: req.params.id}, req.body)
    .then(gif => Transaction.find({})
        .then(record => {res.json(record)})
    )
})

module.exports = router
