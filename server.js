#!/usr/bin/env node
const express = require('express');
const { KokoroTTS } = require("kokoro-js");
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' })); // Increase limit for longer texts
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));

// For file uploads
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

let ttsInstance = null;
let availableVoices = {};
let voiceCategories = {};
let modelStatus = {
    loading: false,
    progress: 0,
    message: 'Not initialized'
};

// Quality settings
const QUALITY_SETTINGS = {
    'fast': { speed: 1.2 },
    'balanced': { speed: 1.0 },
    'high': { speed: 0.8 },
    'premium': { speed: 0.7 }
};

// Chunk size - adjust based on model's context limit
const MAX_CHUNK_LENGTH = 500; // characters per chunk

async function initializeTTS() {
    try {
        console.log('Initializing Kokoro TTS...');
        modelStatus = {
            loading: true,
            progress: 0,
            message: 'Starting model initialization...'
        };

        // Simulate download progress since KokoroTTS.from_pretrained doesn't provide progress callbacks
        // In a real implementation, if there were progress events, we could update the modelStatus.progress
        modelStatus.progress = 10;
        modelStatus.message = 'Downloading model...';

        ttsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX");

        modelStatus.progress = 90;
        modelStatus.message = 'Loading model...';

        console.log('Kokoro TTS initialized successfully!');
        modelStatus.progress = 100;
        modelStatus.message = 'Model loaded successfully!';
        modelStatus.loading = false;

        await loadAvailableVoices();

    } catch (error) {
        console.error('Failed to initialize TTS:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        modelStatus = {
            loading: false,
            progress: 0,
            message: `Error: ${error.message}`
        };
    }
}

async function loadAvailableVoices() {
    try {
        console.log('Loading available voices...');
        
        let voices = [];
        
        if (ttsInstance && ttsInstance.model && ttsInstance.model.voices) {
            console.log('Found voices in model.voices');
            voices = Object.keys(ttsInstance.model.voices);
        }
        else if (ttsInstance && ttsInstance.model && ttsInstance.model.config) {
            console.log('Looking for voices in model config...');
            const config = ttsInstance.model.config;
            if (config.voices) {
                voices = Object.keys(config.voices);
            } else if (config.model && config.model.voices) {
                voices = Object.keys(config.model.voices);
            }
        }
        else {
            console.log('Using predefined voice list...');
            voices = await getPredefinedVoices();
        }
        
        console.log('Discovered voices:', voices);
        
        if (voices && voices.length > 0) {
            processVoices(voices);
            console.log(`Successfully loaded ${Object.keys(availableVoices).length} voices`);
        } else {
            console.log('No voices found, using default list');
            loadDefaultVoices();
        }
        
    } catch (error) {
        console.error('Error loading voices:', error);
        console.log('Falling back to default voice list...');
        loadDefaultVoices();
    }
}

async function getPredefinedVoices() {
    return [
        'af_heart', 'af_bella', 'af_alloy', 'af_aoede', 'af_nicole', 
        'af_kore', 'af_sarah', 'af_nova', 'af_sky', 'af_jessica', 'af_river',
        'am_fenrir', 'am_michael', 'am_puck', 'am_echo', 'am_eric',
        'am_liam', 'am_onyx', 'am_adam', 'am_santa',
        'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily',
        'bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel'
    ];
}

function processVoices(voiceList) {
    if (!voiceList || !Array.isArray(voiceList)) {
        console.error('voiceList is not an array:', voiceList);
        loadDefaultVoices();
        return;
    }
    
    availableVoices = {};
    voiceCategories = {
        'us_female_premium': [],
        'us_female_good': [],
        'us_female_basic': [],
        'us_male_good': [],
        'us_male_basic': [],
        'uk_female': [],
        'uk_male': [],
        'other': []
    };
    
    const voiceMetadata = {
        'af_heart': { name: 'Heart ❤️ (Premium)', category: 'us_female_premium', description: 'Premium US English female voice with natural tone and emotional warmth' },
        'af_bella': { name: 'Bella 🔥 (Premium)', category: 'us_female_premium', description: 'Premium US English female voice with energetic and expressive delivery' },
        'af_alloy': { name: 'Alloy', category: 'us_female_good', description: 'Clear and reliable US English female voice' },
        'af_aoede': { name: 'Aoede', category: 'us_female_good', description: 'Smooth and pleasant US English female voice' },
        'af_nicole': { name: 'Nicole 🎧', category: 'us_female_good', description: 'Studio-quality US English female voice' },
        'af_kore': { name: 'Kore', category: 'us_female_good', description: 'Balanced and natural US English female voice' },
        'af_sarah': { name: 'Sarah', category: 'us_female_good', description: 'Friendly and approachable US English female voice' },
        'af_nova': { name: 'Nova', category: 'us_female_good', description: 'Modern and clear US English female voice' },
        'af_sky': { name: 'Sky', category: 'us_female_basic', description: 'Basic but clear US English female voice' },
        'af_jessica': { name: 'Jessica', category: 'us_female_basic', description: 'Standard US English female voice' },
        'af_river': { name: 'River', category: 'us_female_basic', description: 'Natural flowing US English female voice' },
        'am_fenrir': { name: 'Fenrir', category: 'us_male_good', description: 'Strong and clear US English male voice' },
        'am_michael': { name: 'Michael', category: 'us_male_good', description: 'Professional US English male voice' },
        'am_puck': { name: 'Puck', category: 'us_male_good', description: 'Energetic and expressive US English male voice' },
        'am_echo': { name: 'Echo', category: 'us_male_basic', description: 'Standard US English male voice' },
        'am_eric': { name: 'Eric', category: 'us_male_basic', description: 'Reliable US English male voice' },
        'am_liam': { name: 'Liam', category: 'us_male_basic', description: 'Friendly US English male voice' },
        'am_onyx': { name: 'Onyx', category: 'us_male_basic', description: 'Deep US English male voice' },
        'am_adam': { name: 'Adam', category: 'us_male_basic', description: 'Basic US English male voice' },
        'am_santa': { name: 'Santa 🎅', category: 'us_male_basic', description: 'Festive US English male voice' },
        'bf_emma': { name: 'Emma 🚺 (Good)', category: 'uk_female', description: 'Clear British English female voice' },
        'bf_isabella': { name: 'Isabella (Good)', category: 'uk_female', description: 'Elegant British English female voice' },
        'bf_alice': { name: 'Alice 🚺 (Basic)', category: 'uk_female', description: 'Standard British English female voice' },
        'bf_lily': { name: 'Lily 🚺 (Basic)', category: 'uk_female', description: 'Pleasant British English female voice' },
        'bm_george': { name: 'George (Good)', category: 'uk_male', description: 'Classic British English male voice' },
        'bm_fable': { name: 'Fable 🚹 (Good)', category: 'uk_male', description: 'Expressive British English male voice' },
        'bm_lewis': { name: 'Lewis (Basic)', category: 'uk_male', description: 'Standard British English male voice' },
        'bm_daniel': { name: 'Daniel 🚹 (Basic)', category: 'uk_male', description: 'Reliable British English male voice' }
    };
    
    voiceList.forEach(voiceId => {
        if (voiceMetadata[voiceId]) {
            availableVoices[voiceId] = voiceMetadata[voiceId].name;
            voiceCategories[voiceMetadata[voiceId].category].push({
                id: voiceId,
                name: voiceMetadata[voiceId].name,
                description: voiceMetadata[voiceId].description
            });
        } else {
            availableVoices[voiceId] = voiceId;
            voiceCategories.other.push({
                id: voiceId,
                name: voiceId,
                description: `Voice: ${voiceId}`
            });
        }
    });
    
    console.log('Processed voices:', Object.keys(availableVoices));
    console.log('Voice categories:', Object.keys(voiceCategories).map(cat => ({
        category: cat,
        count: voiceCategories[cat].length
    })));
}

function loadDefaultVoices() {
    console.log('Loading default voice list...');
    const defaultVoices = [
        'af_heart', 'af_bella', 'af_alloy', 'af_aoede', 'af_nicole',
        'af_kore', 'af_sarah', 'af_nova', 'af_sky', 'af_jessica', 'af_river',
        'am_fenrir', 'am_michael', 'am_puck', 'am_echo', 'am_eric',
        'am_liam', 'am_onyx', 'am_adam', 'am_santa',
        'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily',
        'bm_george', 'bm_fable', 'bm_lewis', 'bm_daniel'
    ];
    
    processVoices(defaultVoices);
}

// Split text into smart chunks
function splitTextIntoChunks(text, maxLength = MAX_CHUNK_LENGTH) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        
        // If a single sentence is too long, split it by commas or spaces
        if (trimmedSentence.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            const subParts = trimmedSentence.split(/,|;/).map(p => p.trim());
            for (const part of subParts) {
                if (part.length > maxLength) {
                    // Split by words if still too long
                    const words = part.split(' ');
                    let wordChunk = '';
                    for (const word of words) {
                        if ((wordChunk + ' ' + word).length > maxLength) {
                            if (wordChunk) chunks.push(wordChunk.trim());
                            wordChunk = word;
                        } else {
                            wordChunk += (wordChunk ? ' ' : '') + word;
                        }
                    }
                    if (wordChunk) chunks.push(wordChunk.trim());
                } else if ((currentChunk + ' ' + part).length > maxLength) {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = part;
                } else {
                    currentChunk += (currentChunk ? ' ' : '') + part;
                }
            }
        } else if ((currentChunk + ' ' + trimmedSentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = trimmedSentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
}

// Concatenate audio buffers
function concatenateAudioBuffers(audioBuffers, sampleRate) {
    // Calculate total length
    let totalLength = 0;
    for (const buffer of audioBuffers) {
        totalLength += buffer.length;
    }
    
    // Create combined Float32Array
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const buffer of audioBuffers) {
        combinedAudio.set(buffer, offset);
        offset += buffer.length;
    }
    
    return {
        audio: combinedAudio,
        sampling_rate: sampleRate
    };
}

// Function to convert RawAudio to WAV buffer
function rawAudioToWavBuffer(rawAudio) {
    const audioData = rawAudio.audio;
    const sampleRate = rawAudio.sampling_rate;
    
    console.log('Audio data length:', audioData.length);
    console.log('Sample rate:', sampleRate);
    
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
        int16Data[i] = Math.max(-32768, Math.min(32767, Math.round(audioData[i] * 32767)));
    }
    
    const wavBuffer = createWavBuffer(int16Data, sampleRate);
    return wavBuffer;
}

function createWavBuffer(audioData, sampleRate) {
    const audioLength = audioData.length * 2;
    const buffer = Buffer.alloc(44 + audioLength);
    
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + audioLength, 4);
    buffer.write('WAVE', 8);
    
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    
    buffer.write('data', 36);
    buffer.writeUInt32LE(audioLength, 40);
    
    for (let i = 0; i < audioData.length; i++) {
        buffer.writeInt16LE(audioData[i], 44 + i * 2);
    }
    
    return buffer;
}

app.post('/generate', async (req, res) => {
    console.log('Received generate request');
    
    try {
        const { text, voice = 'af_heart', quality = 'balanced' } = req.body;
        
        if (!text) {
            console.log('No text provided in request');
            return res.status(400).json({ error: 'Text is required' });
        }
        
        if (modelStatus.loading) {
            console.log('Model is still loading');
            return res.status(503).json({
                error: 'Model is still loading. Please wait...',
                modelStatus: modelStatus
            });
        }

        if (!ttsInstance) {
            console.log('TTS instance not initialized');
            return res.status(500).json({
                error: 'TTS not initialized. Please check server logs.',
                modelStatus: modelStatus
            });
        }
        
        if (!availableVoices[voice]) {
            return res.status(400).json({ 
                error: `Invalid voice selection: ${voice}`,
                availableVoices: Object.keys(availableVoices)
            });
        }
        
        if (!QUALITY_SETTINGS[quality]) {
            return res.status(400).json({ error: 'Invalid quality setting' });
        }
        
        console.log(`Generating speech for text of length: ${text.length} characters`);
        console.log(`Voice: ${voice} (${availableVoices[voice]}), Quality: ${quality}`);
        
        const qualitySettings = QUALITY_SETTINGS[quality];
        
        // Split text into chunks
        const chunks = splitTextIntoChunks(text);
        console.log(`Split text into ${chunks.length} chunks`);
        
        // Generate audio for each chunk
        const audioBuffers = [];
        let sampleRate = null;
        
        for (let i = 0; i < chunks.length; i++) {
            console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
            
            const audio = await ttsInstance.generate(chunks[i], {
                voice: voice,
                speed: qualitySettings.speed,
            });
            
            if (!sampleRate) {
                sampleRate = audio.sampling_rate;
            }
            
            audioBuffers.push(audio.audio);
        }
        
        console.log('All chunks generated, concatenating audio...');
        
        // Concatenate all audio buffers
        const combinedAudio = concatenateAudioBuffers(audioBuffers, sampleRate);
        
        console.log('Audio concatenated successfully');
        
        // Convert to WAV buffer
        const buffer = rawAudioToWavBuffer(combinedAudio);
        console.log('WAV buffer created, length:', buffer.length);
        
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename="tts-${voice}-${quality}.wav"`);
        res.send(buffer);
        
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Error generating speech:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Failed to generate speech',
            details: error.message
        });
    }
});

// New endpoint for file upload
app.post('/upload-file', upload.single('file'), async (req, res) => {
    console.log('Received file upload request');
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { voice = 'af_heart', quality = 'balanced' } = req.body;
        
        // Read file content
        let text = '';
        const fileBuffer = req.file.buffer;
        const filename = req.file.originalname.toLowerCase();
        
        // Handle different file types
        if (filename.endsWith('.txt')) {
            text = fileBuffer.toString('utf-8');
        } else if (filename.endsWith('.pdf')) {
            return res.status(400).json({ 
                error: 'PDF files are not supported yet. Please convert to .txt file.' 
            });
        } else {
            // Try to read as text anyway
            text = fileBuffer.toString('utf-8');
        }
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'File is empty or could not be read' });
        }
        
        console.log(`File uploaded: ${req.file.originalname} (${text.length} characters)`);
        
        // Return the text to be processed by the client
        res.json({
            success: true,
            text: text,
            filename: req.file.originalname,
            length: text.length
        });
        
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ 
            error: 'Failed to process file',
            details: error.message
        });
    }
});

app.get('/settings', (req, res) => {
    res.json({
        voices: availableVoices,
        voiceCategories: voiceCategories,
        qualitySettings: QUALITY_SETTINGS,
        totalVoices: Object.keys(availableVoices).length,
        maxChunkLength: MAX_CHUNK_LENGTH,
        modelStatus: modelStatus
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        ttsInitialized: !!ttsInstance,
        availableVoices: Object.keys(availableVoices).length,
        maxChunkLength: MAX_CHUNK_LENGTH,
        timestamp: new Date().toISOString(),
        modelStatus: modelStatus
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'gui.html'));
});

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Health check available at http://localhost:3000/health');
    console.log('Settings available at http://localhost:3000/settings');
    await initializeTTS();
});