# Kokoro TTS Generator 🎵

A powerful web-based Text-to-Speech application using the Kokoro-82M model with unlimited text support and smart audio chunking.

<p align="center">
<img width="480" height="395" alt="image" src="https://github.com/user-attachments/assets/f0733074-a156-4c86-a11c-2182485e99bb" />
</p>

## Features

✨ **Unlimited Text Input** - Generate speech for texts of any length  
🎭 **27+ Voice Options** - US & UK English voices (male & female)  
⚡ **Quality Settings** - Fast, Balanced, High, and Premium quality modes  
🔄 **Smart Chunking** - Automatically splits long texts and concatenates audio seamlessly  
📊 **Progress Tracking** - Real-time progress bar for long text generation  
💾 **Easy Download** - Download generated audio as WAV files  
🎨 **Modern UI** - Clean, responsive interface with voice categories

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Installation

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```
   For first time, wait for the model to download.

## Usage

1. **Select a voice** from the dropdown menu (organized by region and gender)
2. **Choose quality level**:
   - Fast - Quick generation, lower quality
   - Balanced - Good balance of speed and quality (default)
   - High - Better quality, slower generation
   - Premium - Best quality, slowest generation
3. **Enter your text** (no length limit!)
4. **Click "Generate Speech"** and wait for processing
5. **Play, download, or use the audio** as needed


## How It Works

### API Endpoints

- `GET /` - Main web interface
- `POST /generate` - Generate speech from text
- `GET /settings` - Get available voices and settings
- `GET /health` - Health check endpoint

## Configuration

You can modify these settings in `server.js`:

```javascript
// Maximum characters per chunk
const MAX_CHUNK_LENGTH = 500;

// Server port
const PORT = 3000;

// Quality settings (speed multipliers)
const QUALITY_SETTINGS = {
    'fast': { speed: 1.2 },
    'balanced': { speed: 1.0 },
    'high': { speed: 0.8 },
    'premium': { speed: 0.7 }
};
```

## Dependencies

- **express** - Web server framework
- **kokoro-js** - Kokoro TTS library
- **onnxruntime-node** - ONNX runtime for running the model

## License

This project uses the Kokoro-82M model. Please check the model's license for commercial use restrictions.

## Credits

- **Kokoro TTS Model**: [onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
