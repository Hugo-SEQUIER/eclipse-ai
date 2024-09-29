import { WebUploader } from "@irys/web-upload";
import { WebEclipse } from "@irys/web-upload-solana";
  
const getIrysUploader = async (wallet) => {
    try {
    const irysUploader = await WebUploader(WebEclipse).withProvider(wallet);
        
    return irysUploader; 
    } catch (error) {
    console.error("Error connecting to Irys:", error);
    throw new Error("Error connecting to Irys");
    }
};
 
export async function uploadToIrys(data, wallet) {
    try {
        if (!data) {
          return { error: 'No data provided' };
        }

        const tags = [{ name: 'address', value: "DJi9qeHDT5vpu1iKApVvPxfBa7UYdSkuMPPsZ97zxvSc" }];
    
        const irys = await getIrysUploader(wallet);
        const receipt = await irys.upload(JSON.stringify(data), { tags: tags }); // Pass tags to the upload method
    
        return { 
          message: 'Data uploaded successfully',
          url: `https://gateway.irys.xyz/${receipt.id}`
        };
      } catch (error) {
        console.error('Error uploading data:', error);
        return { error: 'Error uploading data', details: error.message };
      }
}
