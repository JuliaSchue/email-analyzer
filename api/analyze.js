export default async function handler(req, res) {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, goal, subjectLine, metrics, audienceInfo, level } = req.body;

    let prompt;

    if (level === 1) {
      prompt = `Analyze this email. Respond ONLY with valid JSON, no markdown, no backticks.

EMAIL TEXT:
${email}

GOAL: ${goal}
SUBJECT LINE: ${subjectLine}
METRICS: ${metrics}

Respond with this exact JSON structure:
{
  "goalFit": { "score": <1-10>, "explanation": "<2-3 sentences>" },
  "structureScore": { "score": <1-10>, "explanation": "<2-3 sentences>" },
  "metrics": {
    "openRate": { "value": "<X%>", "status": "<healthy or unhealthy>", "insight": "<1 sentence>" },
    "clickRate": { "value": "<X%>", "status": "<healthy or unhealthy>", "insight": "<1 sentence>" },
    "unsubRate": { "value": "<X%>", "status": "<healthy or unhealthy>", "insight": "<1 sentence>" }
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "hasMetrics": <true or false>
}

Scoring criteria:
- Goal-to-Message Fit: Does the email achieve its stated goal? For Sales emails: Does it follow PAS (Problem, Agitate, Solution)? Is the CTA aligned with the goal? Is there a clear single CTA?
- Structure & Readability: Easy to scan? Strong opening hook? Appropriate length? Consistent tone? Logical flow from hook to body to CTA?
- Metric benchmarks: Open Rate healthy = 35%+, Click Rate healthy = 1%+ (sales) or context-dependent, Unsubscribe Rate healthy = below 0.5% (sales below 0.7%)`;
    }

    if (level === 2) {
      prompt = `Deep dive email analysis. Respond ONLY with valid JSON, no markdown, no backticks.

EMAIL TEXT:
${email}

GOAL: ${goal}
SUBJECT LINE: ${subjectLine}

AUDIENCE & BRAND INFO PROVIDED BY USER:
${audienceInfo}

Provide 3 additional scores:
{
  "audienceFit": { "score": <1-10>, "explanation": "<2-3 sentences about how well the email speaks to the ideal client's pain points, desires, and misbeliefs>" },
  "offerAlignment": { "score": <1-10>, "explanation": "<2-3 sentences about how well the email connects to and prepares for the offer>" },
  "brandVoice": { "score": <1-10>, "explanation": "<2-3 sentences about brand voice consistency>" },
  "deepStrengths": ["<strength related to audience/offer/voice>", "<strength related to audience/offer/voice>"],
  "deepOpportunities": ["<improvement related to audience/offer/voice>", "<improvement related to audience/offer/voice>"],
  "quickWin": "<one specific actionable change the user could make right now>"
}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
}
