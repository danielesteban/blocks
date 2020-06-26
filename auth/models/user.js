const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const sessionSecret = process.env.SESSION_SECRET || 'superunsecuresecret';
if (process.env.NODE_ENV === 'production' && sessionSecret === 'superunsecuresecret') {
  console.warn('\nSecurity warning:\nYou must provide a random SESSION_SECRET.\n');
}

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    index: true,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  skin: {
    type: Buffer,
    required: true,
  },
}, { timestamps: true });

UserSchema.pre('save', function onSave(next) {
  const user = this;
  const promises = [];
  if (user.isModified('password')) {
    promises.push(
      new Promise((resolve, reject) => (
        bcrypt.genSalt(5, (err, salt) => {
          if (err) return reject(err);
          return bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) return reject(err);
            user.password = hash;
            return resolve();
          });
        })
      ))
    );
  }
  if (user.isModified('skin')) {
    promises.push(
      sharp(user.skin)
        .resize(64, 16)
        .png()
        .toBuffer()
        .then((skin) => {
          user.skin = skin;
        })
    );
  }
  if (!promises.length) {
    return next();
  }
  return Promise
    .all(promises)
    .then(() => next())
    .catch(next);
});

UserSchema.methods = {
  comparePassword(candidatePassword) {
    const user = this;
    return new Promise((resolve, reject) => (
      bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(isMatch);
      })
    ));
  },
  getNewSession() {
    return {
      name: this.name,
      token: jwt.sign(
        {
          _id: this._id,
        },
        sessionSecret,
        { expiresIn: '7d' }
      ),
    };
  },
};

UserSchema.statics = {
  authenticate(req, res, next) {
    const User = mongoose.model('User');
    let token;
    if (req.headers.authorization) {
      const [type, value] = req.headers.authorization.split(' ');
      if (type === 'Bearer') {
        token = value;
      }
    }
    if (!token) {
      res.status(401).end();
      return;
    }
    jwt.verify(token, sessionSecret, (err, decoded) => {
      if (err) {
        res.status(401).end();
        return;
      }
      User
        .findOne({ _id: decoded._id })
        .select('_id')
        .then((user) => {
          if (!user) {
            res.status(401).end();
            return;
          }
          req.user = user;
          next();
        })
        .catch(() => (
          res.status(401).end()
        ));
    });
  },
};

module.exports = mongoose.model('User', UserSchema);
