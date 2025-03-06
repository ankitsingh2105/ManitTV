const mongoose = require("mongoose");

function connectToMongoDB(url){
    return mongoose.connect(url);
}

module.exports = connectToMongoDB;