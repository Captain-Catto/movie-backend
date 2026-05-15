import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { In, MoreThan, Repository } from "typeorm";
import {
  ChatMessage,
  ChatMessageRole,
  ChatModerationFlag,
  ChatModerationSeverity,
  ChatModerationStatus,
  ChatSession,
  ChatSessionStatus,
  ContentTranslation,
  Favorite,
  Movie,
  RecentSearch,
  Trending,
  TVSeries,
  User,
  ViewAnalytics,
} from "../entities";

type ContentType = "movie" | "tv";

interface RecommendationItem {
  tmdbId: number;
  type: ContentType;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  popularity: number;
  genreIds: number[];
  href: string;
}

interface ModerationResult {
  flagged: boolean;
  reason?: string;
  severity?: ChatModerationSeverity;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatModerationFlag)
    private readonly flagRepository: Repository<ChatModerationFlag>,
    @InjectRepository(ContentTranslation)
    private readonly translationRepository: Repository<ContentTranslation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(ViewAnalytics)
    private readonly analyticsRepository: Repository<ViewAnalytics>,
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private readonly tvRepository: Repository<TVSeries>,
    @InjectRepository(Trending)
    private readonly trendingRepository: Repository<Trending>,
    private readonly configService: ConfigService
  ) {}

  async createOrGetSession(userId: number) {
    await this.assertActiveUser(userId);

    const existing = await this.sessionRepository.findOne({
      where: { userId, status: ChatSessionStatus.ACTIVE },
      order: { updatedAt: "DESC" },
    });

    if (existing) {
      return existing;
    }

    return this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        title: "Movie assistant",
        status: ChatSessionStatus.ACTIVE,
      })
    );
  }

  async createSession(userId: number) {
    await this.assertActiveUser(userId);

    return this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        title: "Movie assistant",
        status: ChatSessionStatus.ACTIVE,
      })
    );
  }

  async getUserSessions(userId: number) {
    await this.assertActiveUser(userId);

    return this.sessionRepository.find({
      where: { userId },
      order: { updatedAt: "DESC" },
      take: 20,
    });
  }

  async getSessionMessages(userId: number, sessionId: number) {
    await this.assertSessionOwner(userId, sessionId);

    return this.messageRepository.find({
      where: { userId, sessionId },
      order: { createdAt: "ASC" },
      take: 100,
    });
  }

  async sendMessage(
    userId: number,
    sessionId: number,
    content: string,
    language = "en-US"
  ) {
    const session = await this.assertSessionOwner(userId, sessionId);
    await this.assertDailyLimit(userId);

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        userId,
        sessionId,
        role: ChatMessageRole.USER,
        content: content.trim(),
        metadata: null,
      })
    );

    const moderation = this.moderateMessage(content);
    if (moderation.flagged) {
      await this.createFlag(
        userId,
        sessionId,
        userMessage.id,
        moderation.reason || "Potential policy abuse",
        moderation.severity || ChatModerationSeverity.LOW
      );
    }

    const [history, shortlist] = await Promise.all([
      this.getContextMessages(userId, sessionId),
      this.buildShortlist(userId, content, language),
    ]);

    const aiResult = await this.generateGeminiResponse(
      content,
      history,
      shortlist,
      language
    );
    const reply = aiResult.reply || this.buildFallbackReply(shortlist);
    const recommendations = this.filterRecommendations(
      aiResult.recommendations,
      shortlist
    );

    const assistantMessage = await this.messageRepository.save(
      this.messageRepository.create({
        userId,
        sessionId,
        role: ChatMessageRole.ASSISTANT,
        content: reply,
        metadata: {
          recommendations,
          followUpQuestions: aiResult.followUpQuestions || [],
          source: aiResult.source,
        },
      })
    );

    if (!session.title || session.title === "Movie assistant") {
      session.title = this.buildSessionTitle(content);
    }
    await this.sessionRepository.save(session);

    return {
      userMessage,
      message: assistantMessage,
      reply,
      recommendations,
      followUpQuestions: aiResult.followUpQuestions || [],
      flagged: moderation.flagged,
    };
  }

  async getFlags(status?: ChatModerationStatus) {
    return this.flagRepository.find({
      where: status ? { status } : undefined,
      relations: ["user", "message"],
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async getAdminSession(sessionId: number) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["user"],
    });

    if (!session) {
      throw new NotFoundException("Chat session not found");
    }

    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: "ASC" },
    });
    const flags = await this.flagRepository.find({
      where: { sessionId },
      order: { createdAt: "DESC" },
    });

    return { session, messages, flags };
  }

  async resolveFlag(
    flagId: number,
    adminId: number,
    status: ChatModerationStatus.RESOLVED | ChatModerationStatus.IGNORED,
    note?: string
  ) {
    const flag = await this.flagRepository.findOne({ where: { id: flagId } });
    if (!flag) {
      throw new NotFoundException("Moderation flag not found");
    }

    flag.status = status;
    flag.reviewedBy = adminId;
    flag.reviewedAt = new Date();
    if (note) {
      flag.reason = `${flag.reason}\nReview note: ${note}`;
    }

    return this.flagRepository.save(flag);
  }

  private async assertActiveUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new ForbiddenException("Chat is unavailable for this account");
    }
  }

  private async assertSessionOwner(userId: number, sessionId: number) {
    await this.assertActiveUser(userId);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException("Chat session not found");
    }

    return session;
  }

  private async assertDailyLimit(userId: number) {
    const limit = Number(
      this.configService.get("CHAT_DAILY_MESSAGE_LIMIT") || 100
    );
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const count = await this.messageRepository.count({
      where: {
        userId,
        role: ChatMessageRole.USER,
        createdAt: MoreThan(since),
      },
    });

    if (count >= limit) {
      throw new HttpException("Daily chat limit reached", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private moderateMessage(message: string): ModerationResult {
    const text = message.toLowerCase();
    const highRisk = [
      "ignore previous instructions",
      "jailbreak",
      "system prompt",
      "developer message",
      "api key",
      "token",
      "hack",
      "bypass",
    ];
    const illegal = [
      "child sexual",
      "csam",
      "make a bomb",
      "credit card dump",
      "steal password",
    ];

    if (illegal.some((keyword) => text.includes(keyword))) {
      return {
        flagged: true,
        reason: "High-risk illegal or abusive AI request",
        severity: ChatModerationSeverity.HIGH,
      };
    }

    if (highRisk.some((keyword) => text.includes(keyword))) {
      return {
        flagged: true,
        reason: "Potential prompt injection or abuse attempt",
        severity: ChatModerationSeverity.MEDIUM,
      };
    }

    const repeated = /(.)\1{12,}/.test(message);
    if (repeated || message.length > 1800) {
      return {
        flagged: true,
        reason: "Potential spam or excessive message length",
        severity: ChatModerationSeverity.LOW,
      };
    }

    return { flagged: false };
  }

  private async createFlag(
    userId: number,
    sessionId: number,
    messageId: number,
    reason: string,
    severity: ChatModerationSeverity
  ) {
    return this.flagRepository.save(
      this.flagRepository.create({
        userId,
        sessionId,
        messageId,
        reason,
        severity,
        status: ChatModerationStatus.OPEN,
      })
    );
  }

  private async getContextMessages(userId: number, sessionId: number) {
    const limit = Number(
      this.configService.get("CHAT_CONTEXT_MESSAGE_LIMIT") || 20
    );
    const messages = await this.messageRepository.find({
      where: { userId, sessionId },
      order: { createdAt: "DESC" },
      take: limit,
    });

    return messages.reverse().map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  private async buildShortlist(
    userId: number,
    message: string,
    language: string
  ): Promise<RecommendationItem[]> {
    const [favorites, analytics, searches] = await Promise.all([
      this.favoriteRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
        take: 50,
      }),
      this.analyticsRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
        take: 80,
      }),
      this.recentSearchRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
        take: 20,
      }),
    ]);

    const favoriteMovieIds = favorites
      .filter((item) => item.contentType === "movie")
      .map((item) => Number(item.contentId))
      .filter(Boolean);
    const favoriteTvIds = favorites
      .filter((item) => item.contentType === "tv")
      .map((item) => Number(item.contentId))
      .filter(Boolean);
    const analyticsMovieIds = analytics
      .filter((item) => item.contentType === "movie")
      .map((item) => Number(item.contentId))
      .filter(Boolean);
    const analyticsTvIds = analytics
      .filter((item) => item.contentType === "tv_series")
      .map((item) => Number(item.contentId))
      .filter(Boolean);

    const [likedMovies, likedTv] = await Promise.all([
      favoriteMovieIds.concat(analyticsMovieIds).length
        ? this.movieRepository.find({
            where: { tmdbId: In([...favoriteMovieIds, ...analyticsMovieIds]) },
            take: 80,
          })
        : [],
      favoriteTvIds.concat(analyticsTvIds).length
        ? this.tvRepository.find({
            where: { tmdbId: In([...favoriteTvIds, ...analyticsTvIds]) },
            take: 80,
          })
        : [],
    ]);

    const genreScores = new Map<number, number>();
    for (const item of [...likedMovies, ...likedTv]) {
      for (const genreId of item.genreIds || []) {
        genreScores.set(genreId, (genreScores.get(genreId) || 0) + 1);
      }
    }

    const wantsTv = /\b(tv|series|phim bộ|show|episode|season)\b/i.test(message);
    const wantsMovie = /\b(movie|film|phim lẻ|phim)\b/i.test(message) && !wantsTv;
    const wantsFresh = /\b(new|mới|khác|chưa xem|fresh)\b/i.test(message);
    const excluded = new Set(
      wantsFresh
        ? favorites.map((item) => `${item.contentType}:${item.contentId}`)
        : []
    );

    const [movies, tv, trending] = await Promise.all([
      wantsTv
        ? []
        : this.movieRepository.find({
            where: { isBlocked: false },
            order: { popularity: "DESC" },
            take: 80,
          }),
      wantsMovie
        ? []
        : this.tvRepository.find({
            where: { isBlocked: false },
            order: { popularity: "DESC" },
            take: 80,
          }),
      this.trendingRepository.find({
        where: { isHidden: false },
        order: { popularity: "DESC" },
        take: 50,
      }),
    ]);

    const searchTerms = searches.map((search) => search.query.toLowerCase());
    const candidates = [
      ...movies.map((item) => this.mapMovie(item)),
      ...tv.map((item) => this.mapTv(item)),
      ...trending.map((item) => this.mapTrending(item)),
    ].filter(
      (item) =>
        item.posterPath &&
        !excluded.has(`${item.type}:${item.tmdbId}`) &&
        item.title
    );

    const seen = new Set<string>();
    const shortlist = candidates
      .filter((item) => {
        const key = `${item.type}:${item.tmdbId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        item,
        score:
          Number(item.popularity || 0) +
          Number(item.voteAverage || 0) * 5 +
          (item.genreIds || []).reduce(
            (sum, genreId) => sum + (genreScores.get(genreId) || 0) * 20,
            0
          ) +
          (searchTerms.some((term) => item.title.toLowerCase().includes(term))
            ? 35
            : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ item }) => item);

    await this.applyTranslations(shortlist, language);
    return shortlist;
  }

  private async generateGeminiResponse(
    message: string,
    history: Array<{ role: string; content: string }>,
    shortlist: RecommendationItem[],
    language: string
  ): Promise<{
    reply: string;
    recommendations: Array<{ tmdbId: number; type: ContentType }>;
    followUpQuestions: string[];
    source: "gemini" | "fallback";
  }> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return {
        reply: this.buildFallbackReply(shortlist),
        recommendations: shortlist.slice(0, 5),
        followUpQuestions: ["Bạn muốn phim nhẹ nhàng hay căng thẳng hơn?"],
        source: "fallback",
      };
    }

    const model = this.configService.get<string>("GEMINI_MODEL") || "gemini-1.5-flash";
    const prompt = this.buildPrompt(message, history, shortlist, language);

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.6,
            maxOutputTokens: 900,
          },
        },
        { timeout: 12000 }
      );

      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(text);

      return {
        reply:
          typeof parsed.reply === "string"
            ? parsed.reply
            : this.buildFallbackReply(shortlist),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : shortlist.slice(0, 5),
        followUpQuestions: Array.isArray(parsed.followUpQuestions)
          ? parsed.followUpQuestions.filter((item) => typeof item === "string")
          : [],
        source: "gemini",
      };
    } catch {
      return {
        reply: this.buildFallbackReply(shortlist),
        recommendations: shortlist.slice(0, 5),
        followUpQuestions: ["Bạn thích thể loại nào hơn để mình lọc sát hơn?"],
        source: "fallback",
      };
    }
  }

  private buildPrompt(
    message: string,
    history: Array<{ role: string; content: string }>,
    shortlist: RecommendationItem[],
    language: string
  ) {
    const responseLanguage = language.toLowerCase().startsWith("vi")
      ? "Vietnamese"
      : "English";

    return JSON.stringify({
      instruction:
        `You are MovieStream's recommendation assistant. Answer in ${responseLanguage}. Only recommend items from shortlist. Return strict JSON with reply, recommendations, followUpQuestions.`,
      language,
      userMessage: message,
      recentConversation: history,
      shortlist: shortlist.map((item) => ({
        tmdbId: item.tmdbId,
        type: item.type,
        title: item.title,
        overview: item.overview,
        voteAverage: item.voteAverage,
        genres: item.genreIds,
      })),
      outputSchema: {
        reply: "string",
        recommendations: [{ tmdbId: "number", type: "movie|tv" }],
        followUpQuestions: ["string"],
      },
    });
  }

  private filterRecommendations(
    requested: Array<{ tmdbId: number; type: ContentType }> | undefined,
    shortlist: RecommendationItem[]
  ) {
    const allowed = new Map(
      shortlist.map((item) => [`${item.type}:${item.tmdbId}`, item])
    );
    const selected = (requested || [])
      .map((item) => allowed.get(`${item.type}:${item.tmdbId}`))
      .filter(Boolean) as RecommendationItem[];

    return (selected.length ? selected : shortlist.slice(0, 5)).slice(0, 6);
  }

  private buildFallbackReply(shortlist: RecommendationItem[]) {
    if (shortlist.length === 0) {
      return "Mình chưa có đủ dữ liệu để gợi ý thật sát. Bạn có thể nói thể loại, diễn viên, hoặc phim bạn thích gần đây không?";
    }

    const names = shortlist
      .slice(0, 3)
      .map((item) => item.title)
      .join(", ");
    return `Dựa trên phim bạn đã quan tâm, mình gợi ý trước ${names}. Các lựa chọn này ưu tiên nội dung đang phổ biến và có điểm tương đồng với lịch sử xem/lưu của bạn.`;
  }

  private buildSessionTitle(content: string) {
    const cleaned = content.trim().replace(/\s+/g, " ");
    return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
  }

  private mapMovie(movie: Movie): RecommendationItem {
    return {
      tmdbId: movie.tmdbId,
      type: "movie",
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      voteAverage: Number(movie.voteAverage || 0),
      popularity: Number(movie.popularity || 0),
      genreIds: movie.genreIds || [],
      href: `/movie/${movie.tmdbId}`,
    };
  }

  private mapTv(tv: TVSeries): RecommendationItem {
    return {
      tmdbId: tv.tmdbId,
      type: "tv",
      title: tv.title,
      overview: tv.overview,
      posterPath: tv.posterPath,
      backdropPath: tv.backdropPath,
      voteAverage: Number(tv.voteAverage || 0),
      popularity: Number(tv.popularity || 0),
      genreIds: tv.genreIds || [],
      href: `/tv/${tv.tmdbId}`,
    };
  }

  private mapTrending(item: Trending): RecommendationItem {
    return {
      tmdbId: item.tmdbId,
      type: item.mediaType === "tv" ? "tv" : "movie",
      title: item.title,
      overview: item.overview,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      voteAverage: Number(item.voteAverage || 0),
      popularity: Number(item.popularity || 0),
      genreIds: item.genreIds || [],
      href: item.mediaType === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`,
    };
  }

  private async applyTranslations(
    items: RecommendationItem[],
    language: string
  ) {
    if (!language.toLowerCase().startsWith("vi") || items.length === 0) {
      return;
    }

    const movieIds = items
      .filter((item) => item.type === "movie")
      .map((item) => item.tmdbId);
    const tvIds = items
      .filter((item) => item.type === "tv")
      .map((item) => item.tmdbId);

    const [movieTranslations, tvTranslations] = await Promise.all([
      movieIds.length
        ? this.translationRepository.find({
            where: {
              tmdbId: In(movieIds),
              contentType: "movie",
              language: In(["vi-VN", "vi"]),
            },
          })
        : [],
      tvIds.length
        ? this.translationRepository.find({
            where: {
              tmdbId: In(tvIds),
              contentType: "tv",
              language: In(["vi-VN", "vi"]),
            },
          })
        : [],
    ]);

    const translations = new Map(
      [...movieTranslations, ...tvTranslations].map((translation) => [
        `${translation.contentType}:${translation.tmdbId}`,
        translation,
      ])
    );

    for (const item of items) {
      const translation = translations.get(`${item.type}:${item.tmdbId}`);
      if (!translation) continue;
      if (translation.title) item.title = translation.title;
      if (translation.overview) item.overview = translation.overview;
    }
  }
}
