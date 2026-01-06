# Chat App Example

A simple chat application to test `@ai-orchestration/core` using npm link.

## Quick Setup

### 1. Link the Package

```bash
# In the ia-orchestration directory (from project root)
cd /path/to/ia-orchestration
npm run link
```

### 2. Setup This Project

```bash
# In this directory
cd examples/chat-app
npm install
npm link @ai-orchestration/core
```

### 3. Configure Environment Variables

Create a `.env` file from the example:

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your real API keys
# GROQ_API_KEY=your-real-key-here
# OPENROUTER_API_KEY=your-real-key-here
# GEMINI_API_KEY=your-real-key-here
# CEREBRAS_API_KEY=your-real-key-here
```

**Important**: The `.env` file is in `.gitignore` and will not be committed to the repository.

**Note**: You only need to configure at least ONE API key for it to work.

### 4. (Optional) Customize Configuration

You can edit `config.json` to:
- Change default models
- Change initial strategy
- Adjust chat options (temperature, maxTokens)
- Add or remove providers

### 5. Run

```bash
npm start
```

## Usage

The application allows you to:
- Chat with multiple AI providers
- Change strategy at runtime
- See which provider is being used
- View usage statistics

## Available Commands

- `/help` - Show help
- `/strategy <type>` - Change strategy (round-robin, priority, fallback)
- `/providers` - List available providers
- `/health` - Check provider health
- `/clear` - Clear conversation history
- `/exit` or `/quit` - Exit the application

## Example Session

```
🚀 Chat App - Example with @ai-orchestration/core

💡 Type /help to see available commands

🔧 Creating orchestrator...
✅ Orchestrator created with 2 provider(s)

💬 You: Hello!
🤔 Thinking... 
✅ Response (1234ms):

   Hello! How can I help you today?

💬 You: /providers
📋 Available providers:
  1. groq-1 (Groq)
  2. openrouter-1 (OpenRouter)

💬 You: /exit
👋 Goodbye!
```

## Verification

To verify everything is configured correctly:

```bash
# Verify that the link works
npm list @ai-orchestration/core

# Should show:
# chat-app-example@1.0.0
# └── @ai-orchestration/core@0.1.0 -> /path/to/ia-orchestration
```

## Troubleshooting

### Error: "Cannot find module '@ai-orchestration/core'"

```bash
# Verify link exists
npm list @ai-orchestration/core

# If it doesn't exist, re-link
npm link @ai-orchestration/core
```

### Error: "No providers configured"

- Verify that `.env` exists in `examples/chat-app/`
- Verify it has at least one API key configured
- Verify there are no spaces around `=` in `.env`
- Verify values are not the example ones (`your-*-api-key-here`)

### Error: "Module not found" or TypeScript errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Changes in package not reflected

```bash
# In the ia-orchestration directory (root)
npm run build

# Changes should be reflected automatically
```
