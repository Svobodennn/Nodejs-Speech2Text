require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudio(filePath) {
    try {
        // Ensure the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found: ' + filePath);
        }

        // Transcribe the audio file
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
        });

        return transcription.data.text;
        
    } catch (error) {
        console.error("Error during transcription:", error);
    }
}

async function analyzeMeetingTranscript(transcriptText) {
    const actionItems = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Extract all action items from the following transcript." },
            { role: "user", content: transcriptText }
        ],
    });

    const participants = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Identify the participants in the following transcript." },
            { role: "user", content: transcriptText }
        ],
    });

    const sentiment = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Analyze the sentiment of the following text." },
            { role: "user", content: transcriptText }
        ],
    });

    const keyPoints = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Extract key points from the following text." },
            { role: "user", content: transcriptText }
        ],
    });

    console.log("Keypoints:", keyPoints.data.choices[0].message.content);
    console.log("Action Items:", actionItems.data.choices[0].message.content);
    console.log("Participants:", participants.data.choices[0].message.content);
    console.log("Sentiment Analysis:", sentiment.data.choices[0].message.content);
}

// Example usage
const filePath = path.join(__dirname, 'audios', 'test1.mp3');

async function main() {
    const transcriptText = await transcribeAudio(filePath);
    if (transcriptText) {
        analyzeMeetingTranscript(transcriptText);
    }
}

main();
