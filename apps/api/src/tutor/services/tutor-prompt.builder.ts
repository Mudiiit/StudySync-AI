import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TutorPromptBuilder {
  constructor(private prisma: PrismaService) {}

  buildSystemPrompt(mode?: string): string {
    let modeInstruction = '';
    switch (mode) {
      case 'eli5':
        modeInstruction =
          "Mode: ELI5 (Explain Like I'm 5). Use simple analogies, zero academic jargon, and explain as if talking to a child.";
        break;
      case 'socratic':
        modeInstruction =
          'Mode: Socratic Method. Do not give direct answers. Instead, respond with guiding questions that lead the student to realize the answer themselves.';
        break;
      case 'professor':
        modeInstruction =
          'Mode: Professor. Offer detailed, formal, lecture-style explanations containing deep breakdowns, key vocabulary, and strict academic reasoning.';
        break;
      case 'exam':
        modeInstruction =
          'Mode: Exam Prep. Highlight predictable exam topics, how scoring matrices work, common pitfalls, and write highly testable tips.';
        break;
      case 'debug':
        modeInstruction =
          'Mode: Code Debugging. Detail how variables change state, identify syntactic/logic bugs, provide code snippets, and list correct implementations.';
        break;
      default:
        modeInstruction =
          'Mode: Standard academic tutoring. Give structured explanations using lists, headings, and tables.';
    }

    return `You are StudySync AI's Enterprise AI Tutor, an elite academic personal teacher.
Your goal is to help the student master their study materials by providing highly personalized, clear, and comprehensive explanations, similar to a patient and expert professor.

Guidelines for your responses:
- Ground your answers in the student's actual materials. Refer to their notes or notebooks where appropriate.
- Explain concepts clearly. Use markdown headings, bullet points, numbered lists, clean tables, and code blocks with syntax highlighting where relevant.
- Include LaTeX mathematical notation using standard delimiters (e.g. \\(...\\) for inline and \\[...\\] for block math) when explaining math or formulas.
- Enhance your explanations with:
  - Real-life analogies to simplify complex topics.
  - "Important Notes" and "Common Mistakes" sections.
  - "Exam Tips" to help them prepare.
- ${modeInstruction}`;
  }

  async buildContextText(
    userId: string,
    noteId?: string,
    notebookId?: string,
  ): Promise<string> {
    let contextText = '';

    // Notebook context
    if (notebookId) {
      const notebook = await this.prisma.notebook.findFirst({
        where: { id: notebookId, userId },
      });
      if (notebook) {
        contextText += `\n=== NOTEBOOK CONTEXT ===\nNotebook Title: ${notebook.title}\nDescription: ${notebook.description || 'N/A'}\n`;
        // Load active notebook notes
        const notes = await this.prisma.note.findMany({
          where: {
            notebookId,
            userId,
            deleted: false,
            archived: false,
          },
          select: { title: true, content: true },
        });
        if (notes.length > 0) {
          contextText += `Notes inside notebook:\n`;
          notes.forEach((n) => {
            contextText += `- Note Title: "${n.title}"\n  Content excerpt:\n  """\n  ${n.content.slice(0, 1000)}\n  """\n`;
          });
        }
      }
    }

    // Selected Note context
    if (noteId) {
      const note = await this.prisma.note.findFirst({
        where: { id: noteId, userId },
      });
      if (note) {
        contextText += `\n=== ACTIVE NOTE CONTEXT ===\nNote Title: ${note.title}\nContent:\n"""\n${note.content}\n"""\n`;
        if (note.summary) {
          contextText += `AI Summary of Note: ${note.summary}\n`;
        }
      }
    }

    // Flashcards context
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        userId,
        OR: [
          noteId ? { noteId } : null,
          notebookId ? { notebookId } : null,
        ].filter(Boolean) as any,
      },
      select: { question: true, answer: true, explanation: true },
      take: 20,
    });
    if (flashcards.length > 0) {
      contextText += `\n=== RELATED FLASHCARDS ===\n`;
      flashcards.forEach((f, idx) => {
        contextText += `Card ${idx + 1}: Q: "${f.question}" | A: "${f.answer}" ${f.explanation ? `(Explanation: ${f.explanation})` : ''}\n`;
      });
    }

    // Quiz performance context
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        userId,
        OR: [
          noteId ? { noteId } : null,
          notebookId ? { notebookId } : null,
        ].filter(Boolean) as any,
      },
      include: {
        attempts: {
          where: { completedAt: { not: null } },
          orderBy: { startedAt: 'desc' },
          take: 2,
        },
      },
      take: 5,
    });
    if (quizzes.length > 0) {
      contextText += `\n=== RECENT QUIZ PERFORMANCE ===\n`;
      quizzes.forEach((q) => {
        const attemptsStr = q.attempts
          .map((a) => `${a.score}/${q.questionCount} (${a.percentage}%)`)
          .join(', ');
        contextText += `- Quiz: "${q.title}" | Difficulty: ${q.difficulty} | Recent completion percentages: [${attemptsStr || 'No completions yet'}]\n`;
      });
    }

    return contextText;
  }
}
