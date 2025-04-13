const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    snippets: [{
        id: Number,
        html: String,
        position: {
            x: Number,
            y: Number
        },
        size: {
            width: Number,
            height: Number
        }
    }],
    navButtons: [{
        id: String,
        targetPage: String,
        text: String,
        style: {
            type: String,
            default: 'btn-primary'
        },
        position: {
            x: {
                type: Number,
                default: 20
            },
            y: {
                type: Number,
                default: 20
            }
        }
    }],
    isDefault: {
        type: Boolean,
        default: false
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Update timestamp on save
pageSchema.pre('save', function(next) {
    this.updated = new Date();
    next();
});

module.exports = mongoose.model('Page', pageSchema); 