const express = require('express');
const cors = require('cors');
const { Uploader } = require("@irys/upload");
const { Eclipse } = require("@irys/upload-solana");
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
const getIrysUploader = async () => {
  const irysUploader = await Uploader(Eclipse).withWallet(process.env.PRIVATE_KEY);
  return irysUploader;
};

app.post('/upload', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const irys = await getIrysUploader();
    const receipt = await irys.upload(data);
    
    res.json({ 
      message: 'Data uploaded successfully',
      url: `https://gateway.irys.xyz/${receipt.id}`
    });
  } catch (error) {
    console.error('Error uploading data:', error);
    res.status(500).json({ error: 'Error uploading data' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});