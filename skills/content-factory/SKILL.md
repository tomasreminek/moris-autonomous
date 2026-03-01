# Content Factory Skill Pack

## Description
Multi-agent content pipeline that researches, writes, and distributes content automatically. Based on Alex Finn's Discord pipeline.

## Agents Involved
- Researcher (trend monitoring)
- Copywriter (script/blog writing)
- Document Expert (humanizer, optimization)

## Workflow
1. **Researcher** monitors X/Reddit → trending topics → 2h intervals
2. **Sub-agent** deep-researches each story
3. **Copywriter** turns stories into full scripts
4. **Document Expert** applies "humanizer" → removes AI smell
5. **Distribution** → YouTube, blog, newsletter

## Usage
```
@content-factory "Start daily content pipeline"
@content-factory "Research: AI agents trending this week"
```

## Configuration
- X/Twitter API credentials
- YouTube channel access
- Discord webhook (optional)
- Content calendar preferences

## Tags
content, youtube, twitter, automation, pipeline
