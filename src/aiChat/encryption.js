import CryptoJS from 'crypto-js'; 

const SECRET_KEY = process.env.REACT_APP_SECRET_KEY;

export const encryptText = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptText = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return 'Decryption Error';
    }
};