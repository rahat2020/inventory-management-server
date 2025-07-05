const Messages = require("../models/Messages");

// SEND MESSAGE TO ADMIN
const sendMessage = async (req, res, next) => {
    try {
        const messageBody = await Messages(req.body)
        const sendMessage = await messageBody.save()
        sendMessage && res.status(200).json('message sent successfully')
    } catch (err) {
        next(err);
    }
}
// GET MESSAGES 
const getMessage = async (req, res, next) => {
    try {
        const email = req.query.email;
        // Find the user by email
        const msg = await Messages.findOne({ reciever: email });
        if (!msg) {
            return res.status(404).json({ message: 'Message not found' });
        }
        // const messageCount = await Messages.countDocuments({ receiver: email });
        // res.status(200).json({ message: msg, messageCount });
        res.status(200).json(msg);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    sendMessage,
    getMessage
}