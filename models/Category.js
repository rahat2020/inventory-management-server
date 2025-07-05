const mongoose = require('mongoose')

const CategorySchema = new mongoose.Schema({

    title: {
        type: String,
    },
    photo: {
        type: String,
    },
    description: {
        type: String,
    },
}, {
    timestamps: true
})

module.exports = mongoose.model("Category", CategorySchema);



