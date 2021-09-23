const mongoose = require('./connection');
const seedData = require('./userseed.json');
const Users = require('../models/userModel');

Users.deleteMany({})
    .then(() => {
        return Users.insertMany(seedData)
    })
    .then(console.log)
    .catch(console.error)
    .finally(() => {
        process.exit();
    });
