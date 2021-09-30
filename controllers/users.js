const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');

const User = require("../models/userModel")
const saltRounds = 12;

// Text-magic
const textmagicClient = require('textmagic-client');
const client = textmagicClient.ApiClient.instance;
const auth = client.authentications['BasicAuth'];
const api = new textmagicClient.TextMagicApi();

// auth app
const speakeasy = require('speakeasy');


// add to .env
auth.username = 'jessewatson'
auth.password = '4fY5cj7lCBNprj81uVw4mFqJqWiy3W'




//                 ___        _______ 
//                | \ \      / /_   _|
//             _  | |\ \ /\ / /  | |  
//            | |_| | \ V  V /   | |  
//             \___/   \_/\_/    |_|  

// ==================== Generate a new Access token ====================

const generateAccessToken = (user) => {
    return jwt.sign({id: user._id, email: user.email, isAdmin: user.isAdmin},
        'mySecretKey',
        {expiresIn: "15m"}
)}

// ==================== Generate a new Refresh Token ====================

const generateRefreshToken = (user) => {
    return jwt.sign({id: user._id, email: user.email, isAdmin: user.isAdmin},
        'myRefreshSecretKey',
        {expiresIn: "15m"}
)}

// ==================== verify function for jwt authentication ====================

const verify = (req, res, next) => {
    const authHeader = req.headers.authorization
    if(authHeader){
        const token = authHeader.split(" ")[1];

        jwt.verify(token, 'mySecretKey', (err, user) => {
            if(err){
                console.log(err)
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
                if(err){
                    console.log(err)
                    return res.status(400).json({"message": 'Expired Token'})
                } else {
                    // filter tokens so that the current token is removed
                    // if token is not equal to refreshToken it can stay. otherwise if it is exact match, filter it out.

                    const filteredTokens = dbuser.refreshTokens.filter((token) => token !== refreshToken)

                    // replaces old refreshtoken array in db with new refreshtoken array

                    User.findOneAndUpdate({email: dbuser.email}, { $set: { refreshTokens: filteredTokens } }, {multi: true, new:true})
                        .then((user) => {
                            const newAccessToken = generateAccessToken(dbuser)
                            const newRefreshToken = generateRefreshToken(dbuser)

                            User.findOneAndUpdate({email: dbuser.email}, { $push: { refreshTokens: newRefreshToken }}, {new: true})
                                .then((user) => {
                                    res.status(200).json({
                                        accessToken: newAccessToken,
                                        refreshToken: newRefreshToken,
                                })
                            })
                        })
    
    

                }

                
            })
        })

    

})





//             ___                _                    
//            / __|_ __  ___ __ _| |_____ __ _ ____  _ 
//            \__ \ '_ \/ -_) _` | / / -_) _` (_-< || |
//            |___/ .__/\___\__,_|_\_\___\__,_/__/\_, |
//                |_|                             |__/ 

// ==================== Send a temp secret ======================

router.put('/gettempsecret/:id', verify, (req, res, next) => {
    const temp_secret = speakeasy.generateSecret()
    User.findByIdAndUpdate({_id: req.params.id}, { $set: {tempSecret: temp_secret.base32}}, {new: true})
        .then((user) => res.json(user.tempSecret))
        .catch(next)
})

// ==================== verify temp secret ====================

router.put('/verifytempsecret/:id', verify, (req, res, next) => {
    User.findById({_id: req.params.id})
        .then((user) => {
            const isTokenValid = speakeasy.totp.verify({
                secret: user.tempSecret,
                encoding: 'base32',
                token: req.body.token,
                window: 6
            })
            if(isTokenValid){
                User.findByIdAndUpdate({_id: req.params.id}, { $set: { authSecret: user.tempSecret, tempSecret: "", isAuthEnabled: true}}, {new: true})
                    .then((newUser) => {
                        res.json({
                            message: 'Token is valid',
                            user: newUser
                        })
                    })
            } else {
                res.json({message: 'Token not valid'})
            }
        })
        .catch(next)
})

// ==================== Verify Auth Login ====================

router.post('/verifyauthlogin/', (req, res, next) => {
    User.findOne({email: req.body.email})
        .then((user) => {
            const isTokenValid = speakeasy.totp.verify({
                secret: user.authSecret,
                encoding: 'base32',
                token: req.body.token,
                window: 6
            })
            if(isTokenValid){
                const match = bcrypt.compare(req.body.password, user.password)
                if(match){
                    const accessToken = generateAccessToken(user)
                    const refreshToken = generateRefreshToken(user)
                    User.findOneAndUpdate({email: user.email}, { $push: { refreshTokens: refreshToken }}, {new: true})
                    .then((newUser) => {
                        res.json({
                            message: 'Token is valid',
                            userobj: newUser,
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                        })
                    })
                } else {
                    res.json({message: 'Passwords do not match'})
                }
            } else {
                res.json({message: 'Token not valid'})
            }
        })
        .catch(next)
})

// ==================== disable auth ====================

router.put('/removeauth/:id', verify, (req, res, next) => {
    User.findById({_id: req.params.id})
        .then((user) => {
            const isTokenValid = speakeasy.totp.verify({
                secret: user.authSecret,
                encoding: 'base32',
                token: req.body.token,
                window: 6
            })
            if(isTokenValid && user.preferedAuth === 1){
                User.findByIdAndUpdate({_id: req.params.id}, { $set: { authSecret: "", isAuthEnabled: false, preferedAuth: 0}}, {new: true})
                .then((newUser) => {
                    res.json({
                        message: "Authenticator Removed",
                        user: newUser
                    })
                })
            } else if(isTokenValid && user.preferedAuth !== 1){
                User.findByIdAndUpdate({_id: req.params.id}, { $set: { authSecret: "", isAuthEnabled: false}}, {new: true})
                .then((newUser) => {
                    res.json({
                        message: "Authenticator Removed",
                        user: newUser
                    })
                })
            } else {
                res.json({message: 'Token not valid'})
            }
        })
        .catch(next)
})
//             _   _                   
//            | | | |___  ___ _ __ ___ 
//            | | | / __|/ _ \ '__/ __|
//            | |_| \__ \  __/ |  \__ \
//             \___/|___/\___|_|  |___/

// ==================== Get ALL Users ====================

router.get("/", verify, (req, res, next) => {
    User.find({})
    .then((record) => res.json(record))
    .catch(next);
})


// ==================== Create a User (Signup) ====================

router.put('/', async (req, res, next) => {
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
            if(user.isAuthEnabled || user.isSmsVerified){
                if(user.isAuthEnabled && user.preferedAuth === 1){
                    // prompt user for authenticator
                    res.json({
                        message: 'Authenticator required',
                    })
                } else if (user.isSmsVerified && user.preferedAuth === 2){
                    const input = {
                        phone: `1${user.phone}`,
                        brand: "Your Flint",
                        codeLength: 6,
                        // Optional parameters
                        workflowId: "6",
                        country: "US",
                    }
                    api.sendPhoneVerificationCodeTFA(input)
                        .then((data) => {
                            const number = user.phone
                            res.json({
                                smsData: data,
                                message: 'SMS required',
                                endingIn: `${number.toString().substr(-4)}`
                            })
                        }).catch((err)=> console.log(err))
                } else {
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
                            refreshToken: refreshToken,
                            message: 'OK'
                        })
                    })
                }
            } else {
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
                        refreshToken: refreshToken,
                        message: 'OK'
                    })
                })
            }
        } else {
            res.send('Not Allowed')
        }
    })
    .catch(next)
})

// ==================== Text-Verification (send-code) =================
router.post('/sendsmscode', (req, res) => {
    
    const input = {
        phone: req.body.phone,
        brand: "Your Flint",
        codeLength: 6,
        // Optional parameters
        workflowId: "6",
        country: "US",
    }
    api.sendPhoneVerificationCodeTFA(input)
        .then((data) => {
            res.json(data)
        }).catch((err)=> console.log(err))
})

// ==================== Text-Verification (verify-code) =================

router.put('/checksmscode/:id', (req, res) => {

    const input = {
        code: req.body.code,
        verifyId: req.body.verifyId
    }
    api.checkPhoneVerificationCodeTFA(input)
        .then((data) => {
            if(data === null){
                User.findByIdAndUpdate({_id: req.params.id}, { $set: { isSmsVerified: true, phone:  req.body.phone}}, {new: true})
                    .then((newUser)=> {
                        res.json({
                            "status": 200,
                            user: newUser
                        })
                    })
            }
        })
        .catch((err) => {
            res.json(err)
        })
        
})

// ==================== SMS login ====================

router.post('/verifysmslogin/', (req, res, next) => {
    User.findOne({email: req.body.email})
        .then((user) => {
            const input = {
                code: req.body.code,
                verifyId: req.body.verifyId
            }
            api.checkPhoneVerificationCodeTFA(input)
                .then((data) => {
                    if(data === null){
                        const match = bcrypt.compare(req.body.password, user.password)
                        if(match){
                            const accessToken = generateAccessToken(user)
                            const refreshToken = generateRefreshToken(user)
                            User.findOneAndUpdate({email: user.email}, { $push: { refreshTokens: refreshToken }}, {new: true})
                            .then((newUser) => {
                                res.json({
                                    message: 'Code is valid',
                                    userobj: newUser,
                                    accessToken: accessToken,
                                    refreshToken: refreshToken,
                                })
                            })
                        } else {
                            res.json({message: 'Passwords do not match'})
                        }
                    }
                })
                .catch((err) => {
                    res.json({
                        err: err,
                        message: 'Code is not valid'
                    })
                })
        })
        .catch(next)
})

// ==================== Remove Phone Auth ====================

router.put('/removephone/:id', (req, res) => {

    const input = {
        code: req.body.code,
        verifyId: req.body.verifyId
    }
    api.checkPhoneVerificationCodeTFA(input)
        .then((data) => {
            if(data === null){
                User.findByIdAndUpdate({_id: req.params.id}, { $set: { isSmsVerified: false }}, {new: true})
                    .then((newUser)=> {
                        res.json({
                            "status": 200,
                            user: newUser
                        })
                    })
            } else {
                res.json({message: 'wtf'})
            }
        })
        .catch((err) => {
            res.json(err)
        })
        
})

// ==================== Change Users Prefered Auth ====================

router.put('/changepreferedauth/:id', verify, (req, res, next) => {
    User.findById({_id: req.params.id})
        .then((user) => {
            if(req.body.preferedAuth == 1){
                // Authenticator
                if(user.isAuthEnabled){
                    // set the prefered method on user to 1
                    User.findByIdAndUpdate({_id: req.params.id}, { $set: { preferedAuth: 1 } }, {new: true})
                        .then((newUser) => {
                            res.json({
                                status: 200,
                                message: 'Saved',
                                user: newUser
                            })
                        })
                } else {
                    res.json({
                        status: 400,
                        message: 'You do not have Authenticator enabled'
                    })
                }
            } else if(req.body.preferedAuth == 2){
                // SMS 
                if(user.isSmsVerified){
                    // set the prefered method on user to 2
                    // respond 200
                    User.findByIdAndUpdate({_id: req.params.id}, { $set: { preferedAuth: 2 }}, {new: true})
                        .then((newUser) => {
                            res.json({
                                status: 200,
                                message: 'Saved',
                                user: newUser
                            })
                        })
                } else {
                    res.json({
                        status: 400,
                        message: 'You do not have Phone Verification enabled'
                    })
                }
            } else {
                res.json({
                    status: 400,
                    message: 'Not a valid option'
                })
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
        User.findOneAndUpdate({email: user.email}, { $set: {refreshTokens: refreshTokens}}, {multi: true})
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

// ==================== Update a users name ====================

router.put('/changename/:id', verify, (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $set: {firstName: req.body.firstName, lastName: req.body.lastName}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// ==================== Update a users email ====================

router.put('/changeemail/:id', verify, (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $set: {email: req.body.email}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
})

// ==================== Upload User Image ====================

router.put('/uploadimage/:id', verify, (req, res, next) => {
    User.findByIdAndUpdate({_id: req.params.id}, { $set: {profilePicURL: req.body.image}}, {new: true})
        .then((users) => res.json(users))
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

router.get("/:id", verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findById(req.params.id)
        .then((user) => res.json(user))
        .catch(next);
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
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

router.put('/:id/addtransaction', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findByIdAndUpdate({_id: req.params.id}, { $push: { transactions: req.body}}, {new: true})
        .then((user) => res.json(user))
        .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})

// ==================== Edit a existing transaction on User ====================

router.put('/:id/edittransaction/:tid', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findOneAndUpdate(
            {_id: req.params.id},
            {$set : {"transactions.$[elem]": req.body}},
            {arrayFilters: [{"elem._id": req.params.tid}], new: true})
            .then((user) => res.json(user))
            .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})

// ==================== Delete a transaction from a User ====================

router.put('/:id/deletetransaction/:tid', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findOneAndUpdate({_id: req.params.id}, {$pull: {"transactions": {"_id": req.params.tid}}}, {new: true})
            .then((user) => res.json(user))
            .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})


//             ____            _            _       
//            | __ ) _   _  __| | __ _  ___| |_ ___ 
//            |  _ \| | | |/ _` |/ _` |/ _ \ __/ __|
//            | |_) | |_| | (_| | (_| |  __/ |_\__ \
//            |____/ \__,_|\__,_|\__, |\___|\__|___/
//                               |___/              

// ==================== Add a Budget to a User ====================

router.put('/:id/addbudget', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findByIdAndUpdate({_id: req.params.id}, { $push: { budgets: req.body}}, {new: true})
            .then((user) => res.json(user))
            .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})

// ==================== Edit a Budget on User ====================

router.put('/:id/editbudget/:bid', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findOneAndUpdate(
            {_id: req.params.id},
            {$set : {"budgets.$[elem]": req.body}},
            {arrayFilters: [{"elem._id": req.params.bid}], new: true})
            .then((user) => res.json(user))
            .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})

// ==================== Delete a Budget from a User ====================

router.put('/:id/deletebudget/:bid', verify, (req, res, next) => {
    if(req.user.id == req.params.id || req.user.isAdmin){
        User.findOneAndUpdate({_id: req.params.id}, {$pull: {"budgets": {"_id": req.params.bid}}}, {new: true})
            .then((user) => res.json(user))
            .catch(next)
    } else {
        res.status(403).json({"message": "You are not authorized"})
    }
})

module.exports = router