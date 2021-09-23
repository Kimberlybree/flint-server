// === Base Imports ===
const express = require('express')
const cors = require('cors');

// v=== Controllers ===v
const budgetController = require('./controllers/budgets')
const controller = require('./controllers/transactions')
const userController = require('./controllers/users')

const methodOverride = require('method-override')
const app = express()

app.use(methodOverride('_method'))
app.use(cors());
app.use(express.json())
app.use(express.static('views/images')); // currently does nothing
app.use(express.urlencoded({extended:true}))

// BEGIN ROUTES
app.get('/', (req, res) => {res.send('Server utilization initiated. Begin sequencing.')})
app.use('/transactions', controller)
app.use('/budgets', budgetController)
app.use('/users', userController)
// END ROUTES

app.set("port", process.env.PORT || 8000);

app.listen(app.get("port"), () => {
    console.log(`Listening on Port: ${app.get("port")}`);
});
