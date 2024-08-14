require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const crypto = require('crypto');


// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Express
const app = express();
const port = 3000;

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

async function transcribeAudio(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found: ' + filePath);
        }

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
        });

        const fileName = path.basename(filePath, path.extname(filePath));
        const outputFilePath = path.join(__dirname, 'transcriptions', fileName + '.txt');
        fs.writeFileSync(outputFilePath, transcription.text, 'utf8');

        return transcription.text;
    } catch (error) {
        throw new Error("Error during transcription: " + error.message);
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

    return {
        keyPoints: keyPoints.choices[0].message.content,
        actionItems: actionItems.choices[0].message.content,
        participants: participants.choices[0].message.content,
        sentiment: sentiment.choices[0].message.content
    };
}

// Endpoint to upload audio, transcribe it, and delete the file
app.post('/transcribe', upload.single('audioFile'), async (req, res) => {
    const uploadedFilePath = req.file.path;
    const targetPath = path.join(__dirname, 'uploads', req.file.originalname);

    try {
        // Copy the file to the /uploads directory
        fs.copyFileSync(uploadedFilePath, targetPath);
        console.log(`File copied to ${targetPath}`);

        // Transcribe the audio file
        const transcriptText = await transcribeAudio(targetPath);

        // Generate a unique ID for the transcript
        const transcriptId = crypto.randomUUID(); // TODO: save to db or just do everything in one request and return the analyze.

        res.json({ transcriptId: transcriptId, transcript: transcriptText });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up the temporary and uploaded files
        fs.unlinkSync(uploadedFilePath);
        fs.unlinkSync(targetPath);
        console.log('Temporary and copied files removed');
    }
});

// Endpoint to analyze a given transcript
app.post('/analyze', express.json(), async (req, res) => {
    try {
        const transcriptId = req.body.transcriptId;
        if (!transcriptId || !transcripts[transcriptId]) {
            return res.status(400).json({ error: "Valid transcriptId is required." });
        }

        const transcriptText = transcripts[transcriptId];
        const analysis = await analyzeMeetingTranscript(transcriptText);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
