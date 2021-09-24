const mongoose = require('../db/connection')
const validator = require('validator');

// email schema => user schema
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        index: {unique: true, sparse: true},
        trim: true,
        lowercase: true,
        required: 'email is not valid',
        validate: [ validator.isEmail, 'invalid email' ]
    }
}, {_id : false});

// location schema => user schema
const locationSchema = new mongoose.Schema({
    address1: {type: String, default: ""},
    address2: {type: String, default: ""},
    city: {type: String, default: ""},
    state: {type: String, default: ""},
    zipcode: {type: Number, default: ""},
}, {_id : false, minimize: false})

// transaction schema => user schema
const transactionSchema = new mongoose.Schema({
    description: {type: String, required: true},
    date: {type: Date, required: true},
    type: {type: String, required: true},
    category: {type: String, required: true},
    subcategory: {type: String, required: true},
    amount: {type: Number, required: true},
},  { timestamps: true })

const budgetSchema = new mongoose.Schema({
    category: {type: String, required: true},
    subCategory: {String},
    amount: Number,
},  { timestamps: true })

const userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email: {
        type: String,
        index: {unique: true, sparse: true},
        trim: true,
        lowercase: true,
        required: 'email is not valid',
        validate: [ validator.isEmail, 'invalid email' ]
    },
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    location: {
        type: locationSchema,
        default: {
            address1: null,
            address2: null,
            city: null,
            state: null,
            zipcode: null
        }
    },
    transactions: [transactionSchema],
    budgets: [budgetSchema],
    password: {type: String, required: true, minlength: 8}

},  { timestamps: true })

const User = mongoose.model("User", userSchema);

module.exports = User;
