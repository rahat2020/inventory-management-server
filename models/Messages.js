const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
    },
    role: {
        type: String,
    },
    photo: {
        type: String,
    },
    
})

const MessagesSchema = new mongoose.Schema({
    sender: [userSchema],
    reciever:{
        type: String,
        required: true,
    },
    subject:{
        type: String,
        required: true, 
    },
    desc: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Messages", MessagesSchema);