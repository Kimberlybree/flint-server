const mongoose = require('../db/connection')

const transactionSchema = new mongoose.Schema({
    name: {type: String, required: true},
    date: {type: Date, required: true},
    type: {type: String, required: true},
    majorCategory: {type: String, required: true},
    minorCategory: {type: String, required: true},
    amount: {type: Number, required: true},
},  { timestamps: true }
)

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
