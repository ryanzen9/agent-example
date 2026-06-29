const memory = new Map<string, any>();

export const memoryString = (): string => {
  return JSON.stringify(Array.from(memory.entries()));
};

export const getMemoryPrompt = (): string[] => {
  return Array.from(memory.keys());
};

export const writeMemory = (key: string, value: any): string => {
  if (!key || value === undefined) {
    return "错误: 缺少 key 或 value 参数。";
  }

  try {
    memory.set(key, value);
    return `已将信息写入记忆: ${key} = ${value}`;
  } catch (error) {
    return `错误: 写入记忆时发生异常: ${formatError(error)}`;
  }
};

export const readMemory = (key: string): string => {
  if (!key) {
    return "错误: 缺少 key 参数。";
  }

  try {
    if (!memory.has(key)) {
      return `错误: 未找到键名为 ${key} 的记忆。`;
    }
    const value = memory.get(key);
    return `从记忆中读取到的信息: ${key} = ${value}`;
  } catch (error) {
    return `错误: 读取记忆时发生异常: ${formatError(error)}`;
  }
};

export const clearMemory = (): string => {
  try {
    memory.clear();
    return "已清空所有记忆。";
  } catch (error) {
    return `错误: 清空记忆时发生异常: ${formatError(error)}`;
  }
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
