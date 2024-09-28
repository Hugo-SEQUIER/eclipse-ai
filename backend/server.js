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
  try {
    const irysUploader = await Uploader(Eclipse).withWallet(process.env.PRIVATE_KEY);
    return irysUploader;
  } catch (error) {
    console.error('Error initializing Irys uploader:', error);
    throw error;
  }
};

app.post('/upload', async (req, res) => {
  try {
    console.log('Received data:', req.body); // Log only the request body
    const { data, address } = req.body; // Extract data and address from the request body

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    if (!address) {
      return res.status(400).json({ error: 'No address provided' });
    }

    const tags = [{ name: 'address', value: address }]; // Define tags with the user's address

    const irys = await getIrysUploader();
    const receipt = await irys.upload(JSON.stringify(data), { tags: tags }); // Pass tags to the upload method

    res.json({ 
      message: 'Data uploaded successfully',
      url: `https://gateway.irys.xyz/${receipt.id}`
    });
  } catch (error) {
    console.error('Error uploading data:', error);
    res.status(500).json({ error: 'Error uploading data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});