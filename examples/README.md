# Examples

This directory contains example code demonstrating how to use `@ai-orchestration/core`.

## Quick Examples

### Basic Usage (`basic.ts`)

Simple example showing basic chat and streaming functionality.

**Using npm script:**
```bash
npm run example:basic
```

**Or directly with tsx:**
```bash
npx tsx examples/basic.ts
```

**Required environment variables:**
- `GROQ_API_KEY` (optional)
- `OPENROUTER_API_KEY` (optional)

### Strategies (`strategies.ts`)

Examples of different selection strategies (Priority, Fallback, Weighted, Health-Aware).

**Using npm script:**
```bash
npm run example:strategies
```

**Or directly with tsx:**
```bash
npx tsx examples/strategies.ts
```

**Required environment variables:**
- `GROQ_API_KEY` (optional)
- `OPENROUTER_API_KEY` (optional)
- `GEMINI_API_KEY` (optional)

### Language Forcing (`language.ts`)

Demonstrates how to force responses in specific languages using `responseLanguage`.

**Using npm script:**
```bash
npm run example:language
```

**Or directly with tsx:**
```bash
npx tsx examples/language.ts
```

**Required environment variables:**
- `GROQ_API_KEY` (at least one provider required)

### Images (`images.ts`)

Demonstrates how to send images along with text messages to AI providers that support multimodal input.

**Using npm script:**
```bash
npm run example:images
```

**Or directly with tsx:**
```bash
npx tsx examples/images.ts
```

**Required environment variables:**
- `GROQ_API_KEY` (requires Llama 3.2 Vision models: `llama-3.2-11b-vision-preview`)
- `OPENROUTER_API_KEY` (use vision-capable models like `openai/gpt-4o`)
- `GEMINI_API_KEY` (use `gemini-pro-vision`, `gemini-1.5-pro`, or `gemini-2.0-flash`)

**Setup:**
```bash
# Export environment variables
export GROQ_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"
export GEMINI_API_KEY="your-key"

# Or create .env file
echo "GROQ_API_KEY=your-key" > .env
echo "OPENROUTER_API_KEY=your-key" >> .env
echo "GEMINI_API_KEY=your-key" >> .env
```

**Note:** At least one provider with vision support is required. See `IMAGES_SETUP.md` for detailed setup instructions.

**⚠️ Important:** 
- Cerebras does NOT support images (text-only models)
- Make sure to use vision-capable models (see examples above)

### Image Generation (`image-generation.ts`)

Demonstrates how to generate images from text prompts using AI providers that support image generation.

**Using npm script:**
```bash
npm run example:image-generation
```

**Or directly with tsx:**
```bash
npx tsx examples/image-generation.ts
```

**Required environment variables:**
- `OPENROUTER_API_KEY` (required for image generation)

**Setup:**
```bash
# Export environment variable
export OPENROUTER_API_KEY="your-key"

# Or create .env file
echo "OPENROUTER_API_KEY=your-key" > .env
```

**Supported Models:**
- `openai/dall-e-3` (recommended)
- `stability-ai/stable-diffusion-xl`
- `black-forest-labs/flux-pro`

**Features demonstrated:**
- Basic image generation
- High quality images
- Multiple image generation
- Base64 response format
- Different aspect ratios

### Metrics and Analytics (`metrics.ts`)

Shows how to track provider usage, costs, and strategy effectiveness.

**Using npm script:**
```bash
npm run example:metrics
```

**Or directly with tsx:**
```bash
npx tsx examples/metrics.ts
```

**Required environment variables:**
- `GROQ_API_KEY` (optional)
- `OPENROUTER_API_KEY` (optional)

**Features demonstrated:**
- Real-time metrics tracking
- Provider usage statistics
- Cost calculation (requires `costPerToken` in provider metadata)
- Strategy effectiveness metrics
- Request history

## Testing Examples

### Local Testing (`test-local.ts`)

Test with real API providers. Requires API keys in environment variables.

**Using npm script:**
```bash
npm run test:local
```

**Or directly with tsx:**
```bash
npx tsx examples/test-local.ts
```

**Setup environment variables:**
```bash
# Option 1: Export in terminal
export GROQ_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"
export GEMINI_API_KEY="your-key"

# Option 2: Create .env file in project root
echo "GROQ_API_KEY=your-key" > .env
echo "OPENROUTER_API_KEY=your-key" >> .env
echo "GEMINI_API_KEY=your-key" >> .env
```

**Note:** At least one API key is required. The script will show which providers are available.

### Mock Testing (`test-mock.ts`)

Test without API keys using mock providers. Useful for testing strategies and orchestrator logic.

**Using npm script:**
```bash
npm run test:mock
```

**Or directly with tsx:**
```bash
npx tsx examples/test-mock.ts
```

**No API keys required!** This example uses mock providers to test the framework logic.

## Interactive Chat App (`chat-app/`)

A full-featured interactive chat application demonstrating:

- Multiple providers (Groq, OpenRouter, Gemini, Cerebras)
- Strategy switching at runtime
- Health checks
- Advanced configuration (circuit breaker, retries, timeouts)
- Provider management

### Setup

1. Navigate to the chat-app directory:
   ```bash
   cd examples/chat-app
   ```

2. Link the package (if testing locally):
   ```bash
   npm link @ai-orchestration/core
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file with your API keys:
   ```bash
   GROQ_API_KEY=your-groq-key
   OPENROUTER_API_KEY=your-openrouter-key
   GEMINI_API_KEY=your-gemini-key
   CEREBRAS_API_KEY=your-cerebras-key
   ```

5. Run the app:
   ```bash
   npm start
   ```

### Commands

- `/help` - Show available commands
- `/strategy <type>` - Change strategy (round-robin, priority, fallback)
- `/providers` - List configured providers
- `/health` - Check provider health status
- `/clear` - Clear conversation history
- `/exit` or `/quit` - Exit the application

### Configuration

Edit `config.json` to customize:

- Provider configurations
- Default strategy
- Chat options (temperature, maxTokens, etc.)
- Orchestrator settings (retries, timeouts, circuit breaker, health checks)

## Example Configuration (`config.example.json`)

Template configuration file showing all available options.

## Environment Variables

All examples that use real providers require API keys:

- `GROQ_API_KEY` - Groq API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `GEMINI_API_KEY` - Google Gemini API key
- `CEREBRAS_API_KEY` - Cerebras API key

You can set these as environment variables or use a `.env` file (chat-app uses `dotenv`).

