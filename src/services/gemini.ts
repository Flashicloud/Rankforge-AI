import OpenAI from "openai";
import { SEO_ARCHITECT_PROMPT, ARTICLE_OPTIMIZATION_PROMPT } from "../constants";

let aiInstance: OpenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Try process.env first (for AI Studio environment), then fallback to import.meta.env (for Vite/Hostinger)
    const apiKey = process.env.OPENROUTER_API_KEY || (import.meta as any).env?.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API Key is missing. Please add VITE_OPENROUTER_API_KEY to your environment variables on Hostinger.");
    }
    aiInstance = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for frontend usage
      defaultHeaders: {
        "HTTP-Referer": window.location?.origin || "https://seowriter.app",
        "X-Title": "SEO Content Human Writer",
      }
    });
  }
  return aiInstance;
}

// Helper to run a specific phase
async function runPhase(
  phaseId: number, 
  phaseName: string, 
  model: string, 
  context: string, 
  keyword: string,
  contentType: string,
  wordRange: string,
  additionalContext: string,
  onProgress?: (status: string, partialOutput?: string) => void,
  onScrapeComplete?: (stats: { success: number; failed: number; total: number }) => void
): Promise<string> {
  if (onProgress) onProgress(`Executing Phase ${phaseId}: ${phaseName} (${model})...`);

  let contextInjection = "";
  const hasConfig = contentType || wordRange || additionalContext.trim();

  if (hasConfig && [0, 2, 5].includes(phaseId)) {
    const effectiveContentType = contentType || "Standard Article Mode";
    let typeLogic = "";
    switch(effectiveContentType) {
      case "Pillar Content":
        typeLogic = "→ Enforce deep-dive structure.\n→ Expand semantic entity breadth.\n→ Include broader topical coverage.\n→ Suggest 5–8 internal linking opportunities.\n→ Encourage original frameworks or models.";
        break;
      case "Cluster Content":
        typeLogic = "→ Narrow topical scope.\n→ Focus on one sub-intent.\n→ Avoid redefining entire topic.\n→ Suggest linking back to the pillar article.";
        break;
      case "Supporting Article":
        typeLogic = "→ Keep concise and targeted.\n→ Support existing topical authority.\n→ Minimal repetition of core definitions.";
        break;
      case "Commercial Page":
        typeLogic = "→ Emphasize comparison tables.\n→ Include decision-support elements.\n→ Prioritize transactional or commercial intent alignment.";
        break;
      case "Standard Article Mode":
        typeLogic = "→ Follow standard SEO best practices.\n→ Balance depth and breadth naturally based on SERP intent.";
        break;
    }

    let wordLogic = "";
    if (wordRange) {
      wordLogic = `\n\nTARGET WORD RANGE: ${wordRange}\n- Word range should guide output length.\n- Do NOT pad content artificially to meet range.\n- Maintain value density.`;
    }

    let additionalLogic = "";
    if (additionalContext.trim()) {
      additionalLogic = `\n\nADDITIONAL USER CONTEXT & CONSTRAINTS:\n${additionalContext}\n\nCRITICAL INSTRUCTIONS FOR ADDITIONAL CONTEXT:\n1. You MUST strictly adhere to the above additional context, audience specifications, angles, and constraints for this phase.\n2. ADVANCED LOGIC: If the Additional Context contradicts the dominant SERP intent, you MUST prioritize the SERP intent for structural decisions, but adapt the tone and angle to satisfy the Additional Context instead of changing the core structure.`;
    }

    let brandVoiceLogic = "";
    // We will pass brandVoice through additionalContext for now, or we can add a new parameter.
    // Assuming brandVoice is appended to additionalContext if it exists.

    contextInjection = `
    *** CONTENT CONFIGURATION ***
    CONTENT TYPE: ${effectiveContentType}
    ${typeLogic}${wordLogic}${additionalLogic}
    `;
  }

  let scrapedDataText = "";
  if (phaseId === 1) {
    if (onProgress) onProgress(`Executing Phase ${phaseId}: Fetching Live SERP Data via Google API...`);
    try {
      const res = await fetch('/api/scrape-serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        console.error("Scraper API Error:", data.error);
        if (onProgress) onProgress(`Scraping Error: ${data.error}`);
        scrapedDataText = `\n\n(Note: Live SERP scraping failed due to API error. Rely on your internal knowledge.)\n`;
        if (onScrapeComplete) onScrapeComplete({ success: 0, failed: 0, total: 0 });
      } else if (data.success && data.data && data.data.length > 0) {
        scrapedDataText = `\n\n*** LIVE SERP SCRAPED DATA (GOOGLE SEARCH) ***\nHere is the actual content from the top ranking pages for "${keyword}":\n`;
        let successCount = 0;
        let failCount = 0;
        
        data.data.forEach((item: any, index: number) => {
          if (item.status === 'Success') {
            successCount++;
          } else {
            failCount++;
          }
          scrapedDataText += `\n--- Competitor ${index + 1} (${item.url}) [Status: ${item.status}] ---\n${item.content}\n`;
        });
        scrapedDataText += `\nUse this exact scraped data to perform your N-Gram analysis, entity extraction, and competitor benchmarking instead of hallucinating.\n`;
        
        if (onProgress) onProgress(`Scraping Complete: ${successCount} URLs read successfully, ${failCount} blocked/failed.`);
        if (onScrapeComplete) onScrapeComplete({ success: successCount, failed: failCount, total: data.data.length });
      }
    } catch (e) {
      console.error("Failed to scrape SERP data:", e);
      scrapedDataText = `\n\n(Note: Live SERP scraping failed. Rely on your internal knowledge.)\n`;
      if (onScrapeComplete) onScrapeComplete({ success: 0, failed: 0, total: 0 });
    }
    if (onProgress) onProgress(`Executing Phase ${phaseId}: ${phaseName} (${model})...`);
  }

  const prompt = `
    ${SEO_ARCHITECT_PROMPT}

    *** CONTEXT SO FAR ***
    Target Keyword: "${keyword}"
    ${contextInjection}
    ${scrapedDataText}
    
    PREVIOUS OUTPUTS:
    ${context}

    *** IMMEDIATE INSTRUCTION ***
    ACTION: Execute ONLY PHASE ${phaseId}.
    
    DO NOT execute any other phases.
    Focus strictly on the requirements for Phase ${phaseId} as defined in the system prompt.
    Output ONLY the result for Phase ${phaseId}.
    ${phaseId === 5 ? "CRITICAL: Output ONLY the article text. Start directly with the H1 heading. Do not include introductory phrases like 'Here is the article'. Do not include concluding remarks." : ""}
  `;

  // Determine OpenRouter model based on the requested model
  // Using valid OpenRouter API IDs
  let orModel = "anthropic/claude-haiku-4.5"; 
  if (model.toLowerCase().includes("sonnet")) {
    orModel = "anthropic/claude-sonnet-4.6"; 
  }

  try {
    const response = await getAI().chat.completions.create({
      model: orModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const output = `\n\n## PHASE ${phaseId} OUTPUT\n${response.choices[0].message.content}`;
    
    // Send the output immediately to the UI
    if (onProgress) onProgress(`Completed Phase ${phaseId}: ${phaseName}`, output);
    
    return output;
  } catch (error: any) {
    console.error(`Error in Phase ${phaseId}:`, error);
    throw new Error(`OpenRouter API Error in Phase ${phaseId}: ${error.message || "Unknown error"}`);
  }
}

export async function generateSEOContent(
  keyword: string, 
  contentType: string,
  wordRange: string,
  additionalContext: string,
  brandVoice: string = "",
  onProgress?: (status: string, partialOutput?: string) => void,
  includePhase0: boolean = true,
  onScrapeComplete?: (stats: { success: number; failed: number; total: number }) => void
) {
  try {
    let accumulatedContext = "";
    
    // Combine additional context with brand voice
    let combinedContext = additionalContext;
    if (brandVoice.trim()) {
      combinedContext += `\n\nBRAND VOICE & TONE:\n${brandVoice}\nCRITICAL: The entire article MUST be written strictly in this brand voice and tone.`;
    }

    // Phase 0: Structural Variation
    if (includePhase0) {
      const p0 = await runPhase(0, "Structural Variation", "Claude 4.5 Haiku", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
      accumulatedContext += p0;
    } else {
      if (onProgress) onProgress("Skipping Phase 0: Structural Variation...");
      accumulatedContext += "\n\n## PHASE 0 OUTPUT\n(Skipped by user preference)";
    }

    // Phase 1: SERP Intelligence
    const p1 = await runPhase(1, "SERP Intelligence", "Claude 4.6 Sonnet", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p1;

    // Phase 2: Intent Enforcement
    const p2 = await runPhase(2, "Intent Enforcement", "Claude 4.5 Haiku", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p2;

    // Phase 3: Semantic Architecture
    const p3 = await runPhase(3, "Semantic Architecture", "Claude 4.5 Haiku", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p3;

    // Phase 4: E-E-A-T++ Framework
    const p4 = await runPhase(4, "E-E-A-T++ Framework", "Claude 4.5 Haiku", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p4;

    // Phase 5: Content Creation
    const p5 = await runPhase(5, "Content Creation", "Claude 4.6 Sonnet", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p5;

    // Phase 6: AI Visibility Check
    const p6 = await runPhase(6, "AI Visibility Check", "Claude 4.5 Haiku", accumulatedContext, keyword, contentType, wordRange, combinedContext, onProgress, onScrapeComplete);
    accumulatedContext += p6;

    return accumulatedContext;

  } catch (error) {
    console.error("Error generating SEO content:", error);
    throw error;
  }
}

async function runOptimizePhase(
  phaseId: number, 
  phaseName: string, 
  model: string, 
  context: string, 
  keyword: string,
  existingArticle: string,
  contextInjection: string,
  onProgress?: (status: string, partialOutput?: string) => void
): Promise<string> {
  if (onProgress) onProgress(`Executing Phase ${phaseId}: ${phaseName} (${model})...`);

  const prompt = `
    ${ARTICLE_OPTIMIZATION_PROMPT}

    *** INPUT DATA ***
    Target Keyword: "${keyword}"
    ${contextInjection}

    Existing Article:
    """
    ${existingArticle}
    """

    PREVIOUS OUTPUTS:
    ${context}

    *** IMMEDIATE INSTRUCTION ***
    ACTION: Execute ONLY PHASE ${phaseId}.
    DO NOT execute any other phases.
    Focus strictly on the requirements for Phase ${phaseId} as defined in the system prompt.
    Output ONLY the result for Phase ${phaseId}.
    ${phaseId < 7 ? "CRITICAL: This is an audit/strategy phase. DO NOT write or rewrite the article content yet. Return ONLY the analysis/audit requested." : ""}
    ${phaseId === 8 ? "CRITICAL: Since this is the final phase, you MUST also output the 'FINAL OUTPUT' items including the Meta description and the exact JSON Overall SEO Score at the very end." : ""}
  `;

  // Determine OpenRouter model based on the requested model
  let orModel = "anthropic/claude-haiku-4.5"; 
  if (model.toLowerCase().includes("sonnet")) {
    orModel = "anthropic/claude-sonnet-4.6"; 
  }

  try {
    const response = await getAI().chat.completions.create({
      model: orModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const output = `\n\n## PHASE ${phaseId} OUTPUT\n${response.choices[0].message.content}`;
    
    // Send the output immediately to the UI
    if (onProgress) onProgress(`Completed Phase ${phaseId}: ${phaseName}`, output);
    
    return output;
  } catch (error: any) {
    console.error(`Error in Phase ${phaseId}:`, error);
    throw new Error(`OpenRouter API Error in Phase ${phaseId}: ${error.message || "Unknown error"}`);
  }
}

export async function optimizeSEOContent(
  keyword: string,
  existingArticle: string,
  contentType: string,
  additionalContext: string,
  brandVoice: string = "",
  onProgress?: (status: string, partialOutput?: string) => void
) {
  try {
    if (onProgress) onProgress("Initializing Optimization Engine...");

    let contextInjection = "";
    if (contentType || additionalContext.trim() || brandVoice.trim()) {
      contextInjection = `\n\n*** CONTENT CONFIGURATION ***\n`;
      if (contentType) contextInjection += `CONTENT TYPE: ${contentType}\n`;
      if (additionalContext.trim()) contextInjection += `ADDITIONAL CONTEXT: ${additionalContext}\n`;
      if (brandVoice.trim()) contextInjection += `BRAND VOICE & TONE: ${brandVoice}\nCRITICAL: The entire article MUST be written strictly in this brand voice and tone.\n`;
    }

    let accumulatedContext = "";

    // Phase 1: SERP Benchmark
    const p1 = await runOptimizePhase(1, "SERP Benchmark", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p1;

    // Phase 2: Structure Audit
    const p2 = await runOptimizePhase(2, "Structure Audit", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p2;

    // Phase 3: Semantic Gap Analysis
    const p3 = await runOptimizePhase(3, "Semantic Gap Analysis", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p3;

    // Phase 4: AI Overview Readiness
    const p4 = await runOptimizePhase(4, "AI Overview Readiness", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p4;

    // Phase 5: E-E-A-T Signal Audit
    const p5 = await runOptimizePhase(5, "E-E-A-T Signal Audit", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p5;

    // Phase 6: Optimization Strategy
    const p6 = await runOptimizePhase(6, "Optimization Strategy", "Claude 4.6 Sonnet", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p6;

    // Phase 7: Precision Upgrades
    const p7 = await runOptimizePhase(7, "Precision Upgrades", "Claude 4.6 Sonnet", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p7;

    // Phase 8: SEO Validation & Final Output
    const p8 = await runOptimizePhase(8, "SEO Validation", "Claude 4.5 Haiku", accumulatedContext, keyword, existingArticle, contextInjection, onProgress);
    accumulatedContext += p8;

    if (onProgress) onProgress("Optimization Complete!", accumulatedContext);
    return accumulatedContext;
  } catch (error) {
    console.error("Error optimizing SEO content:", error);
    if (onProgress) onProgress("Error: Failed to optimize content. Please check your API key and try again.");
    throw error;
  }
}
