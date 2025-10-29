import { Injectable } from "@nestjs/common";
import { BannedWordRepository } from "../repositories/comment.repository";
import {
  BannedWord,
  BannedWordAction,
  BannedWordSeverity,
} from "../entities/comment.entity";

export interface ContentFilterResult {
  filteredContent: string;
  hasViolations: boolean;
  violations: string[];
  action: "allow" | "filter" | "block" | "flag";
  severity: BannedWordSeverity | null;
}

@Injectable()
export class ContentFilterService {
  private bannedWordsCache: BannedWord[] = [];
  private lastCacheUpdate = 0;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(private bannedWordRepository: BannedWordRepository) {
    this.loadBannedWords();
  }

  // ✅ MAIN CONTENT FILTERING METHOD
  async filterContent(content: string): Promise<ContentFilterResult> {
    await this.ensureCacheUpdated();

    const violations: string[] = [];
    let filteredContent = content;
    let highestSeverity: BannedWordSeverity | null = null;
    let mostRestrictiveAction: BannedWordAction = BannedWordAction.FILTER;

    // Check each banned word
    for (const bannedWord of this.bannedWordsCache) {
      const regex = new RegExp(
        `\\b${this.escapeRegex(bannedWord.word)}\\b`,
        "gi"
      );

      if (regex.test(content)) {
        violations.push(bannedWord.word);

        // Track highest severity
        if (
          !highestSeverity ||
          this.getSeverityLevel(bannedWord.severity) >
            this.getSeverityLevel(highestSeverity)
        ) {
          highestSeverity = bannedWord.severity;
        }

        // Track most restrictive action
        if (
          this.getActionLevel(bannedWord.action) >
          this.getActionLevel(mostRestrictiveAction)
        ) {
          mostRestrictiveAction = bannedWord.action;
        }

        // Apply filtering based on action
        switch (bannedWord.action) {
          case BannedWordAction.FILTER:
            filteredContent = filteredContent.replace(
              regex,
              this.generateReplacement(bannedWord.word)
            );
            break;
          case BannedWordAction.BLOCK:
            // Don't filter content for blocked words, just mark for blocking
            break;
          case BannedWordAction.FLAG:
            // Keep original content but flag for review
            break;
        }
      }
    }

    // Determine final action
    let finalAction: "allow" | "filter" | "block" | "flag" = "allow";
    if (violations.length > 0) {
      switch (mostRestrictiveAction) {
        case BannedWordAction.BLOCK:
          finalAction = "block";
          break;
        case BannedWordAction.FLAG:
          finalAction = "flag";
          break;
        case BannedWordAction.FILTER:
          finalAction = "filter";
          break;
      }
    }

    // Additional spam detection
    const spamCheck = this.detectSpam(content);
    if (spamCheck.isSpam) {
      violations.push(...spamCheck.reasons);
      if (finalAction === "allow") {
        finalAction = "flag";
      }
    }

    return {
      filteredContent,
      hasViolations: violations.length > 0,
      violations,
      action: finalAction,
      severity: highestSeverity,
    };
  }

  // ✅ SPAM DETECTION
  private detectSpam(content: string): { isSpam: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check for excessive capitalization
    const upperCaseRatio =
      (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.7 && content.length > 10) {
      reasons.push("excessive_caps");
    }

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    const maxRepetition = Math.max(...Array.from(wordCount.values()));
    if (maxRepetition > 5) {
      reasons.push("word_repetition");
    }

    // Check for excessive punctuation
    const punctuationCount = (content.match(/[!?]{3,}/g) || []).length;
    if (punctuationCount > 0) {
      reasons.push("excessive_punctuation");
    }

    // Check for URL patterns (basic)
    const urlPattern = /https?:\/\/|www\.|\.com|\.org|\.net/gi;
    if (urlPattern.test(content)) {
      reasons.push("contains_url");
    }

    // Check for email patterns
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailPattern.test(content)) {
      reasons.push("contains_email");
    }

    return {
      isSpam: reasons.length > 0,
      reasons,
    };
  }

  // ✅ ADMIN METHODS FOR BANNED WORDS
  async addBannedWord(
    word: string,
    severity: BannedWordSeverity,
    action: BannedWordAction,
    createdBy?: number
  ): Promise<BannedWord> {
    const bannedWord = await this.bannedWordRepository.addWord(
      word,
      severity,
      action,
      createdBy
    );
    await this.loadBannedWords(); // Refresh cache
    return bannedWord;
  }

  async removeBannedWord(id: number): Promise<boolean> {
    const result = await this.bannedWordRepository.removeWord(id);
    if (result) {
      await this.loadBannedWords(); // Refresh cache
    }
    return result;
  }

  async getBannedWords(): Promise<BannedWord[]> {
    await this.ensureCacheUpdated();
    return this.bannedWordsCache;
  }

  async getBannedWordsByAction(
    action: BannedWordAction
  ): Promise<BannedWord[]> {
    return await this.bannedWordRepository.findByAction(action);
  }

  // ✅ CACHE MANAGEMENT
  private async loadBannedWords(): Promise<void> {
    this.bannedWordsCache = await this.bannedWordRepository.findAll();
    this.lastCacheUpdate = Date.now();
  }

  private async ensureCacheUpdated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      await this.loadBannedWords();
    }
  }

  // ✅ HELPER METHODS
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private generateReplacement(word: string): string {
    // Replace with asterisks of same length
    return "*".repeat(word.length);
  }

  private getSeverityLevel(severity: BannedWordSeverity): number {
    switch (severity) {
      case BannedWordSeverity.LOW:
        return 1;
      case BannedWordSeverity.MEDIUM:
        return 2;
      case BannedWordSeverity.HIGH:
        return 3;
      default:
        return 0;
    }
  }

  private getActionLevel(action: BannedWordAction): number {
    switch (action) {
      case BannedWordAction.FILTER:
        return 1;
      case BannedWordAction.FLAG:
        return 2;
      case BannedWordAction.BLOCK:
        return 3;
      default:
        return 0;
    }
  }

  // ✅ VALIDATION METHODS
  validateCommentLength(content: string): {
    isValid: boolean;
    message?: string;
  } {
    const minLength = 1;
    const maxLength = 2000;

    if (content.length < minLength) {
      return { isValid: false, message: "Comment is too short" };
    }

    if (content.length > maxLength) {
      return {
        isValid: false,
        message: `Comment exceeds maximum length of ${maxLength} characters`,
      };
    }

    return { isValid: true };
  }

  // Rate limiting helper (to be used with Redis in production)
  validateUserRateLimit(userId: number): {
    isValid: boolean;
    message?: string;
  } {
    // This would typically check Redis for user's recent comment count
    // For now, return true - implement with actual rate limiting later
    return { isValid: true };
  }

  // Content analysis for metrics
  analyzeContent(content: string): {
    wordCount: number;
    characterCount: number;
    sentiment: "positive" | "negative" | "neutral";
    readabilityScore: number;
  } {
    const words = content.trim().split(/\s+/);
    const wordCount = words.length;
    const characterCount = content.length;

    // Simple sentiment analysis (would use more sophisticated analysis in production)
    const positiveWords = [
      "good",
      "great",
      "amazing",
      "awesome",
      "love",
      "excellent",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "horrible",
      "disgusting",
      "worst",
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach((word) => {
      const lowerWord = word.toLowerCase();
      if (positiveWords.includes(lowerWord)) positiveScore++;
      if (negativeWords.includes(lowerWord)) negativeScore++;
    });

    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (positiveScore > negativeScore) {
      sentiment = "positive";
    } else if (negativeScore > positiveScore) {
      sentiment = "negative";
    }

    // Simple readability score (average word length)
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / wordCount;
    const readabilityScore = Math.max(
      0,
      Math.min(100, 100 - (avgWordLength - 4) * 10)
    );

    return {
      wordCount,
      characterCount,
      sentiment,
      readabilityScore: Math.round(readabilityScore),
    };
  }
}
