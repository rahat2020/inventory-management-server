const User = require('../models/User');
const Videos = require('../models/Videos');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Posts = require('../models/Posts');
const Messages = require('../models/Messages');

// CREATE NEW USER OR USER REGISTRATIONS
const register = async (req, res, next) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);
    try {
        const user = await new User({
            username: req.body.username,
            email: req.body.email,
            password: hash,
            role: req.body.role,
            isAdmin: req.body.isAdmin,
        })
        const saved = await user.save();
        saved && res.status(200).json('registration successfull');
    } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            // Duplicate key error for the 'email' field
            res.status(400).json('Email address already in use');
        } else {
            // Handle other errors
            console.error(error);
            res.status(500).json('Internal Server Error');
        }
        // next(err);
        // console.log(err)
    }
}

// USER LOGIN AUTHENTICATIONS
const login = async (req, res, next) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(404).json('Wrong credentials');
        }

        const isValidated = await bcrypt.compareSync(req.body.password, user.password);
        if (!isValidated) {
            return res.status(404).json('Wrong credentials');
        }

        // Define the activeUser value (true or 'yes').
        const activeUser = 'yes';

        // Update the `activeUser` field in the user document.
        const active = await User.findByIdAndUpdate(
            user.id,
            { $set: { activeUser } },
            { new: true }
        );

        const { password, isAdmin, ...others } = user._doc;

        const access_token = await jwt.sign(
            { id: user.id, isAdmin: user.isAdmin }, process.env.JWT, { expiresIn: "1h" }
        );

        res.status(200).json({ message: 'Login successful', ...others, access_token });
    } catch (err) {
        next(err);
        console.log(err);
    }
};

// GET LOGGED IN USER DATA
const getUserData = async (req, res, next) => {
    const email = req.query.email
    try {
        const getPostData = await Posts.find({ 'user.email': email })
        const getVideoData = await Videos.find({ 'user.email': email })
        res.status(200).json({ getPostData, getVideoData })
        // console.log(getData)
    } catch (err) {
        next(err);
    }
}

// COUNT POSTS AND VIDEOS LENGTH
const postsAndVideoslenght = async (req, res, next) => {
    const email = req.query.email
    try {
        const getPostData = await Posts.find({ 'user.email': email })
        const getVideoData = await Videos.find({ 'user.email': email })
        const postCount = getPostData.length;
        const videoCount = getVideoData.length;
        const totalPostAndVideoCountLength = getPostData.length + getVideoData.length
        const combinedData = {
            postCount,
            videoCount,
            totalPostAndVideoCountLength,
            getPostData,
            getVideoData,
        };

        res.status(200).json(combinedData);
    } catch (error) {
        next(error)
    }
}

// UPDATE USER
const updateUser = async (req, res, next) => {
    if (req.body.userId === req.params.id) {
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        }

        try {
            const update = await User.findByIdAndUpdate(req.params.id,
                { $set: req.body },
                { new: true }
            )
            res.status(200).json('profile updated')
            // console.log(update)
        } catch (err) {
            next(err);
            console.log(err)
        }
    } else {
        res.status(401).json("You can update only your account!");

    }
}

// GET ALL USERS
const allUsers = async (req, res, next) => {
    try {
        const user = await User.find({})
        res.status(200).json(user)
        // console.log(user)
    } catch (err) {
        next(err);
        console.log(err)
    }
}

// FIND USER THROUGH EMAIL
const userByEmail = async (req, res, next) => {
    try {
        const email = req.query.email;
        // Find the user by email
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Return the user data
        res.status(200).json(user);
    } catch (error) {
        next(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }

}
// GET USER BY ID
const getUsersById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
        res.status(200).json(user)
    } catch (err) {
        next(err);
    }
}
// DELETE USERS
const deleteUsers = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id)
        res.status(200).json('user has been deleted')
    } catch (err) {
        next(err);
    }
}
// SEND MESSAGES TO ANY PARTICULAR USER
const sendMessage = async (req, res, next) => {
    const id = req.params.id
    const myId = req.params.myId
    try {
        const {
            username,
            email,
            desc,
            photo,
            toUser,
            userId,
            subject,
            uniCode } = req.body;
        // to ( whoom I'm sending the message)
        const user = await User.findById(id)
        if (!user) {
            return res.status(400).json({ error: 'user not found' });
        }

        // from ( I'm sending the message)
        const sentMsgs = await User.findById(myId)
        if (!sentMsgs) {
            return res.status(400).json({ error: 'I am not logged in' });
        }

        if (!username || !userId || !uniCode || !subject || !desc) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const newMessage = { username, email, desc, photo, toUser, userId, subject, uniCode };
        user.messages.push(newMessage);
        await user.save()

        const myMessage = { username, email, desc, photo, toUser, userId, subject, uniCode };
        sentMsgs.SentMessages.push(myMessage);
        await sentMsgs.save()

        res.status(201).json({ message: 'message sent' });
    } catch (err) {
        next(err);
    }
}

// GET SINGLE RECIEVED MESSAGES FROM ANY USER
const getSingleMessage = async (req, res, next) => {
    const userId = req.params.userId
    const messageId = req.params.id;
    try {
        const user = await User.findById(userId)
        if (!user) {
            res.status(400).json('user is not found')
        }
        const getSingleMessage = user.messages.find((msg) => msg.id === messageId)
        res.status(200).json(getSingleMessage)
    } catch (err) {
        next(err)
    }
}
// GET SINGLE SENT MESSAGES
const getSingleSentMessage = async (req, res, next) => {
    const userId = req.params.userId
    const messageId = req.params.id;
    try {
        const user = await User.findById(userId)
        if (!user) {
            res.status(400).json('user is not found')
        }
        const getSingleMessage = user.SentMessages.find((msg) => msg.id === messageId)
        res.status(200).json(getSingleMessage)
    } catch (err) {
        next(err)
    }
}

// DELETE RECEIVED MESSAGES 
// const deleteRcvMessages = async(req, res, next) => {
//     const userId = req.params.userId
//     const messageId = req.params.id;
//     try{
//         const user = await User.findById(userId)
//         if (!user) {
//             res.status(400).json('user is not found')
//         }
//         let getSingleMessage = user.messages.findByIdAndDelete((msg) => msg.id === messageId)
//         getSingleMessage && res.status(200).json({message:'message deleted'})
//     }
//     catch(err){
//         next(err)
//     }
// }
const deleteRcvMessages = async (req, res, next) => {
    const userId = req.params.userId;
    const messageId = req.params.id;
    
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(400).json('User is not found');
        }

        const messageIndex = user.messages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
            user.messages.splice(messageIndex, 1);
            await user.save();
            return res.status(200).json({ message: 'Message deleted' });
        } else {
            return res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        next(err);
    }
};

// DELETE SENT MESSAGES 
const deleteSentMessages = async(req, res, next) => {
    const userId = req.params.userId;
    const messageId = req.params.id;
    
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(400).json('User is not found');
        }

        const messageIndex = user.SentMessages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
            user.SentMessages.splice(messageIndex, 1);
            await user.save();
            return res.status(200).json({ message: 'Message deleted' });
        } else {
            return res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        next(err);
    }
}

module.exports = {
    allUsers,
    getUsersById,
    register,
    login,
    updateUser,
    deleteUsers,
    getUserData,
    userByEmail,
    postsAndVideoslenght,
    sendMessage,
    getSingleMessage,
    deleteRcvMessages,
    deleteSentMessages,
    getSingleSentMessage,
}