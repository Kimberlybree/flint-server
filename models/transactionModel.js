const mongoose = require('../db/connection')

const transactionSchema = new mongoose.Schema({
    description: {type: String, required: true},
    date: {type: Date, required: true},
    type: {type: String, required: true},
    category: {type: String, required: true},
    subcategory: {type: String, required: true},
    amount: {type: Number, required: true},
},  { timestamps: true }
)

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
