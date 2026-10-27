import Groq from 'groq-sdk';

class AiService {
  private groq: Groq | null;
  private model: string;
  private fallbackModels: string[] = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    if (!apiKey) {
      console.warn('GROQ_API_KEY is not set in environment variables. AI features will be disabled.');
      this.groq = null;
      return;
    }
    this.groq = new Groq({
      apiKey: apiKey,
    });
    console.log(`Groq AI service initialized successfully with model: ${this.model}`);
  }

  /**
   * Helper to safely extract and parse JSON from LLM responses,
   * handling markdown code blocks, outer conversational text, or formatting issues.
   */
  private extractAndParseJSON(text: string): any {
    if (!text || typeof text !== 'string') {
      throw new Error('Empty response received from AI model');
    }

    // 1. Direct parse attempt
    try {
      return JSON.parse(text);
    } catch (_) {
      // Continue to cleanup strategies
    }

    let cleaned = text.trim();

    // 2. Strip markdown code fences if present (```json ... ``` or ``` ...)
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch (_) {
        // Continue
      }
    }

    // 3. Extract JSON object or array bounds
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    let candidate = '';
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) && lastBrace > firstBrace) {
      candidate = cleaned.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket > firstBracket) {
      candidate = cleaned.substring(firstBracket, lastBracket + 1);
    }

    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Fix potential trailing commas before closing braces/brackets
        const fixed = candidate.replace(/,\s*([}\]])/g, '$1');
        try {
          return JSON.parse(fixed);
        } catch (_) {
          // Continue
        }
      }
    }

    throw new Error(`Failed to parse JSON from AI response: ${text.slice(0, 200)}`);
  }

  /**
   * Generates a high-quality fallback roadmap if the AI service is unreachable or errors.
   */
  private createFallbackRoadmap(topic: string): any {
    return {
      topic: topic,
      description: `A comprehensive, step-by-step learning journey to master ${topic} from fundamentals to production-ready skills.`,
      estimatedTotalTime: '3-4 months',
      phases: [
        {
          name: 'Phase 1: Foundations & Core Concepts',
          level: 'Beginner',
          duration: '3-4 weeks',
          topics: [
            `Introduction and Core Principles of ${topic}`,
            'Environment Setup, Tooling & Ecosystem Overview',
            'Key Syntax, Vocabulary & Basic Architecture',
            'Hands-on Hello World & Fundamental Building Blocks'
          ],
          projects: [
            `Starter project: Build a basic working application or prototype using ${topic}`
          ]
        },
        {
          name: 'Phase 2: Intermediate Techniques & Practical Application',
          level: 'Intermediate',
          duration: '4 weeks',
          topics: [
            'State Management, Data Flow & Best Practices',
            'Modular Architecture, Design Patterns & Component Organization',
            'API Integration, Asynchronous Programming & Data Handling',
            'Debugging, Error Handling & Logging Strategies'
          ],
          projects: [
            `Intermediate project: Full CRUD application with API integration and state management`
          ]
        },
        {
          name: 'Phase 3: Advanced Patterns & Optimization',
          level: 'Advanced',
          duration: '3-4 weeks',
          topics: [
            'Performance Profiling, Memory Management & Optimization',
            'Security Best Practices, Authentication & Authorization',
            'Automated Testing: Unit, Integration & End-to-End Tests',
            'Architectural Scaling & Design Considerations'
          ],
          projects: [
            `Advanced project: High-performance, secure feature module with automated test coverage`
          ]
        },
        {
          name: 'Phase 4: Capstone & Production Deployment',
          level: 'Advanced',
          duration: '3-4 weeks',
          topics: [
            'CI/CD Pipelines, Containerization & Cloud Deployment',
            'Monitoring, Observability & Analytics',
            'Code Review, Documentation & Open Source Collaboration',
            'Portfolio Presentation & Real-world Project Polish'
          ],
          projects: [
            `Production Capstone: Fully deployed, documented, and tested real-world application`
          ]
        }
      ]
    };
  }

  /**
   * Reusable function to generate AI response with automatic model fallbacks
   */
  async generateAIResponse(
    prompt: string,
    systemMessage?: string,
    responseFormat?: { type: 'json_object' }
  ): Promise<string> {
    if (!this.groq) {
      if (responseFormat?.type === 'json_object') {
        throw new Error('Groq AI service is not initialized. Please verify your GROQ_API_KEY.');
      }
      return 'AI is temporarily unavailable, please try again.';
    }

    const messages: any[] = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    const modelsToTry = [this.model, ...this.fallbackModels.filter(m => m !== this.model)];
    let lastError: any = null;

    for (const modelToUse of modelsToTry) {
      try {
        const completion = await this.groq.chat.completions.create({
          messages: messages,
          model: modelToUse,
          response_format: responseFormat,
          temperature: 0.7,
          max_tokens: 4096,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          if (this.model !== modelToUse) {
            console.log(`Switched default Groq model from ${this.model} to working model: ${modelToUse}`);
            this.model = modelToUse;
          }
          return content;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Groq API Error with model ${modelToUse}:`, error.message || error);
        if (error.status === 404 || error.status === 400 || error.code === 'model_not_found') {
          continue;
        }
        break;
      }
    }

    if (responseFormat?.type === 'json_object') {
      throw new Error(lastError?.message || 'AI service failed to generate a JSON response.');
    }
    return 'AI is temporarily unavailable, please try again.';
  }

  // --- GeminiService Compatibility Methods ---

  async generateDocumentSummary(documentText: string): Promise<string> {
    const systemMessage = 'You are a helpful assistant that summarizes documents.';
    const prompt = `Please provide a comprehensive summary of the following document. 
Focus on the main points, key concepts, and important information.
Keep the summary concise but informative (2-3 paragraphs).

Document content:
${documentText}`;

    return this.generateAIResponse(prompt, systemMessage);
  }

  async answerQuestion(question: string, documentText: string, chatHistory: any[] = []): Promise<{
    answer: string;
    sources: string[];
    confidence: number;
  }> {
    const historyContext = chatHistory.length > 0 
      ? `\n\nPrevious conversation context:\n${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const systemMessage = 'You are an intelligent document analysis assistant. Answer the user\'s question based on the provided document content.';
    const prompt = `Document content:
${documentText}

${historyContext}

User question: ${question}

Please provide:
1. A direct, accurate answer based on the document content
2. Quote relevant sections from the document to support your answer
3. If the answer is not found in the document, clearly state this
4. Be concise but comprehensive

Respond in a natural, conversational way. Do not use JSON format.`;

    const answer = await this.generateAIResponse(prompt, systemMessage);
    return {
      answer,
      sources: [],
      confidence: 0.8
    };
  }

  async extractKeyPoints(documentText: string): Promise<string[]> {
    const systemMessage = 'Extract the key points and main topics from the document. Return them as a JSON array of strings.';
    const prompt = `Document content:
${documentText}`;

    try {
      const response = await this.generateAIResponse(prompt, systemMessage, { type: 'json_object' });
      const parsed = this.extractAndParseJSON(response);
      return Array.isArray(parsed) ? parsed : (parsed.keyPoints || parsed.points || [response]);
    } catch (e) {
      console.warn('Failed to parse key points JSON, falling back:', e);
      return ['Key point extraction unavailable at this time.'];
    }
  }

  async generateQuestions(documentText: string): Promise<string[]> {
    const systemMessage = 'Generate 5 relevant questions about the document. Return them as a JSON array of strings.';
    const prompt = `Document content:
${documentText}`;

    try {
      const response = await this.generateAIResponse(prompt, systemMessage, { type: 'json_object' });
      const parsed = this.extractAndParseJSON(response);
      return Array.isArray(parsed) ? parsed : (parsed.questions || [response]);
    } catch (e) {
      console.warn('Failed to parse questions JSON, falling back:', e);
      return ['What are the main concepts discussed in this document?'];
    }
  }

  async generateRoadmap(topic: string): Promise<any> {
    const systemMessage = 'You are an expert career and learning path advisor. Generate a detailed learning roadmap in JSON format.';
    const prompt = `Create a detailed learning roadmap for the topic: "${topic}".
Your response MUST be a valid JSON object with the following structure:
{
  "topic": "${topic}",
  "description": "A short overview of what will be learned.",
  "estimatedTotalTime": "e.g., 3 months",
  "phases": [
    {
      "name": "Phase 1: Foundations",
      "level": "Beginner",
      "duration": "e.g., 4 weeks",
      "topics": ["Concept 1", "Concept 2"],
      "projects": ["Project 1 description"]
    }
  ]
}`;

    try {
      const response = await this.generateAIResponse(prompt, systemMessage, { type: 'json_object' });
      const parsed = this.extractAndParseJSON(response);
      const root = parsed.roadmap || parsed.data || parsed;

      if (Array.isArray(root.phases) && root.phases.length > 0) {
        return {
          topic: root.topic || topic,
          description: root.description || `Comprehensive learning roadmap for ${topic}.`,
          estimatedTotalTime: root.estimatedTotalTime || '3 months',
          phases: root.phases.map((phase: any, idx: number) => ({
            name: phase.name || `Phase ${idx + 1}: Foundations`,
            level: phase.level || (idx === 0 ? 'Beginner' : idx === 1 ? 'Intermediate' : 'Advanced'),
            duration: phase.duration || '4 weeks',
            topics: Array.isArray(phase.topics)
              ? phase.topics.map((t: any) => typeof t === 'string' ? t : (t.title || t.name || String(t)))
              : ['Core Fundamentals', 'Practical Basics'],
            projects: Array.isArray(phase.projects)
              ? phase.projects.map((p: any) => typeof p === 'string' ? p : (p.title || p.name || String(p)))
              : [`Hands-on project for ${phase.name || 'Phase ' + (idx + 1)}`]
          }))
        };
      }
    } catch (e: any) {
      console.error('Failed to generate AI roadmap, falling back to structured roadmap:', e.message || e);
    }

    // High quality fallback roadmap if AI generation or parsing failed
    return this.createFallbackRoadmap(topic);
  }

  async tutorChat(
    userMessage: string,
    topic: string,
    history: { role: string; content: string }[]
  ): Promise<string> {
    const historyContext = history.length > 0
      ? `\n\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n\n')}`
      : '';

    const systemMessage = `You are an expert, friendly AI tutor specializing in "${topic}". Your teaching principles:
1. Use simple, clear language that a beginner can understand.
2. Always give real-world examples or code snippets (use markdown code blocks where relevant).
3. After explaining, add a short exercise or quiz question to reinforce learning.
4. Be encouraging, warm, and patient.
5. Use markdown formatting: bold, bullet points, numbered lists, code blocks.
6. Build on the prior conversation to avoid repeating yourself.

Always end your response with one of these (clearly labeled):
- "Try this:" followed by a small exercise
- "Think about it:" followed by a reflection question`;

    const prompt = `${historyContext}

Student: ${userMessage}
Tutor:`;

    return this.generateAIResponse(prompt, systemMessage);
  }

  async extractDocumentInsights(documentText: string): Promise<{ summary: string; importantPoints: string[]; keywords: string[] }> {
    const systemMessage = 'Analyze the document and extract key insights. Return them as a JSON object.';
    const prompt = `Analyze the following document and extract key insights.
Your response MUST be a valid JSON object strictly matching this schema exactly:
{
  "summary": "A concise 2-3 paragraph overview of the entire document.",
  "importantPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Document content:
${documentText.substring(0, 30000)}`;

    try {
      const response = await this.generateAIResponse(prompt, systemMessage, { type: 'json_object' });
      const insights = this.extractAndParseJSON(response);
      return {
        summary: insights.summary || 'Summary unavailable.',
        importantPoints: Array.isArray(insights.importantPoints) ? insights.importantPoints : [],
        keywords: Array.isArray(insights.keywords) ? insights.keywords : []
      };
    } catch (e) {
      console.warn('Failed to extract insights, returning fallbacks:', e);
      return {
        summary: 'Document insights are temporarily unavailable.',
        importantPoints: [],
        keywords: []
      };
    }
  }

  async generateQuiz(topic: string, previousQuestions: string[] = [], difficulty: string = 'Medium', tutorContext?: string): Promise<any> {
    const previousContext = previousQuestions.length > 0 
      ? `Here are the questions that have already been asked. DO NOT generate these again:\n${previousQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}\n`
      : '';
      
    let difficultyContext = '';
    if (difficulty === 'Easy') {
      difficultyContext = `Make the questions focus on basic, foundational conceptual definitions that beginners would quickly recognize. Maintain an Easy difficulty.`;
    } else if (difficulty === 'Hard') {
      difficultyContext = `Make the questions tricky, highly analytical, and heavily focused on complex scenario-based paradigms. Maintain a Hard difficulty.`;
    } else {
      difficultyContext = `Maintain a consistent, balanced Medium difficulty level across all questions.`;
    }

    const tutorChatContext = tutorContext && tutorContext.length > 0
      ? `\nThe user has just learned about this topic through the following conversation with an AI Tutor:\n\n---\n${tutorContext.substring(0, 30000)}\n---\n\nYour generated quiz MUST focus extensively on the specific concepts, ideas, and facts that were actually discussed in the above conversation.`
      : '';

    const systemMessage = 'You are a quiz generator. Generate a 10-question multiple choice quiz in JSON format.';
    const prompt = `Create a 10-question multiple choice quiz about the topic: "${topic}".
${difficultyContext}
${tutorChatContext}
${previousContext}
Your response MUST be a valid JSON object strictly matching this schema exactly:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why Option A is correct"
    }
  ]
}
Ensure exactly 10 questions are generated.`;

    try {
      const response = await this.generateAIResponse(prompt, systemMessage, { type: 'json_object' });
      return this.extractAndParseJSON(response);
    } catch (e) {
      console.error('Failed to generate quiz:', e);
      throw new Error('Failed to generate quiz. Please try again.');
    }
  }
}

export default new AiService();
