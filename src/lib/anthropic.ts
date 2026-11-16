import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { mapLimit } from "@/lib/concurrency";

export type TokenCounter = (texts: string[]) => Promise<number[]>;

const COUNT_MODEL = "claude-opus-5-5";

/**
 * Accurate token counting with Anthropic's Token Count API. Only created when
 * the user has opted in and supplied their own key; the key is used for this
 * request and never stored or logged.
 */
export function createAnthropicCounter(apiKey: string): TokenCounter {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 20_000 });
  return (texts) =>
    mapLimit(texts, 4, async (text) => {
      if (!text.trim()) return 0;
      const result = await client.messages.countTokens({
        model: COUNT_MODEL,
        messages: [{ role: "user", content: text }],
      });
      return result.input_tokens;
    });
}
