const mongoose = require('../db/connection')

const budgetSchema = new mongoose.Schema({

    
    // description: {type: String, required: true},
    // date: {type: Date, required: true},
    // type: {type: String, required: true},
    // category: {type: String, required: true},
    // subcategory: {type: String, required: true},
    // amount: {type: Number, required: true},
},  { timestamps: true }
)

const Budget = mongoose.model("Budget", budgetSchema);

module.exports = Budget;
