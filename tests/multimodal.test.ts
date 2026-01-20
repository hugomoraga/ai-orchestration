/**
 * Tests for multimodal content (text + images)
 * These tests verify multimodal input handling without requiring API keys
 * 
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert';
import type {
  ChatMessage,
  ContentPart,
  ImageContent,
  TextContent,
} from '../src/index.js';

test('ChatMessage should accept string content', () => {
  const message: ChatMessage = {
    role: 'user',
    content: 'Hello, world!',
  };

  assert.strictEqual(typeof message.content, 'string');
  assert.strictEqual(message.content, 'Hello, world!');
});

test('ChatMessage should accept ContentPart array for multimodal', () => {
  const textPart: TextContent = {
    type: 'text',
    text: 'What is in this image?',
  };

  const imagePart: ImageContent = {
    type: 'image',
    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    mimeType: 'image/jpeg',
  };

  const message: ChatMessage = {
    role: 'user',
    content: [textPart, imagePart],
  };

  assert.ok(Array.isArray(message.content));
  assert.strictEqual(message.content.length, 2);
  assert.strictEqual(message.content[0].type, 'text');
  assert.strictEqual(message.content[1].type, 'image');
});

test('ImageContent should accept base64 string', () => {
  const imageContent: ImageContent = {
    type: 'image',
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
  };

  assert.strictEqual(imageContent.type, 'image');
  assert.ok(typeof imageContent.image === 'string');
  assert.strictEqual(imageContent.mimeType, 'image/png');
});

test('ImageContent should accept data URI format', () => {
  const imageContent: ImageContent = {
    type: 'image',
    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  };

  assert.strictEqual(imageContent.type, 'image');
  assert.ok(imageContent.image.startsWith('data:'));
});

test('ImageContent should accept URL', () => {
  const imageContent: ImageContent = {
    type: 'image',
    image: 'https://example.com/image.jpg',
  };

  assert.strictEqual(imageContent.type, 'image');
  assert.ok(imageContent.image.startsWith('http'));
});

test('TextContent should have correct structure', () => {
  const textContent: TextContent = {
    type: 'text',
    text: 'This is a text message',
  };

  assert.strictEqual(textContent.type, 'text');
  assert.strictEqual(typeof textContent.text, 'string');
});

test('ContentPart should be union type of TextContent and ImageContent', () => {
  const textPart: ContentPart = {
    type: 'text',
    text: 'Hello',
  };

  const imagePart: ContentPart = {
    type: 'image',
    image: 'base64string',
  };

  assert.strictEqual(textPart.type, 'text');
  assert.strictEqual(imagePart.type, 'image');
});

test('Multimodal message should support multiple text and image parts', () => {
  const parts: ContentPart[] = [
    { type: 'text', text: 'First text' },
    { type: 'image', image: 'image1' },
    { type: 'text', text: 'Second text' },
    { type: 'image', image: 'image2' },
  ];

  const message: ChatMessage = {
    role: 'user',
    content: parts,
  };

  assert.ok(Array.isArray(message.content));
  assert.strictEqual(message.content.length, 4);
});

