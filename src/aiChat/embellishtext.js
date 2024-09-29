const formatDays = (text) => {
    return text.replace(/\*\*Day \d+:.*?\*\*/g, match => `\n\n## ${match}\n`);
};
  
const formatExercises = (text) => {
    return text.replace(/(\d+\.\s*[\w\s-]+:)/g, match => `\n**${match}**\n`);
};
  
const formatExerciseDetails = (text) => {
    return text.replace(/\*\s*([\w-]+):\s*(\d+(?:\s*sets?\s*of)?\s*\d+(?:\s*reps?)?)/g, 
      (_, exercise, details) => `  - *${exercise}:* ${details}`);
};
  
const addLineBreaks = (text) => {
    return text.replace(/(\d+\.\s*[\w\s-]+:.*?)(?=\d+\.|$)/gs, '$1\n');
};
  
// Add this new function for Markdown-to-HTML conversion
const convertMarkdownToHtml = (text) => {
    // Convert headers
    text = text.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Convert bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert bullet points
    text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Convert line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
};

export const embellishText = (text) => {
    let embellishedText = text;
    embellishedText = formatDays(embellishedText);
    embellishedText = formatExercises(embellishedText);
    embellishedText = formatExerciseDetails(embellishedText);
    embellishedText = addLineBreaks(embellishedText);
    embellishedText = convertMarkdownToHtml(embellishedText);
    return embellishedText;
};
