#######################
# X (Twitter) Prompt #
#######################

DEFAULT_X_PROMPT = """INSTRUCTIONS:
Analyze the provided X (formerly Twitter) posts from the last 24 hours and generate a comprehensive analysis. Focus on high-impact content and meaningful insights.

1. Key Discussions & News (High Priority):
   - Viral conversations and major debates (include engagement metrics)
   - Breaking news and significant announcements
   - Notable community reactions and responses
   - Industry developments and updates

2. Technical & Professional Insights:
   - Expert advice and best practices
   - Tool announcements and updates
   - Learning resources and tutorials
   - Problem-solving discussions

3. Community Value:
   - Collaborative projects and discussions
   - Notable achievements and milestones
   - Knowledge sharing and mentorship
   - Questions and solutions

4. Actionable Content:
   - Practical takeaways and tips
   - Time-sensitive opportunities
   - Upcoming events or deadlines
   - Shared resources and tools

Content Selection Criteria:
- Primary: Engagement metrics (likes, reposts, replies)
- Secondary: Source credibility and expertise
- Tertiary: Time sensitivity and relevance
- Required: Actionable value for the community
"""

DEFAULT_X_MACHINE_LEARNING_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on machine learning research developments, breakthroughs, and academic discussions. Prioritize high-impact research content and meaningful technical insights.

1. Research Breakthroughs & Papers:
   - New paper releases and preprints
   - Key findings and methodological innovations
   - Performance improvements and benchmarks
   - Critical discussions and peer feedback
   - Include arXiv links and engagement metrics

2. Technical Deep Dives:
   - Architecture innovations and improvements
   - Novel training approaches and techniques
   - Scaling insights and efficiency gains
   - Theoretical advances and proofs
   - Implementation details and ablation studies

3. Research Community Insights:
   - Conference announcements and deadlines
   - Workshop and seminar highlights
   - Collaborative research opportunities
   - Notable researcher discussions and threads
   - Academic job postings and opportunities

4. Practical Applications:
   - Code implementations and repositories
   - Reproduction results and validation studies
   - Dataset releases and benchmarks
   - Research-to-production insights
   - Hardware and infrastructure considerations

Content Selection Criteria:
- Primary: Technical depth and research novelty
- Secondary: Author expertise and institutional affiliation
- Tertiary: Community engagement and peer discussion
- Required: Verifiable claims with paper/code references
"""

DEFAULT_X_POLITICS_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on political developments, policy discussions, and governance issues. Prioritize factual reporting and balanced analysis.

1. Key Political Developments:
   - Legislative updates and policy changes
   - Electoral developments and polling data
   - Government announcements and decisions
   - International relations and diplomacy
   - Include engagement metrics and official sources

2. Policy Analysis:
   - Legislative proposals and debates
   - Policy impact assessments
   - Expert commentary and analysis
   - Regulatory changes and implications
   - Economic and social policy discussions

3. Political Discourse:
   - Public statements from officials
   - Cross-party debates and discussions
   - Civil society responses
   - Think tank analyses
   - Fact-checking and corrections

4. Civic Engagement:
   - Public consultation announcements
   - Upcoming political events
   - Voter information and resources
   - Grassroots movements and initiatives
   - Community impact discussions

Content Selection Criteria:
- Primary: Source credibility and official verification
- Secondary: Balanced representation of viewpoints
- Tertiary: Impact and relevance to governance
- Required: Fact-based reporting with verifiable sources
"""

DEFAULT_X_FINANCE_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on financial markets, economic indicators, and monetary policy. Prioritize accurate market data and expert analysis.

1. Market Updates:
   - Major market movements and triggers
   - Economic indicator releases
   - Central bank decisions and commentary
   - Currency market developments
   - Include key statistics and market metrics

2. Economic Analysis:
   - Macroeconomic trends and forecasts
   - Sector-specific developments
   - Policy impact assessments
   - Global trade developments
   - Expert commentary on economic data

3. Financial Sector News:
   - Banking sector developments
   - Regulatory changes and compliance
   - Financial technology innovations
   - Risk assessment and management
   - Industry structural changes

4. Investment Environment:
   - Market sentiment indicators
   - Risk factors and warnings
   - Opportunity analysis
   - Asset allocation discussions
   - Portfolio management insights

Content Selection Criteria:
- Primary: Data accuracy and source reliability
- Secondary: Analysis depth and expertise
- Tertiary: Market impact and relevance
- Required: Verifiable market data and sources
"""

DEFAULT_X_INVESTMENT_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on investment opportunities, market analysis, and portfolio management strategies. Prioritize professional analysis and risk-aware content.

1. Market Opportunities:
   - Asset class performance analysis
   - Emerging investment themes
   - Value identification strategies
   - Risk-reward assessments
   - Technical and fundamental analysis

2. Portfolio Strategies:
   - Asset allocation recommendations
   - Risk management techniques
   - Diversification approaches
   - Tax efficiency strategies
   - Portfolio rebalancing insights

3. Investment Research:
   - Company analysis and valuations
   - Industry sector deep dives
   - Economic impact studies
   - Alternative investment analysis
   - ESG investment considerations

4. Market Intelligence:
   - Institutional investor movements
   - Smart money flows
   - Insider trading patterns
   - Market sentiment indicators
   - Regulatory impact analysis

Content Selection Criteria:
- Primary: Analysis quality and methodology
- Secondary: Source credibility and track record
- Tertiary: Risk awareness and balance
- Required: Data-backed analysis with sources
"""

DEFAULT_X_ARTS_CULTURE_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on arts, cultural events, creative works, and artistic discourse. Prioritize diverse cultural perspectives and creative excellence.

1. Arts & Entertainment:
   - New artistic works and releases
   - Exhibition and performance announcements
   - Artist interviews and insights
   - Cultural criticism and reviews
   - Creative process discussions

2. Cultural Trends:
   - Emerging cultural movements
   - Cross-cultural exchanges
   - Social impact of arts
   - Digital culture developments
   - Cultural preservation efforts

3. Creative Community:
   - Collaborative projects
   - Artist residencies and opportunities
   - Cultural events and festivals
   - Educational initiatives
   - Community engagement projects

4. Industry Developments:
   - Art market trends
   - Cultural policy changes
   - Funding opportunities
   - Technology in arts
   - Institution updates

Content Selection Criteria:
- Primary: Artistic merit and cultural significance
- Secondary: Community impact and engagement
- Tertiary: Innovation and originality
- Required: Cultural context and attribution
"""

DEFAULT_X_STARTUP_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on startup ecosystem, entrepreneurship, and innovation. Prioritize actionable insights and practical knowledge.

1. Startup Ecosystem:
   - Funding announcements and deals
   - Market entry and expansion news
   - Product launches and updates
   - Growth metrics and milestones
   - Industry disruption stories

2. Founder Insights:
   - Leadership lessons and experiences
   - Growth strategies and tactics
   - Team building approaches
   - Problem-solving methods
   - Resource management tips

3. Market Opportunities:
   - Industry trends and gaps
   - Customer pain points
   - Technology adoption patterns
   - Market size assessments
   - Competitive analysis

4. Resource Network:
   - Investor insights and preferences
   - Accelerator and incubator programs
   - Networking opportunities
   - Talent acquisition strategies
   - Partnership opportunities

Content Selection Criteria:
- Primary: Practical value and actionability
- Secondary: Innovation and scalability
- Tertiary: Market validation and traction
- Required: Real-world examples and metrics
"""

DEFAULT_X_SCIENCE_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on scientific research, discoveries, and technological advances across disciplines. Prioritize peer-reviewed findings and expert commentary.

1. Research Breakthroughs:
   - New scientific discoveries
   - Experimental results
   - Theoretical advances
   - Methodology innovations
   - Include journal references and metrics

2. Scientific Discourse:
   - Peer review discussions
   - Research methodology debates
   - Interdisciplinary collaborations
   - Replication studies
   - Scientific controversy analysis

3. Field Applications:
   - Technology transfer
   - Industrial applications
   - Public health implications
   - Environmental impact
   - Policy recommendations

4. Scientific Community:
   - Conference highlights
   - Research funding opportunities
   - Academic collaboration calls
   - Public engagement initiatives
   - Educational resources

Content Selection Criteria:
- Primary: Scientific rigor and peer review
- Secondary: Impact and applicability
- Tertiary: Public interest and accessibility
- Required: Verified sources and citations
"""

DEFAULT_X_CRYPTO_PROMPT = """INSTRUCTIONS:
Analyze X (formerly Twitter) posts from the last 24 hours focusing on cryptocurrency markets, blockchain technology, and digital assets. Prioritize technical accuracy and market insights.

1. Market Analysis:
   - Price movements and trends
   - Trading volume analysis
   - Market sentiment indicators
   - Correlation studies
   - Include key metrics and charts

2. Technical Developments:
   - Protocol updates and forks
   - Network performance metrics
   - Security considerations
   - Scaling solutions
   - Infrastructure developments

3. Industry Evolution:
   - Regulatory developments
   - Institutional adoption
   - DeFi protocol updates
   - NFT market trends
   - Layer-2 solutions

4. Ecosystem Growth:
   - Project launches and updates
   - Partnership announcements
   - Community governance
   - Token economics
   - Integration milestones

Content Selection Criteria:
- Primary: Technical accuracy and data validity
- Secondary: Market impact and adoption
- Tertiary: Innovation and sustainability
- Required: Verifiable on-chain data and sources
"""

PROMPTS_TEMPLATE_DICT = {
    "General": DEFAULT_X_PROMPT,
    "Arts & Culture": DEFAULT_X_ARTS_CULTURE_PROMPT,
    "Crypto": DEFAULT_X_CRYPTO_PROMPT,
    "Finance & Economics": DEFAULT_X_FINANCE_PROMPT,
    "Investment": DEFAULT_X_INVESTMENT_PROMPT,
    "Machine Learning": DEFAULT_X_MACHINE_LEARNING_PROMPT,
    "Politics": DEFAULT_X_POLITICS_PROMPT,
    "Science": DEFAULT_X_SCIENCE_PROMPT,
    "Startups": DEFAULT_X_STARTUP_PROMPT,
    "Custom": "",
}


def get_default_prompt_index(ai_prompt):
    # Find the current template being used
    default_index = list(PROMPTS_TEMPLATE_DICT.keys()).index("General")
    if ai_prompt in PROMPTS_TEMPLATE_DICT.values():
        # Find which template is currently being used
        for key, value in PROMPTS_TEMPLATE_DICT.items():
            if value == ai_prompt:
                default_index = list(PROMPTS_TEMPLATE_DICT.keys()).index(key)
                break
    else:
        # If using a custom prompt, select the "Custom" option
        default_index = list(PROMPTS_TEMPLATE_DICT.keys()).index("Custom")
    return default_index


DEFAULT_TEXT_OUTPUT_FORMAT_PROMPT = """
OUTPUT FORMAT: The summary should follow an HTML format. Ensure that the report is well-structured, with clear headings for each section. There can be multiple sections in the summary.

Title Requirements:
- Start with an interesting, concise and informative title that captures the most impactful information
- Keep it concise (ideally 5-10 words)
- Use engaging language that encourages reading
- Highlight the most meaningful or surprising findings

Section Structure:
- Each section must have a clear, descriptive heading
- Number content items within sections for easy reference
- Include up to 3 most relevant URLs per content item
- Only include URLs that are directly from the provided context (no fabricated URLs)

URL Requirements:
- Verify that each URL is valid and accessible
- Double-check that URLs are correctly formatted in HTML
- Only use URLs that appear in the source material
- Remove any broken or invalid links
- Each URL must have a unique, descriptive link text that indicates its content
- Do not use generic names like "X post" or "Link" for multiple URLs

The output should follow this exact format:

<h2>[Catchy Title Here]</h2>
<br><hr style="border: 0; border-top: 1px solid #cccccc;"><br>

<h3>[Section Title]</h3>
<p>1. [content 1]</p>
<p>Relevant URLs:</p>
<ul style="padding-left: 40px;">
  <li><a href=[url1]>[url1]</a></li>
  <li><a href=[url2]>[url2]</a></li>
  <li><a href=[url3]>[url3]</a></li>
</ul>
<br>

<p>2. [content 2]</p>
<p>Relevant URLs:</p>
<ul style="padding-left: 40px;">
  <li><a href=[url1]>[url1]</a></li>
  <li><a href=[url2]>[url2]</a></li>
  <li><a href=[url3]>[url3]</a></li>
</ul>
<br>

[Additional sections follow the same pattern]

<br><hr style="border: 0; border-top: 1px solid #cccccc;"><br>
<h3>[Next Section Title]</h3>
"""

DEFAULT_TEXT_OUTPUT_FORMAT_PROMPT2 = """
OUTPUT FORMAT:
Create a clear, structured report following these guidelines:

1. Overall Structure:
   - Each section covers one main theme
   - Logical flow between sections
   - Consistent depth across sections

2. Content Requirements:
   - Start with most impactful information
   - Write in continuous, flowing paragraphs
   - Group related ideas into separate paragraphs
   - Try to be specific, mentioning and/or quoting users and their posts when possible
   - When quoting a post, make sure to ONLY quote the username and its text content, not the index or the date of the post!

3. Writing Style:
   - Use continuous, flowing paragraphs
   - Write in a professional but accessible tone
   - Maintain clear narrative structure
   - Include specific examples and quotes within paragraphs
   - Define technical terms naturally within the text
   - Connect ideas through smooth transitions

4. Formatting Rules:
   - No bullet points or lists
   - No bold or italic text
   - No special characters or markdown
   - Only plain text paragraphs
   - Use paragraph breaks to separate topics
   - Include section headers as plain text

Remember:
- Write in pure, flowing text
- Do not use bullet points or special formatting
- Use paragraphs to organize ideas
- Each section should read like a mini-article
- Maintain narrative continuity
"""

#######################
# Transcript Prompt #
#######################

DEFAULT_TRANSCRIPT_PROMPT = """
ROLE: You are a conversational content summarizer specializing in making written content sound natural when spoken.

TASK: Transform the X (formerly Twitter) data into a comprehensive, authoritative spoken transcript that effectively synthesizes key trends and discussions.

GUIDELINES:

1. Structure & Presentation:
   - Open with: "Here is a summary of the most significant trends in the last 24 hours on X."
   - Organize content hierarchically by relevance and impact
   - Maintain logical progression between topics with concise transitions
   - Present information with clarity and precision

2. Content & Analysis:
   - Incorporate specific metrics, quantitative data, and substantive details
   - Translate technical terminology into accessible yet precise language
   - Focus exclusively on informational content, omitting extraneous elements
   - Ensure comprehensive coverage of each significant topic

3. Source Integration:
   - Directly quote representative posts as supporting evidence
   - Attribute quotes formally: "As stated in one high-engagement post," "One notable contribution indicated"
   - Select quotes that demonstrate key insights, perspectives, or developments
   - Present 1-2 substantive quotations per major topic to illustrate trends

4. Delivery Specifications:
   - Employ concise, well-structured sentences optimized for verbal delivery
   - Maintain a professional, authoritative tone while remaining accessible
   - Eliminate redundancies and non-essential commentary
   - Ensure each section provides meaningful context and analysis
"""

########################
# Chat Context Prompt #
########################

CHAT_CONTEXT_PROMPT = """
ROLE: You are a knowledgeable assistant with expertise in analyzing and discussing social media trends.

CONTEXT:
- You have access to X posts from the user's followers (last 24h)
- You have a comprehensive report of top posts and trends
- You have URLs to the most relevant posts by section

TASK:
Your role is to engage in meaningful discussion about the provided content while:
1. Providing accurate, context-aware responses
2. Retrieving specific posts and URLs when requested
3. Maintaining a helpful and informative tone
4. Offering detailed explanations when needed

RESPONSE FORMAT:
1. Use markdown formatting for clarity
2. Structure responses with clear sections when appropriate
3. Format links as: [descriptive text](url.com)
4. Use bullet points or numbered lists for multiple items
5. Include relevant engagement metrics when discussing specific posts

IMPORTANT:
- Only reference information from the provided context
- Verify URLs before including them
- Maintain professional yet approachable tone
- Prioritize accuracy over comprehensiveness
"""

DEFAULT_X_ACCOUNTS = [
    "elonmusk",
    "Reuters", 
    "politico",
    "AP_Politics",
    "MarioNawfal",
    "TiffanyFong_",
    "TheEconomist",
    "WSJ",
    "nytimes",
    "BBCWorld",
    "CNN",
    "BBCBreaking",
    "Bloomberg",
    "ChuckCallesto",
    "ReutersBiz",
    "paulkrugman",
    "elerianm",
    "morganhousel",
    "LizAnnSonders",
    "DiMartinoBooth",
    "WarrenBuffett",
    "CathieDWood",
    "PershingSqFdn",
    "chamath",
    "mcuban",
    "Carl_C_Icahn",
    "georgesoros",
    "RayDalio",
    "JeffBezos",
    "BillGates",
    "SatyaNadella",
    "jack",
    "naval",
    "pmarca",
    "bchesky",
    "shl",
    "Jason",
    "Suhail",
    "kunalb11",
    "hunterwalk",
    "OpenAI",
    "sama",
    "demishassabis",
    "AndrewYNg",
    "ylecun",
    "geoffreyhinton",
    "AnthropicAI",
    "GaryMarcus",
    "MistralAI",
    "karpathy",
    "ycombinator",
    "garrytan",
    "mwseibel",
    "daltonc",
    "paulg",
    "patrickc",
    "Google",
    "Meta",
    "Apple",
    "tim_cook",
    "Microsoft",
    "Amazon",
    "Tesla",
    "SpaceX",
    "NASA",
    "sundarpichai",
    "finkd",
    "JeffBezos",
    "MKBHD",
    "TechCrunch",
    "verge",
    "CNET",
    "Mrwhosetheboss",
    "Engadget",
    "WIRED",
    "LinusTech",
    "neiltyson",
    "SciAm",
    "BrianGreene",
    "IFLScience",
    "gunsnrosesgirl3",
    "AstroKatie",
    "NatGeo",
    "BillNye",
    "Culture_Crit",
    "HistoryInPics",
    "thinkingwest",
    "KnowledgeArchiv",
    "ClassicalAegis",
    "Forbes",
    "AJEnglish",
    "BBCWorld",
    "AFP",
    "euronews",
    "XHNews",
    "allafrica",
    "SCMPNews",
    "JapanTimes",
    "IndiaToday",
    "NikkeiAsia",
    "ErikVoorhees",
    "APompliano",
    "cobie",
    "itsolelehmann",
    "andrewchen",
    "lexfridman",
    "joerogan",
    "MrBeast",
    "taylorswift13",
    "KimKardashian",
    "justinbieber",
    "KylieJenner",
    "BarackObama",
    "realDonaldTrump",
    "TrumpDailyPosts",
]
DEFAULT_X_ACCOUNTS = list(set(DEFAULT_X_ACCOUNTS))
DEFAULT_X_ACCOUNTS = [f"@{acc.replace('@', '')}" for acc in DEFAULT_X_ACCOUNTS]
