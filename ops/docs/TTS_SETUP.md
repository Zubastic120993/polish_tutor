# TTS Engine Setup Guide

This application now supports multiple TTS (Text-to-Speech) engines with automatic fallback.

## Architecture

### Online Mode (Best Quality)
1. **GPT-4-TTS** (OpenAI) - Premium quality, natural voices
2. **ElevenLabs** - Excellent quality, multilingual support
3. **gTTS** (Google) - Legacy fallback

### Offline Mode (No Internet Required)
1. **Coqui-TTS** - High-quality offline synthesis
2. **pyttsx3** - Emergency fallback

## Installation

### 1. Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

**Important:** The package name is `coqui-tts`, not `TTS`.

**Note:** Coqui-TTS will download ~1-2GB of models on first use. This is normal.

### 2. Configure API Keys (Optional)

Copy `env.template` to `.env` and add your API keys:

```bash
cp env.template .env
```

Edit `.env` and add your keys:

```env
# For GPT-4-TTS (best quality)
OPENAI_API_KEY=sk-...

# For ElevenLabs (excellent quality)
ELEVENLABS_API_KEY=...
```

**Getting API Keys:**
- **OpenAI:** https://platform.openai.com/api-keys (Costs: ~$15/1M characters)
- **ElevenLabs:** https://elevenlabs.io/ (Free tier: 10k chars/month, then $5-$22/month)

### 3. Choose Mode

Users can select their preferred mode in settings:
- **Online Mode:** Uses GPT-4-TTS → ElevenLabs → gTTS (requires API keys)
- **Offline Mode:** Uses Coqui-TTS → pyttsx3 (no API keys needed)

## Usage

### Check Available Engines

```bash
curl http://localhost:8000/api/audio/engines
```

Response:
```json
{
  "status": "success",
  "message": "Retrieved TTS engine information",
  "data": {
    "online": {
      "gpt4_tts": true,
      "elevenlabs": true,
      "gtts": true
    },
    "offline": {
      "coqui_tts": true,
      "pyttsx3": true
    },
    "mode": "online"
  }
}
```

### Generate Audio

```bash
curl -X POST http://localhost:8000/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Dzień dobry",
    "speed": 1.0,
    "user_id": 1
  }'
```

Response includes which engine was used:
```json
{
  "status": "success",
  "message": "Audio generated with gpt4",
  "data": {
    "audio_url": "/audio_cache/abc123.mp3",
    "cached": false,
    "engine": "gpt4",
    "source": "generated_gpt4"
  }
}
```

## Fallback Chain

### Online Mode Priority:
1. Check pre-recorded audio
2. Check cache
3. Try GPT-4-TTS
4. Try ElevenLabs
5. Try gTTS (legacy)
6. Emergency: pyttsx3

### Offline Mode Priority:
1. Check pre-recorded audio
2. Check cache
3. Try Coqui-TTS
4. Emergency: pyttsx3

## Troubleshooting

### Coqui-TTS Initialization Slow
**Issue:** First startup takes 1-2 minutes

**Solution:** This is normal. Coqui downloads models on first use. Subsequent startups are faster.

### GPT-4-TTS Not Working
**Issue:** API key not detected

**Solutions:**
1. Check `.env` file exists and contains `OPENAI_API_KEY=sk-...`
2. Restart the server
3. Check API key is valid at https://platform.openai.com/api-keys

### Audio Quality Issues
**Issue:** pyttsx3 sounds robotic

**Solution:** Enable online mode or ensure Coqui-TTS installed properly:
```bash
pip install TTS --upgrade
```

### Module Import Errors
**Issue:** `ImportError: No module named 'openai'`

**Solution:** Reinstall dependencies:
```bash
pip install -r requirements.txt
```

## Cost Considerations

### GPT-4-TTS (OpenAI)
- Cost: ~$15 per 1 million characters
- Example: 1000 phrases × 50 chars = 50k chars = $0.75
- Recommended for production

### ElevenLabs
- Free tier: 10,000 characters/month
- Paid: $5/month (30k chars) to $22/month (100k chars)
- Excellent for moderate usage

### Coqui-TTS (Offline)
- **Free forever**
- No API costs
- Requires local compute (CPU/GPU)
- Slower generation (5-15 seconds per phrase)

### pyttsx3 (Emergency)
- **Free forever**
- Instant generation
- Lower quality (robotic voice)

## Recommended Setup

**Development:**
- Use **Offline Mode** with Coqui-TTS
- No API costs
- Good quality for testing

**Production:**
- Use **Online Mode** with GPT-4-TTS
- Best quality for users
- Reasonable costs with caching

**Budget-Conscious:**
- Use **Offline Mode** with Coqui-TTS
- Pre-record important phrases
- Use pyttsx3 as fallback

## Caching

All generated audio is cached automatically:
- Cache key includes: text + voice + speed + engine
- Cached files never expire (manual cleanup available)
- Different engines create separate cache entries

Clear cache:
```bash
curl -X POST http://localhost:8000/api/audio/clear-cache
```

## Voice Selection

### GPT-4-TTS Voices
- `alloy` - Neutral (default)
- `echo` - Male
- `fable` - British accent
- `onyx` - Deep male
- `nova` - Female (good for Polish)
- `shimmer` - Soft female

### ElevenLabs
- Uses multilingual model by default
- Voice ID: `pNInz6obpgDQGcFmaJgB` (Adam - good for Polish)

### Coqui-TTS
- Uses XTTS v2 multilingual model
- Supports Polish language natively

## Performance

| Engine      | Quality | Speed    | Cost      | Internet |
|-------------|---------|----------|-----------|----------|
| GPT-4-TTS   | ★★★★★  | Fast     | Low       | Required |
| ElevenLabs  | ★★★★★  | Fast     | Low-Med   | Required |
| Coqui-TTS   | ★★★★☆  | Slow     | Free      | No       |
| gTTS        | ★★★☆☆  | Fast     | Free      | Required |
| pyttsx3     | ★★☆☆☆  | Instant  | Free      | No       |

## Support

For issues or questions:
1. Check logs: `tail -f logs/app.log`
2. Verify engines: `GET /api/audio/engines`
3. Test generation: `POST /api/audio/generate`

