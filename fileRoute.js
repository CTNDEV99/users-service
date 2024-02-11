
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); 
const router = express.Router();
const uploadPath = path.join(__dirname, '../public/file-container'); 
var ObjectId = require('mongodb').ObjectId;



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueFileName = `${uuidv4()}-${file.originalname}`; 
      cb(null, uniqueFileName);
    }
  });

// Créez le middleware Multer pour gérer l'upload des fichiers
const upload = multer({ storage });

// Endpoint pour l'upload d'un fichier
router.post('/upload/:type', upload.single('file'), (req, res) => {
  try {

    const type = req.params.type;
    console.log(type)
    console.log(req.file.filename)
    console.log(req.body)
    res.json({ message: 'Fichier téléchargé avec succès !' });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Erreur lors du téléchargement des fichiers !' });
  }
   
});

// Endpoint pour le download d'un fichier
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadPath, filename);
  console.log("ok")
  // Vérifiez si le fichier existe
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ message: 'Fichier non trouvé.' });
    }

    // Renvoie le fichier en tant que réponse
    res.sendFile(filePath);
  });
});

module.exports = router;
