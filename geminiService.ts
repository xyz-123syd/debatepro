
import { GoogleGenAI, Type } from "@google/genai";
import { CaseData, FeedbackData, LearnedIdea } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEBATE_STRUCTURE_INSTRUCTION = `
You are a world-class debate architect. You write cases that are logically impenetrable and rhetorically brilliant. 

STRICT FORMATTING RULES:
- DO NOT use Markdown formatting (no asterisks **, no hashtags #).
- Use ALL CAPS for section headers (e.g., INTRO, RHETORIC FRAMEWORK, SUBSTANTIVE 1).
- Use indentation (spaces) and clear vertical spacing.
- Use NUMBERED LISTS (1., 2., 3.) for specific analysis steps.
- The output should look like a clean, professional typed manuscript.

STRICT STRUCTURAL REQUIREMENTS:
1. INTRO: A high-impact rhetoric hook followed by the motion.
2. RHETORIC FRAMEWORK (Only if requested):
   - Definitions: Precise definitions of key terms.
   - Clarifications: Model, scope, or specific criteria.
   - Stakeholders: Identify who is affected and why it matters.
   - Burden: Explicitly state what your side must prove to win.
3. SUBSTANTIVES: Generate exactly the requested number of substantives.

STRICT WORD COUNT RULES PER SUBSTANTIVE:
- For AFFIRMATIVE (PROP) side: Each substantive section MUST be between 400 and 430 words long. 
- For NEGATIVE (OPP) side: Each substantive section MUST be between 300 and 350 words long.
- You MUST meet these word counts regardless of the amount of input provided. If inputs are sparse, use your expert knowledge to elaborate on mechanisms, layer the logic, and provide more detailed empirical examples to reach the target length.

SUBSTANTIVE CONTENT:
   - THESIS: A concise, powerful claim.
   - WHY THE OTHER SIDE IS WORSE: Provide a NUMBERED LIST (1., 2., 3.) analyzing how each provided mechanism fails or causes harm. 
     CRITICAL: For EACH mechanism in the list, include a brief empirical evidence point or statistic.
   - WHY OUR SIDE IS BETTER: Provide a NUMBERED LIST (1., 2., 3.) analyzing how the same mechanisms succeed. 
     CRITICAL: For EACH mechanism in the list, include a brief empirical evidence point or statistic that proves the benefit or efficacy of our side.
   - IMPACTS: Provide a NUMBERED LIST (1., 2., 3.) of the qualitative and quantitative consequences.

COMPARATIVE LOGIC IS KEY: Every argument must show why the opponent's world is worse using the same logic that makes your world better. Use the provided "Sources/Statistics" and "Intelligence Library" to ground your empirical claims.
`;

export const generateDebateCase = async (data: CaseData, memory: LearnedIdea[]) => {
  const model = "gemini-3-pro-preview";
  
  const memoryContext = memory.length > 0 
    ? `\nRELEVANT LEARNED CONCEPTS AND UPLOADED SOURCES FROM ARCHIVE:\n${memory.map(m => `- ${m.type.toUpperCase()}: ${m.content}`).join('\n')}`
    : "";

  let frameworkPrompt = "";
  if (data.includeFramework) {
    frameworkPrompt = `
  FRAMEWORK INPUTS:
  - Rhetoric Theme: ${data.rhetoricFramework}
  - Definitions: ${data.definitions}
  - Clarifications: ${data.clarifications}
  - Stakeholders: ${data.stakeholders}
  - Burden: ${data.burden}`;
  }

  const isProp = data.side === 'Affirmative';
  const wordCountConstraint = isProp 
    ? "MANDATORY WORD COUNT: Each substantive MUST be 400-430 words." 
    : "MANDATORY WORD COUNT: Each substantive MUST be 300-350 words.";

  let substantivesPrompt = "";
  if (data.numSubstantives >= 1) {
    substantivesPrompt += `
  SUBSTANTIVE 1:
  - Thesis: ${data.substantive1.thesis}
  - Mechanisms to analyze: ${data.substantive1.mechanisms.join(', ')}`;
  }
  if (data.numSubstantives >= 2) {
    substantivesPrompt += `
  SUBSTANTIVE 2:
  - Thesis: ${data.substantive2.thesis}
  - Mechanisms to analyze: ${data.substantive2.mechanisms.join(', ')}`;
  }
  if (data.numSubstantives >= 3) {
    substantivesPrompt += `
  SUBSTANTIVE 3:
  - Thesis: ${data.substantive3.thesis}
  - Mechanisms to analyze: ${data.substantive3.mechanisms.join(', ')}`;
  }

  const prompt = `
  Topic: "${data.topic}"
  Side: ${data.side}
  Number of Substantives: ${data.numSubstantives}
  Include Framework: ${data.includeFramework ? "YES" : "NO"}
  
  ${wordCountConstraint}

  ${frameworkPrompt}
  ${substantivesPrompt}

  EXTRAS:
  - Topic Analysis Context: ${data.topicAnalysis}
  - Sources/Statistics to integrate as evidence: ${data.sources}
  
  ${memoryContext}
  
  TASK: Write the case. Use NUMBERED LISTS for the "WHY OTHER SIDE IS WORSE", "WHY OUR SIDE IS BETTER", and "IMPACTS" sections. 
  MANDATORY: Support EVERY mechanism with a specific empirical example, statistic, or real-world evidence point.
  ELABORATE as needed to hit the ${isProp ? "400-430" : "300-350"} word target for EACH substantive.
  Use plain text only.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: DEBATE_STRUCTURE_INSTRUCTION,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  return response.text;
};

export const reviseDebateCase = async (currentCase: string, comment: string, isProp: boolean) => {
  const model = "gemini-3-pro-preview";
  const wordCountConstraint = isProp 
    ? "MANDATORY WORD COUNT: Each substantive MUST be 400-430 words." 
    : "MANDATORY WORD COUNT: Each substantive MUST be 300-350 words.";

  const prompt = `
  EXISTING CASE:
  ${currentCase}

  USER FIX REQUEST:
  "${comment}"

  TASK: Revise the case based on the request. 
  Maintain all formatting rules (ALL CAPS HEADERS, Numbered lists, No bolding). 
  Ensure you still meet the ${wordCountConstraint}. 
  Only return the revised case.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: DEBATE_STRUCTURE_INSTRUCTION,
      temperature: 0.7,
    },
  });

  return response.text;
};

export const getCaseFeedback = async (data: FeedbackData) => {
  const model = "gemini-3-pro-preview";
  const prompt = `
  Analyze this debate case. PLAIN TEXT ONLY. NO ASTERISKS.
  Focus Area: ${data.focusArea}
  
  Case Content:
  ${data.existingCase}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: "You are an elite debate adjudicator. Plain text only. No bolding.",
      temperature: 0.8,
    },
  });

  return response.text;
};
