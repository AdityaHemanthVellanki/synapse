---
title: Sentiment Analysis
description: Aggregates and scores market sentiment from news feeds, social media, and options flow data to produce a composite sentiment indicator
version: "1.0.0"
domain: data-analysis
priority: 0.5
activation:
  triggers:
    - sentiment
    - market sentiment
    - news sentiment
    - social sentiment
    - fear and greed
    - market mood
    - bullish bearish
  required_context:
    - market_data
inputs:
  - name: asset_identifier
    schema: "string (ticker symbol or asset ID)"
    required: true
  - name: sentiment_sources
    schema: "Array<'news' | 'social' | 'options_flow' | 'all'> (default ['all'])"
    required: false
  - name: lookback_hours
    schema: "number (hours, default 24)"
    required: false
outputs:
  - name: sentiment_report
    schema: "{ composite_score: number (-1 to 1), news_score: number, social_score: number, options_flow_score: number, put_call_ratio: number, sentiment_trend: 'improving' | 'stable' | 'deteriorating', confidence: number (0 to 1), key_narratives: Array<string> }"
dependencies:
  required: []
  optional: []
context_budget_cost: 1.5
evaluation:
  success_criteria:
    - Composite score is between -1 and 1
    - Individual source scores are between -1 and 1
    - Put/call ratio is a positive number
    - Confidence reflects the volume and recency of data sources
    - At least one key narrative is identified
  failure_modes:
    - News API or social media feeds are unavailable
    - Insufficient data volume to produce reliable sentiment score
    - Language model misclassifies sarcasm or irony in social data
    - Options flow data is delayed or incomplete
---

## Procedure

1. Query the news aggregation service for articles mentioning the specified asset within the lookback window (default 24 hours).
2. Apply NLP-based sentiment classification to each news article, producing a score from -1 (extremely bearish) to 1 (extremely bullish). Weight by source credibility and recency.
3. Query social media feeds (Twitter/X, Reddit, StockTwits) for mentions of the asset. Apply the same sentiment classification with additional sarcasm detection.
4. Retrieve options flow data: compute the put/call ratio, track unusual options activity, and derive an options flow sentiment score based on net premium direction.
5. Compute source-level scores as weighted averages:
   - News score: credibility-weighted mean of article sentiments
   - Social score: engagement-weighted mean of post sentiments
   - Options flow score: normalized net premium direction
6. Compute the composite score as a weighted blend: 40% news + 25% social + 35% options_flow.
7. Determine the sentiment trend by comparing current composite score to the score from 12 hours ago:
   - Improving: delta > 0.1
   - Deteriorating: delta < -0.1
   - Stable: otherwise
8. Extract the top 3 key narratives by clustering news and social content by topic.
9. Compute confidence based on data volume: higher article/post counts and more recent data yield higher confidence.
10. Return the complete sentiment report.

## Reasoning

Sentiment Analysis is a standalone data-gathering skill that provides an orthogonal signal to price-based quantitative methods. It has no required dependencies because it draws from external data sources (news, social, options) rather than from other skills. Its moderate priority of 0.5 reflects that sentiment alone is rarely sufficient for trading decisions but is valuable as an input to Entry Signal Generation where it can confirm or contradict technical signals.

## References

- [[Entry Signal Generation]] - consumes sentiment as a signal component
- [[Market Regime Detection]] - sentiment shifts can precede regime changes
