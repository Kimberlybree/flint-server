const mongoose = require('./connection');
const seedData = require('./seeds.json');
const Transactions = require('../models/transactionModel');

Transactions.deleteMany({})
    .then(() => {
        return Transactions.insertMany(seedData)
    })
    .then(console.log)
    .catch(console.error)
    .finally(() => {
        process.exit();
    });
