export function parseAction(llmOutput: string): string | null {
  const actionLine = llmOutput
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Action:"));

  if (!actionLine) {
    return null;
  }

  return actionLine.replace(/^Action:\s*/, "").trim();
}

export function parseFinish(action: string): string | null {
  const match = action.match(/^Finish\[(.*)\]$/s);

  if (!match) {
    return null;
  }

  return match[1]!.trim();
}

export function parseToolCall(action: string): {
  toolName: string;
  args: Record<string, string>;
} | null {
  const match = action.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/s);

  if (!match) {
    return null;
  }

  const [, toolName, rawArgs] = match;

  if (!toolName) {
    return null;
  }

  const args: Record<string, string> = {};

  const argRegex = /([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g;

  if (rawArgs) {
    for (const argMatch of rawArgs.matchAll(argRegex)) {
      const [, key, value] = argMatch;
      if (key && value !== undefined) {
        args[key] = value;
      }
    }
  }

  return {
    toolName,
    args,
  };
}

export function normalizeLLMOutput(output: string): string {
  const thoughtIndex = output.indexOf("Thought:");
  const actionIndex = output.indexOf("Action:");

  if (thoughtIndex === -1 || actionIndex === -1) {
    return output.trim();
  }

  const afterAction = output.slice(actionIndex);
  const nextThoughtIndex = afterAction.indexOf("Thought:");

  if (nextThoughtIndex === -1) {
    return output.trim();
  }

  return output.slice(0, actionIndex + nextThoughtIndex).trim();
}
