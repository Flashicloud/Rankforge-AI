export const extractArticleAndResearch = (fullText: string, currentMode: 'generate' | 'optimize') => {
  let research = fullText;
  let article = fullText;

  if (currentMode === 'generate') {
    // Try exact match first since runPhase appends exactly "## PHASE X OUTPUT"
    const p5Marker = '## PHASE 5 OUTPUT';
    const p6Marker = '## PHASE 6 OUTPUT';
    
    const p5Index = fullText.indexOf(p5Marker);
    if (p5Index !== -1) {
      const startIdx = fullText.indexOf('\n', p5Index);
      const p6Index = fullText.indexOf(p6Marker, startIdx);
      
      if (p6Index !== -1) {
        article = fullText.substring(startIdx, p6Index).trim();
      } else {
        article = fullText.substring(startIdx).trim();
      }
    } else {
      // Fallback regex if exact marker is missing
      const phase5Match = fullText.match(/(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 5|5\.)[^\n]*\n([\s\S]*?)(?:(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 6|6\.)|$)/i);
      if (phase5Match) {
        article = phase5Match[1].trim();
      }
    }
  } else {
    // Optimize mode: Article is usually in Phase 7
    const phase7Match = fullText.match(/(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 7|7\.)[^\n]*\n([\s\S]*?)(?:(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 8|8\.)|$)/i);
    if (phase7Match) {
      article = phase7Match[1].trim();
    }
  }

  // Cleanup conversational filler from AI if present
  if (article) {
    // Try to strip conversational prefix by finding the first heading mark
    const firstHeadingIndex = article.indexOf('#');
    if (firstHeadingIndex !== -1 && firstHeadingIndex < 500) {
      // If there's text before the first heading, check if it's filler
      const prefix = article.substring(0, firstHeadingIndex).trim().toLowerCase();
      // Only strip if the prefix is short or explicitly conversational
      if (
        prefix.includes('here is the article') || 
        prefix.includes('here is your article') || 
        prefix.includes('here is the requested') || 
        prefix.includes('here is') || 
        prefix.includes('sure,') || 
        prefix.includes('certainly') || 
        (prefix.length > 0 && prefix.length < 150 && !prefix.includes('\n\n')) // Short 1-liner like "Here is the article:"
      ) {
         article = article.substring(firstHeadingIndex).trim();
      }
    }
    
    // Try to strip conversational suffix (e.g., "Let me know if you need any...")
    const lines = article.split('\n');
    let endIndex = lines.length;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const line = lines[i].toLowerCase().trim();
      if (line.match(/^(hope this helps|let me know|this concludes|here is|please let me know|as an ai|as an ai language model|if you need|enjoy your article|that covers|feel free to|let's move on|moving on to)/)) {
        endIndex = i;
        // Check if there are empty lines before it
        while (endIndex > 0 && lines[endIndex - 1].trim() === '') {
          endIndex--;
        }
      }
    }
    if (endIndex < lines.length) {
      article = lines.slice(0, endIndex).join('\n').trim();
    }
  }

  return { research, article };
};
