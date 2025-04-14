const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    preferences: {
        theme: {
            type: String,
            default: 'light'
        },
        defaultPage: {
            type: String,
            default: 'home'
        },
        sidebarCollapsed: {
            type: Boolean,
            default: false
        }
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    tokenVersion: {
        type: Number,
        default: 0
    }
});

// Make sure when updating a user we don't return the password
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Update last login timestamp
userSchema.methods.updateLoginTimestamp = async function() {
    this.lastLogin = new Date();
    return this.save();
};

module.exports = mongoose.model('User', userSchema); 