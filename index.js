// index.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fileRoute = require('./fileRoute');
const app = express();
const port = 8080;
const cors = require('cors');
mongoose.connect('mongodb://localhost:27017/ladoum', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
const User = mongoose.model('User', {
  username: { type: String, unique: true, required: true },
  tel:{ type: String,unique: true, required: true },
  email:{ type: String,unique: true, required: true },
  nom:{ type: String,required: true },
  prenom:{ type: String,required: true },
  address:{ type: String,required: false },
  password: { type: String,required: true },
});

const Token = mongoose.model('Token', {
  token: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' , autopopulate: true},
});

app.use(bodyParser.json());

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace("Bearer ","");
  if (token == null) return res.sendStatus(401);
  const tokenExists = await Token.exists({ token: token });
  if (!tokenExists) {
    return res.sendStatus(401);
  }
  jwt.verify(token, 'ladoum221', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });  
  } catch (error) {
    return res.sendStatus(401)
  }
  
};

// Middleware pour gérer l'expiration du token
const generateAccessToken = (user) => {
  const accessToken = jwt.sign({ username: user.username }, 'ladoum221', { expiresIn: '10d' });
  const tokenRecord = new Token({ token: accessToken});
  tokenRecord.save();
  return accessToken;
};

app.post('/register', async (req, res) => {
  try {
    console.log(req.body)
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    const user = new User({ username: req.body.username, password: hashedPassword , nom:req.body.nom,prenom:req.body.prenom,address:req.body.address,tel:req.body.tel,email:req.body.email});
    
    await user.save();

    const accessToken = generateAccessToken(user);
    delete user.password
    const userSend = user
    res.json({ accessToken: accessToken,user:userSend });
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message);
  }
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.identifier });
  if (user == null) {
    return res.status(400).send('Cannot find user');
  }

  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      const accessToken = generateAccessToken(user);
      delete user.password
      const userSend = user
      res.json({ accessToken: accessToken,user:userSend });
    } else {
      res.status(401).send('Wrong password');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Route de déconnexion (logout)
app.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.header('Authorization');
    await Token.findOneAndDelete({ token: token });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Vous pouvez modifier les propriétés de l'utilisateur avant de le renvoyer si nécessaire
    const userToSend = { 
      _id: user._id,
      username: user.username,
      tel: user.tel,
      nom: user.nom,
      prenom: user.prenom,
      address: user.address,
    };
    res.status(200).json(userToSend);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.use('/files', fileRoute);

// Endpoint pour mettre à jour le mot de passe de l'utilisateur
app.patch('/users/:id/password', authenticateToken, async (req, res) => {
  try {
    // Vérifiez si l'utilisateur existe
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifiez si le mot de passe actuel est correct
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // Hachez le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(req.body.newPassword, 10);

    // Mettez à jour le mot de passe de l'utilisateur
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Middleware pour vérifier si le token est actif
const isActiveToken = async (req, res, next) => {
  const token = req.header('Authorization');
  const tokenExists = await Token.exists({ token: token });
  if (!tokenExists) {
    return res.sendStatus(401);
  }
  next();
};

app.get('/verify', authenticateToken, isActiveToken, (req, res) => {
  res.sendStatus(201);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
