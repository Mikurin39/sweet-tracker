import Anthropic from "@anthropic-ai/sdk";

// Server-side only. Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();
