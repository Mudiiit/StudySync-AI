import { Injectable } from '@nestjs/common';
import { AiEngine } from './ai.engine';
import { Observable } from 'rxjs';

@Injectable()
export class AiService {
  constructor(private readonly aiEngine: AiEngine) {}

  async summarize(content: string): Promise<string> {
    const system =
      'You are an elite academic tutor. Summarize the following text in a concise layout with bullet points.';
    return this.aiEngine.generate('SYSTEM', 'NOTES_SUMMARY', content, system);
  }

  streamSummarize(content: string): Observable<string> {
    const system =
      'You are an elite academic tutor. Summarize the following text in a concise layout with bullet points.';
    return this.aiEngine.stream(content, system);
  }

  async rewrite(content: string, tone = 'professional'): Promise<string> {
    const system = `You are an elite academic advisor. Rewrite the following text to sound highly ${tone}. Preserve all scientific facts and formulas.`;
    return this.aiEngine.generate('SYSTEM', 'REWRITE', content, system);
  }

  streamRewrite(content: string, tone = 'professional'): Observable<string> {
    const system = `You are an elite academic advisor. Rewrite the following text to sound highly ${tone}. Preserve all scientific facts and formulas.`;
    return this.aiEngine.stream(content, system);
  }

  async fixGrammar(content: string): Promise<string> {
    const system =
      'You are a meticulous editor. Correct any grammar, spelling, and punctuation errors in the provided text. Return ONLY the corrected text without explanations or headers.';
    return this.aiEngine.generate('SYSTEM', 'GRAMMAR_FIX', content, system);
  }

  async explain(text: string): Promise<string> {
    const system =
      'You are a patient and clear academic professor. Explain the following term or text in a simple, easy-to-understand manner with clear examples where applicable.';
    return this.aiEngine.generate('SYSTEM', 'AI_TUTOR', text, system);
  }

  streamExplain(text: string): Observable<string> {
    const system =
      'You are a patient and clear academic professor. Explain the following term or text in a simple, easy-to-understand manner with clear examples where applicable.';
    return this.aiEngine.stream(text, system);
  }

  async translate(content: string, language: string): Promise<string> {
    const system = `You are an expert translator. Translate the following text into ${language}. Preserve the formatting, markdown tags, and formulas.`;
    return this.aiEngine.generate('SYSTEM', 'TRANSLATION', content, system);
  }

  async extractKeyPoints(content: string): Promise<string> {
    const system =
      'You are an expert analyst. Extract the primary concepts, definitions, and key takeaways from the following content as a list of key points.';
    return this.aiEngine.generate('SYSTEM', 'EXTRACT_POINTS', content, system);
  }

  async improveWriting(content: string): Promise<string> {
    const system =
      'You are a professional editor. Enhance the flow, vocabulary, readability, and clarity of the following text while keeping its core factual meaning and markdown formatting intact.';
    return this.aiEngine.generate('SYSTEM', 'NOTES_IMPROVE', content, system);
  }

  async expandText(content: string): Promise<string> {
    const system =
      'You are a creative and detailed academic writer. Expand on the provided text, adding more depth, explanations, context, and examples where appropriate, without fluff.';
    return this.aiEngine.generate('SYSTEM', 'NOTES_EXPAND', content, system);
  }

  async shortenText(content: string): Promise<string> {
    const system =
      'You are a master summarizer. Shorten the following text to be brief and dense, removing redundant sentences while keeping key ideas and facts.';
    return this.aiEngine.generate('SYSTEM', 'NOTES_SHORTEN', content, system);
  }

  async convertToBullets(content: string): Promise<string> {
    const system =
      'You are a structured note taker. Convert the following text into a clear, nested bullet-point list summarizing the core assertions.';
    return this.aiEngine.generate('SYSTEM', 'NOTES_BULLETS', content, system);
  }

  async generateStudyNotes(content: string): Promise<string> {
    const system =
      'You are an elite academic tutor. Analyze the following content and compile comprehensive, structured academic study notes containing key concepts, definitions, detailed explanations, and summary tables where helpful.';
    return this.aiEngine.generate('SYSTEM', 'STUDY_NOTES', content, system);
  }

  async generateRevisionSheet(content: string): Promise<string> {
    const system =
      'You are an exam preparation expert. Create a high-impact revision sheet for the provided content, including a quick overview, key takeaways, list of definitions, and a Q&A section containing 3 to 5 potential exam questions and answers.';
    return this.aiEngine.generate('SYSTEM', 'REVISION_SHEET', content, system);
  }

  async taskBreakdown(title: string, description: string): Promise<string[]> {
    const prompt = `Task Title: ${title}\nDescription: ${description}`;
    const system =
      'You are an expert project manager. Break down the following task into a list of 3 to 6 actionable checklist items. Return ONLY a valid JSON string array of checklist items, e.g. ["Research topics", "Write draft summary", "Review feedback"]. Do not wrap in markdown backticks, only return the raw JSON array.';

    try {
      const result = await this.aiEngine.generate(
        'SYSTEM',
        'TASK_BREAKDOWN',
        prompt,
        system,
        { responseMimeType: 'application/json' },
      );
      const cleaned = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e) {
      return [
        'Define objectives',
        'Execute main steps',
        'Verify and test outcomes',
      ];
    }
  }

  async processStudyAction(content: string, action: string): Promise<string> {
    const config = this.getStudyActionPrompt(action);
    if (!config) {
      throw new Error(`Unsupported study action: ${action}`);
    }
    return this.aiEngine.generate(
      'SYSTEM',
      config.modelTag,
      content,
      config.systemPrompt,
    );
  }

  private getStudyActionPrompt(
    action: string,
  ): { systemPrompt: string; modelTag: string } | null {
    const MARKDOWN_GUIDELINE = `

Format the response using clean Markdown:
- Use clear visual headings (H2 or H3) for sections.
- Use lists and bullet points for structured information.
- Use Markdown tables where appropriate to compare or organize data.
- Use fenced code blocks with language specification for code, logic, or formulas.
- Highlight key terms by wrapping them in **bold** or *italics*.
- NEVER return raw unformatted paragraphs only. Keep the layout engaging, readable, and highly professional.
`;

    let systemPrompt = '';
    let modelTag = '';

    switch (action) {
      case 'executive_summary':
        systemPrompt =
          'You are an elite academic tutor. Provide an executive summary of the following content. Offer a quick, high-level overview of the main ideas that a student can read in 2-3 minutes. Use headings, key points, and a summary table if appropriate.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_EXEC_SUMMARY';
        break;
      case 'detailed_summary':
        systemPrompt =
          'You are a detailed academic researcher. Provide a comprehensive, detailed study summary of the following text. Cover all key concepts, sub-concepts, arguments, and supporting details in depth.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_DETAILED_SUMMARY';
        break;
      case 'exam_revision':
        systemPrompt =
          'You are an exam preparation tutor. Compile structured exam revision notes from the following text. Highlight highly testable concepts, core formulas, key terms, and summary tables to make studying highly efficient.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_EXAM_REVISION';
        break;
      case 'last_minute_revision':
        systemPrompt =
          'You are an academic coach. Create a hyper-condensed last-minute revision sheet. Focus only on the absolute essentials, core rules, definitions, and formulas. Make it extremely dense and easy to read at a glance.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_LAST_MIN_REVISION';
        break;
      case 'key_concepts':
        systemPrompt =
          'You are a senior university professor. Extract the core conceptual pillars, theoretical foundations, and key ideas from the following text. Explain how they relate to each other.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_KEY_CONCEPTS';
        break;
      case 'definitions':
        systemPrompt =
          'You are an academic lexicographer. Extract all important terminology, jargon, and keywords from the text and create an organized glossary of definitions. Highlight terms clearly.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_DEFINITIONS';
        break;
      case 'learning_objectives':
        systemPrompt =
          "You are an instructional designer. Define clear learning objectives for the following content. Use Bloom's Taxonomy (e.g., 'Understand...', 'Be able to explain...', 'Analyze...'). Include a self-assessment checklist." +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_LEARNING_OBJECTIVES';
        break;
      case 'viva_questions':
        systemPrompt =
          'You are an external oral examiner. Generate a list of potential Viva voce (oral examination) questions and concise, clear answers based on the following text. Focus on probing comprehension and critical thinking.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_VIVA_QUESTIONS';
        break;
      case 'interview_questions':
        systemPrompt =
          'You are a technical interviewer at a top company. Generate professional interview questions with deep, comprehensive answers based on the concepts in the text. Highlight trade-offs and best practices.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_INTERVIEW_QUESTIONS';
        break;
      case 'practice_questions':
        systemPrompt =
          'You are an academic examiner. Generate practice questions divided into Easy, Medium, and Hard difficulties based on the following text. Provide detailed step-by-step solutions for each question.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_PRACTICE_QUESTIONS';
        break;
      case 'student_mistakes':
        systemPrompt =
          'You are a patient university teaching assistant. Identify common student mistakes, misconceptions, and pitfalls associated with the concepts in the following text. Explain the correct understanding clearly with examples.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_STUDENT_MISTAKES';
        break;
      case 'mnemonics':
        systemPrompt =
          `You are a world-class cognitive learning coach and memory expert. Your goal is to design highly memorable, creative, and original memory aids and mnemonics for the provided content. 

Do NOT summarize the content, do NOT repeat textbook definitions, and do NOT explain concepts in long paragraphs. Focus purely on memory tricks that help students recall the information during an exam.

DIFFERENTIATED TECHNIQUES:
Depending on the subject matter, select and generate 3 to 5 different techniques from this list:
1. Acronyms: Memorable word/phrase representing letters of a sequence (e.g., "Please Do Not Throw Sausage Pizza Away" for OSI layers).
2. First-Letter Mnemonics: A funny or vivid phrase where each word starts with the first letter of key concepts (e.g., "My Hungry Neighbor Cooks" for Deadlock Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait).
3. Funny Analogies: Memorable real-world comparisons (e.g., "A Process is like a customer waiting in line at a restaurant").
4. Story-Based Mnemonics: A short, bizarre, or humorous story linking multiple concepts.
5. Visual Memory Hooks: Describe a vivid mental image (e.g., "Imagine RAM as a whiteboard that is constantly erased and rewritten").
6. Exam Tricks: Quick patterns, tricks, or shortcuts students can recall under pressure.

SUBJECT-SPECIFIC RULES:
- For Technical/Computer Science (OS, DBMS, CN, DSA): Use actual technical terminology within the memory trick.
- For Biology/Medicine: Prioritize Acronyms.
- For History: Prioritize timeline-based short stories.
- For Mathematics/Engineering: Prioritize Visual patterns and mental shapes.

OUTPUT FORMAT:
Generate 3 to 5 distinct memory techniques. Format each one exactly as follows:

# Memory Tricks

## [Technique Title (e.g., Acronym, Funny Analogy, Story, Visual Memory, etc.)]
[Mnemonic/Trick details here - keep it short and highly memorable]

**Why it works:**
[1-2 sentences explaining why this makes the concept stick in the brain]

---

## [Next Technique Title]
...

**Why it works:**
...

---

Quality Guidelines:
- If the concept cannot reasonably support a memory trick, explicitly state that instead of inventing a poor one.
- Use humorous, bizarre, or vivid imagery to maximize retention.
` + MARKDOWN_GUIDELINE;
        modelTag = 'AI_MNEMONICS';
        break;
      case 'explain_beginner':
        systemPrompt =
          'You are a science communicator. Explain the concepts in the following text like I am a beginner (ELI5). Use clear, everyday analogies, simple language, and avoid advanced technical jargon.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_EXPLAIN_BEGINNER';
        break;
      case 'explain_professor':
        systemPrompt =
          'You are a distinguished university professor. Explain the concepts in the following text with full academic rigor, using precise technical terminology, formal tone, and mathematical/scientific completeness.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_EXPLAIN_PROFESSOR';
        break;
      case 'related_topics':
        systemPrompt =
          'You are an academic advisor. Map out related topics, prerequisite subjects, and advanced fields of study connected to the following text. Explain how they branch out.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_RELATED_TOPICS';
        break;
      case 'study_time':
        systemPrompt =
          'You are a study planner. Estimate the study time required for an average student to master this content. Break down the time by sections and provide a structured, step-by-step study roadmap.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_STUDY_TIME';
        break;
      case 'exam_topics':
        systemPrompt =
          'You are an academic test designer. Predict the most important exam topics from the following content. Estimate their weightage, likelihood of appearing, and provide focus areas for student revision.' +
          MARKDOWN_GUIDELINE;
        modelTag = 'AI_EXAM_TOPICS';
        break;
      default:
        return null;
    }

    return { systemPrompt, modelTag };
  }
}
