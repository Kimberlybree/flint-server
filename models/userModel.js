const mongoose = require('../db/connection')
const validator = require('validator');

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

const locationSchema = new mongoose.Schema({
    address1: String,
    address2: String,
    city: String,
    state: String,
    zipcode: Number,
}, {_id : false})

const userSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email: emailSchema,
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    location: locationSchema

},  { timestamps: true }
)

const User = mongoose.model("User", userSchema);

module.exports = User;
