"""
Embedding service for generating text embeddings with Redis caching.

Provides text-to-vector conversion using LiteLLM proxy gateway with OpenAI's
text-embedding-3-small model (1536 dimensions) with Redis caching to reduce API
costs and improve performance.

All embedding requests route through LiteLLM proxy for centralized cost tracking
and budget enforcement.

Story 8.15: Memory Configuration UI - Embedding Service (Task 7)
"""

import hashlib
import json
from typing import List, Optional

import redis.asyncio as redis
from openai import AsyncOpenAI, APIError, APIConnectionError, APITimeoutError

from src.config import settings
from src.utils.logger import logger


class EmbeddingService:
    """
    Service for generating text embeddings with caching via LiteLLM proxy.

    Routes embedding requests through LiteLLM proxy gateway using OpenAI's
    text-embedding-3-small model (1536 dimensions) with Redis cache to minimize
    API costs. All requests are tracked under tenant's budget and cost tracking.
    """

    # OpenAI embedding model configuration
    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS = 1536
    CACHE_TTL = 86400 * 7  # 7 days in seconds
    CACHE_PREFIX = "embedding:"

    def __init__(
        self,
        litellm_proxy_url: Optional[str] = None,
        litellm_master_key: Optional[str] = None,
        redis_url: Optional[str] = None,
    ):
        """
        Initialize embedding service with LiteLLM proxy.

        Routes all embedding requests through LiteLLM proxy gateway instead of
        directly calling OpenAI API. This ensures centralized cost tracking and
        budget enforcement.

        Args:
            litellm_proxy_url: LiteLLM proxy URL (defaults to settings.litellm_proxy_url)
            litellm_master_key: LiteLLM master key (defaults to settings.litellm_master_key)
            redis_url: Redis connection URL (defaults to settings.redis_url)

        Raises:
            ValueError: If LiteLLM proxy configuration missing
        """
        self.litellm_proxy_url = litellm_proxy_url or getattr(
            settings, "litellm_proxy_url", "http://litellm:4000"
        )
        self.litellm_master_key = litellm_master_key or getattr(
            settings, "litellm_master_key", None
        )

        if not self.litellm_proxy_url:
            raise ValueError(
                "LiteLLM proxy URL is required (LITELLM_PROXY_URL). "
                "Set AI_AGENTS_LITELLM_PROXY_URL environment variable."
            )

        if not self.litellm_master_key:
            raise ValueError(
                "LiteLLM master key is required (LITELLM_MASTER_KEY). "
                "Set AI_AGENTS_LITELLM_MASTER_KEY environment variable."
            )

        # Initialize AsyncOpenAI client pointing to LiteLLM proxy (not OpenAI directly)
        self.client = AsyncOpenAI(
            api_key=self.litellm_master_key,
            base_url=f"{self.litellm_proxy_url}/v1",
        )

        # Initialize Redis cache (optional)
        self.redis_url = redis_url or getattr(settings, "redis_url", None)
        self.redis_client: Optional[redis.Redis] = None

        if self.redis_url:
            try:
                self.redis_client = redis.from_url(
                    self.redis_url, encoding="utf-8", decode_responses=True
                )
                logger.info("EmbeddingService: Redis cache initialized")
            except Exception as e:
                logger.warning(
                    f"EmbeddingService: Failed to initialize Redis cache: {e}. Proceeding without cache."
                )
                self.redis_client = None
        else:
            logger.warning(
                "EmbeddingService: Redis URL not configured. Proceeding without cache."
            )

    def _cache_key(self, text: str) -> str:
        """
        Generate cache key from text using SHA-256 hash.

        Args:
            text: Input text to hash

        Returns:
            str: Cache key with prefix
        """
        # Reason: Use SHA-256 hash to handle long texts and ensure consistent key length
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"{self.CACHE_PREFIX}{text_hash}"

    async def _get_cached_embedding(self, text: str) -> Optional[str]:
        """
        Retrieve cached embedding from Redis.

        Args:
            text: Input text to lookup

        Returns:
            Optional[str]: Cached embedding as JSON string or None if not found
        """
        if not self.redis_client:
            return None

        try:
            cache_key = self._cache_key(text)
            cached = await self.redis_client.get(cache_key)

            if cached:
                logger.debug(f"EmbeddingService: Cache hit for text hash {cache_key}")
                return cached

        except Exception as e:
            logger.warning(f"EmbeddingService: Redis cache read error: {e}")

        return None

    async def _cache_embedding(self, text: str, embedding: str) -> None:
        """
        Store embedding in Redis cache with TTL.

        Args:
            text: Input text (used for cache key generation)
            embedding: Embedding vector as JSON string
        """
        if not self.redis_client:
            return

        try:
            cache_key = self._cache_key(text)
            await self.redis_client.setex(cache_key, self.CACHE_TTL, embedding)
            logger.debug(
                f"EmbeddingService: Cached embedding for text hash {cache_key}"
            )

        except Exception as e:
            logger.warning(f"EmbeddingService: Redis cache write error: {e}")

    async def generate_embedding(self, text: str) -> Optional[str]:
        """
        Generate embedding for text with caching.

        Uses OpenAI text-embedding-3-small model (1536 dimensions).
        Checks Redis cache first, generates embedding if cache miss,
        then caches result for future requests.

        Args:
            text: Input text to embed (max 8192 tokens for text-embedding-3-small)

        Returns:
            Optional[str]: Embedding vector as JSON string (list of 1536 floats) or None if error

        Raises:
            ValueError: If text is empty or exceeds token limit
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Reason: Truncate very long texts to avoid token limit errors (8192 tokens ~ 32768 chars)
        if len(text) > 32768:
            logger.warning(
                f"EmbeddingService: Text truncated from {len(text)} to 32768 chars"
            )
            text = text[:32768]

        # Check cache first
        cached_embedding = await self._get_cached_embedding(text)
        if cached_embedding:
            return cached_embedding

        # Generate embedding via LiteLLM proxy
        try:
            response = await self.client.embeddings.create(
                model=self.EMBEDDING_MODEL, input=text, dimensions=self.EMBEDDING_DIMENSIONS
            )

            # Extract embedding vector (list of floats)
            embedding_vector = response.data[0].embedding

            # Reason: Serialize to JSON string for PostgreSQL TEXT storage
            embedding_json = json.dumps(embedding_vector)

            # Cache for future requests
            await self._cache_embedding(text, embedding_json)

            logger.info(
                f"EmbeddingService: Generated embedding ({self.EMBEDDING_DIMENSIONS} dims) via LiteLLM proxy for text (length: {len(text)})"
            )

            return embedding_json

        except APIConnectionError as e:
            logger.error(
                f"EmbeddingService: LiteLLM proxy connection error: {e}"
            )
            return None

        except APITimeoutError as e:
            logger.error(
                f"EmbeddingService: LiteLLM proxy timeout: {e}"
            )
            return None

        except APIError as e:
            logger.error(
                f"EmbeddingService: LiteLLM proxy API error: {e}"
            )
            return None

        except Exception as e:
            logger.error(
                f"EmbeddingService: Unexpected error generating embedding via LiteLLM proxy: {e}"
            )
            return None

    async def batch_embeddings(self, texts: List[str]) -> List[Optional[str]]:
        """
        Generate embeddings for multiple texts in batch.

        Processes texts individually to maintain cache effectiveness
        (OpenAI batch API doesn't reduce costs significantly for embeddings).

        Args:
            texts: List of input texts

        Returns:
            List[Optional[str]]: List of embedding JSON strings (None for errors)

        Raises:
            ValueError: If texts list is empty
        """
        if not texts:
            raise ValueError("Texts list cannot be empty")

        logger.info(f"EmbeddingService: Batch generating embeddings for {len(texts)} texts")

        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)

        success_count = sum(1 for e in embeddings if e is not None)
        logger.info(
            f"EmbeddingService: Batch complete - {success_count}/{len(texts)} successful"
        )

        return embeddings

    async def close(self) -> None:
        """
        Close Redis connection gracefully.

        Should be called on application shutdown.
        """
        if self.redis_client:
            await self.redis_client.close()
            logger.info("EmbeddingService: Redis connection closed")
