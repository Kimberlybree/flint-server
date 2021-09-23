const express = require('express')
const cors = require('cors');
const controller = require('./controllers/transactions')
const methodOverride = require('method-override')
const app = express()

app.use(methodOverride('_method'))
app.use(cors());
app.use(express.json())
app.use(express.static('views/images'));
app.use(express.urlencoded({extended:true}))

// BEGIN ROUTES
app.get('/', (req, res) => {res.send('Server utilization initiated. Begin sequencing.')})
app.use('/transactions', controller)
// END ROUTES

app.set("port", process.env.PORT || 8000);

app.listen(app.get("port"), () => {
    console.log(`Listening on Port: ${app.get("port")}`);
});
