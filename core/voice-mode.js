/**
 * Voice Mode / TTS Integration
 * Text-to-Speech for voice responses
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

const execAsync = promisify(exec);

class VoiceMode {
  constructor(config = {}) {
    this.config = {
      ttsEngine: config.ttsEngine || process.env.TTS_ENGINE || 'edge-tts', // edge-tts, espeak, say
      voice: config.voice || 'en-US-AriaNeural',
      speed: config.speed || 1.0,
      cacheDir: config.cacheDir || './cache/voice',
      ...config
    };
    
    this.voiceCache = new Map();
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create voice cache directory:', error);
    }
  }

  // Convert text to speech
  async speak(text, options = {}) {
    try {
      logger.info(`Converting to speech: ${text.substring(0, 50)}...`);

      // Check cache first
      const cacheKey = this.getCacheKey(text);
      const cachedFile = this.voiceCache.get(cacheKey);
      
      if (cachedFile && await this.fileExists(cachedFile)) {
        logger.debug('Using cached voice file');
        return cachedFile;
      }

      // Generate new audio
      const audioFile = await this.generateSpeech(text, options);
      
      // Cache it
      this.voiceCache.set(cacheKey, audioFile);
      
      return audioFile;
    } catch (error) {
      logger.error('Voice generation failed:', error);
      throw error;
    }
  }

  // Generate speech audio
  async generateSpeech(text, options = {}) {
    const { 
      voice = this.config.voice, 
      speed = this.config.speed 
    } = options;

    const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
    const outputPath = path.join(this.config.cacheDir, filename);

    switch (this.config.ttsEngine) {
      case 'edge-tts':
        return this.generateEdgeTTS(text, outputPath, voice, speed);
      case 'espeak':
        return this.generateEspeak(text, outputPath);
      case 'say':
        return this.generateSay(text, outputPath);
      default:
        throw new Error(`Unknown TTS engine: ${this.config.ttsEngine}`);
    }
  }

  // Microsoft Edge TTS (free, no API key)
  async generateEdgeTTS(text, outputPath, voice, speed) {
    try {
      // Note: edge-tts must be installed: pip install edge-tts
      const rate = Math.round((speed - 1) * 100);
      const rateArg = rate >= 0 ? `+${rate}%` : `${rate}%`;
      
      await execAsync(`edge-tts --voice "${voice}" --rate="${rateArg}" --text "${text}" --write-media "${outputPath}"`);
      
      logger.info(`Edge TTS generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      // Fallback to espeak if edge-tts not available
      logger.warn('edge-tts failed, falling back to espeak');
      return this.generateEspeak(text, outputPath);
    }
  }

  // eSpeak TTS (local, offline)
  async generateEspeak(text, outputPath) {
    try {
      // Convert to wav first
      const wavPath = outputPath.replace('.mp3', '.wav');
      await execAsync(`espeak "${text}" -w "${wavPath}"`);
      
      // Convert to mp3 if possible
      try {
        await execAsync(`ffmpeg -i "${wavPath}" "${outputPath}" -y`);
        await fs.unlink(wavPath);
        return outputPath;
      } catch (e) {
        // Return wav if ffmpeg not available
        return wavPath;
      }
    } catch (error) {
      logger.error('eSpeak generation failed:', error);
      throw error;
    }
  }

  // macOS say command
  async generateSay(text, outputPath) {
    try {
      const aiffPath = outputPath.replace('.mp3', '.aiff');
      await execAsync(`say "${text}" -o "${aiffPath}"`);
      
      // Convert to mp3
      try {
        await execAsync(`ffmpeg -i "${aiffPath}" "${outputPath}" -y`);
        await fs.unlink(aiffPath);
        return outputPath;
      } catch (e) {
        return aiffPath;
      }
    } catch (error) {
      logger.error('say command failed:', error);
      throw error;
    }
  }

  // Get cache key for text
  getCacheKey(text) {
    // Simple hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `tts_${hash}`;
  }

  // Check if file exists
  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  // Clean old cache files
  async cleanCache(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.config.cacheDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filepath = path.join(this.config.cacheDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtime.getTime() > maxAgeMs) {
          await fs.unlink(filepath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`Cleaned ${cleaned} old voice cache files`);
      }
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  // Format text for better TTS
  formatForTTS(text) {
    return text
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/`[^`]+`/g, 'code')
      .replace(/https?:\/\/[^\s]+/g, 'link')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .substring(0, 3000); // Limit length
  }

  // Get available voices
  async getVoices() {
    return [
      { id: 'en-US-AriaNeural', name: 'Aria (US)', language: 'en-US' },
      { id: 'en-US-GuyNeural', name: 'Guy (US)', language: 'en-US' },
      { id: 'en-GB-LibbyNeural', name: 'Libby (UK)', language: 'en-GB' },
      { id: 'de-DE-KatjaNeural', name: 'Katja (DE)', language: 'de-DE' },
      { id: 'cs-CZ-VlastaNeural', name: 'Vlasta (CZ)', language: 'cs-CZ' }
    ];
  }
}

module.exports = { VoiceMode };
