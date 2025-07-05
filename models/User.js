const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    username: { type: String, },
    email: { type: String, },
    photo: { type: String, },
    userId: { type: String, },
    toUser:{type: String,},
    subject: { type: String, },
    desc: { type: String, },
    uniCode: { type: String}
})

const SentMsgs = new mongoose.Schema({
    username: { type: String, },
    email: { type: String, },
    photo: { type: String, },
    userId: { type: String, },
    toUser:{type: String,},
    subject: { type: String, },
    desc: { type: String, },
    uniCode: { type: String}
})

const UserSchema = new mongoose.Schema({

    username: {
        type: String,
        require: true,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        require: true,
    },
    photo: {
        type: String,
        default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnMRBVny69Hii_1IH-jpKOya1QhHlCMVxc-UV-gPM&s'
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    terms: {
        type: String,
    },
    messages: [MessageSchema],
    SentMessages: [SentMsgs],
    activeUser: {
        type: String,
        default: 'no',
    },
    role: {
        type: String,
        default: 'user',
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("User", UserSchema);