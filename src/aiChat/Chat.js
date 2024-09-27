import axios from 'axios';

const apiKey = process.env.REACT_APP_API_KEY;
const apiUrl = "https://chatapi.akash.network/api/v1/chat/completions";

export async function getResponse(prompt) {
  try {
    const response = await axios.post(apiUrl, {
      model: "Meta-Llama-3-1-8B-Instruct-FP8",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const formattedResponse = response.data.choices[0].message.content;
    console.log(formattedResponse);
    return formattedResponse;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return undefined;
  }
}