const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');

const User = require("../models/userModel")
const saltRounds = 12;



//                 ___        _______ 
//                | \ \      / /_   _|
//             _  | |\ \ /\ / /  | |  
//            | |_| | \ V  V /   | |  
//             \___/   \_/\_/    |_|  
                    
// ==================== verify function for jwt authentication ====================
const verify = (req, res, next) => {
    const authHeader = req.headers.authorization
    if(authHeader){
        const token = authHeader.split(" ")[1];

        jwt.verify(token, 'mySecretKey', (err, user) => {
            if(err){
                return res.status(401).json({"message": "Token is not valid"})
            }

            req.user = user;
            next()
        })
    } else {
        res.status(401).json({"message": "Invalid Authentication"})
    }
}

// ==================== RefreshToken (takes email and token in the body) ====================

router.post("/refreshtoken", (req, res) => {
    // take the refresh token from the user
    const refreshToken = req.body.token

    // send error if there is no token or if token is not valid
    if(!refreshToken) return res.status(401).json({"message": "You are not authenticated"})
    User.findOne({email: req.body.email})
        .then((dbuser) => {
            if(!dbuser.refreshTokens.includes(refreshToken)){
                return res.status(403).json({"message": "Refresh Token is not valid"})
            }
            jwt.verify(refreshToken, 'myRefreshSecretKey', (err, user) => {
                // if err, console.log the err
                err && console.log(err)

                // filter tokens so that the current token is removed
                // if token is not equal to refreshToken it can stay. otherwise if it is exact match, filter it out.
                console.log(user)
                const refreshTokens = dbuser.refreshTokens.filter((token) => token !== refreshToken)

                // replaces old refreshtoken array in db with new refreshtoken array
                User.findOneAndUpdate({email: dbuser.email}, { $set: {refreshTokens: refreshTokens}}, {new: true})

                const newAccessToken = generateAccessToken(dbuser)
                const newRefreshToken = generateAccessToken(dbuser)

                User.findOneAndUpdate({email: dbuser.email}, { $push: { refreshTokens: newRefreshToken }}, {new: true})
                    .then((user) => {
                        res.status(200).json({
                            accessToken: newAccessToken,
                            refreshToken: newRefreshToken,
                        })
                    })
                
            })
        })

    

})

// ==================== Generate a new Access token ====================

const generateAccessToken = (user) => {
    return jwt.sign({id: user._id, email: user.email, isAdmin: user.isAdmin},
        'mySecretKey',
        {expiresIn: "15m"}
)}

// ==================== Generate a new Refresh Token ====================

const generateRefreshToken = (user) => {
    return jwt.sign({id: user._id, email: user.email, isAdmin: user.isAdmin},
        'myRefreshSecretKey'
)}


//             _   _                   
//            | | | |___  ___ _ __ ___ 
//            | | | / __|/ _ \ '__/ __|
//            | |_| \__ \  __/ |  \__ \
//             \___/|___/\___|_|  |___/

// ==================== Get ALL Users ====================

router.get("/", (req, res, next) => {
    User.find({})
    .then((record) => res.json(record))
    .catch(next);
})


// ==================== Create a User (Signup) ====================

router.post('/', async (req, res, next) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds)
        req.body.password = hashedPassword
        User.create(req.body)
        .then((user) => res.json(user))
        .catch(next)
    } catch {
        res.status(201).send('Account creation failed')
    }
    
})

// ==================== Sign In Authentication ====================
// Returns accessToken, refreshToken, userobj

// USAGE EXAMPLE FOR FRONTEND:
// const [email, setEmail] = useState('')
// const [password, setPassword] = useState('')
// const [user, setUser] = useState(null)
// const handleSignIn = async (email, password) => {
//     try {
//         const response = await axios.post('http://localhost:8000/users/login', {
//                 "email": `${email.toLowerCase()}`,
//                 "password": `${password}`
//         })
//         setUser(response.data)
//     } catch(err) {
//         console.log(err)
//     }
// }


router.post('/login', async (req, res, next) => {
    User.findOne({email: req.body.email})
    .then(async (user) => {
        if(user === null){
            return res.status(400).send("User doesn't exist")
        }
        const match = await bcrypt.compare(req.body.password, user.password)
        if(match){
            // Generate an access token
            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)
            
            // TODO add refresh token to user in db
            console.log('pushing refreshToken to db')
            User.findOneAndUpdate({email: user.email}, { $push: { refreshTokens: refreshToken }}, {new: true})
            .then((user) => {
                res.json({
                    userobj: user,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                })
            })
        } else {
            res.send('Not Allowed')
        }
    })
    .catch(next)
})


// ==================== User logout ====================

router.post('/logout', verify, (req, res, next) => {
    const refreshToken = req.body.token
    User.findOne({email: req.body.email})
    .then((user) => {
        const refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken)
        User.findOneAndUpdate({email: user.email}, { $set: {refreshTokens: refreshTokens}})
        .then(() => {
            res.status(200).json({"message": "You logged out successfully"})
        })
    })
    .catch(next)
})

// ==================== Update a Users (Use carefully) ====================

router.put('/:id', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, req.body, {new: true})
    .then((user) => res.json(user))
    .catch(next)
})

// ==================== Delete a User and all related data ====================

router.delete('/:id', verify, (req, res) => {
    if(req.user.id === req.params.id || req.user.isAdmin){
        User.findOneAndDelete({_id: req.params.id})
        .then((user) => res.status(200).json(user))
        .catch(next)
    } else {
        res.status(403).json({"message": "You are not allowed to delete this user"})
    }
})

// ==================== Get Individual Users by ID ====================

router.get("/:id", (req, res, next) => {
    User.findById(req.params.id)
    .then((record) => res.json(record))
    .catch(next);
})



//           _____                               _   _                 
//          |_   _| __ __ _ _ __  ___  __ _  ___| |_(_) ___  _ __  ___ 
//            | || '__/ _` | '_ \/ __|/ _` |/ __| __| |/ _ \| '_ \/ __|
//            | || | | (_| | | | \__ \ (_| | (__| |_| | (_) | | | \__ \
//            |_||_|  \__,_|_| |_|___/\__,_|\___|\__|_|\___/|_| |_|___/

// ==================== Get individual Transaction of User ====================

router.get('/:id/gettransaction/:tid', (req, res, next) => {
    User.findById({_id: req.params.id})
        .then((user) => res.json(user.transactions))
        .catch(next)
})

// ==================== Add a transaction to the Specified User ====================

router.put('/:id/addtransaction', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $push: { transactions: req.body}}, {new: true})
    .then((user) => res.json(user))
    .catch(next)
})

// ==================== Edit a existing transaction on User ====================

router.put('/:id/edittransaction/:tid', (req, res, next) => {
    User.findOneAndUpdate(
        {_id: req.params.id},
        {$set : {"transactions.$[elem]": req.body}},
        {arrayFilters: [{"elem._id": req.params.tid}], new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// ==================== Delete a transaction from a User ====================

router.put('/:id/deletetransaction/:tid', (req, res, next) => {
    User.findOneAndUpdate({_id: req.params.id}, {$pull: {"transactions": {"_id": req.params.tid}}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})


//             ____            _            _       
//            | __ ) _   _  __| | __ _  ___| |_ ___ 
//            |  _ \| | | |/ _` |/ _` |/ _ \ __/ __|
//            | |_) | |_| | (_| | (_| |  __/ |_\__ \
//            |____/ \__,_|\__,_|\__, |\___|\__|___/
//                               |___/              

// ==================== Add a Budget to a User ====================

router.put('/:id/addbudget', (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $push: { budgets: req.body}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// ==================== Edit a Budget on User ====================

router.put('/:id/editbudget/:bid', (req, res, next) => {
    User.findOneAndUpdate(
        {_id: req.params.id},
        {$set : {"budgets.$[elem]": req.body}},
        {arrayFilters: [{"elem._id": req.params.bid}], new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// ==================== Delete a Budget from a User ====================

router.put('/:id/deletebudget/:bid', (req, res, next) => {
    User.findOneAndUpdate({_id: req.params.id}, {$pull: {"budgets": {"_id": req.params.bid}}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

module.exports = router