import { logger } from "./logger.js";

/**
 * Auto-answer handler for the Copilot SDK's onUserInputRequest callback.
 * In autopilot mode the agent shouldn't ask questions, but if it does,
 * we auto-select the recommended default and log the decision.
 */
export function createAutoAnswerHandler(epicId: string) {
  return async (
    request: { question: string; choices?: string[]; allowFreeform?: boolean },
    _invocation: unknown,
  ): Promise<{ answer: string; wasFreeform: boolean }> => {
    const { question, choices } = request;

    let answer: string;
    let wasFreeform: boolean;

    if (choices && choices.length > 0) {
      // Pick the first choice (typically the recommended default)
      answer = choices[0];
      wasFreeform = false;
      logger.info(
        `Auto-answered question: "${question}" → selected "${answer}" (first of ${choices.length} choices)`,
        epicId,
      );
    } else {
      // Freeform — provide a generic autopilot response
      answer = "Use the recommended default option.";
      wasFreeform = true;
      logger.info(`Auto-answered freeform question: "${question}" → "${answer}"`, epicId);
    }

    return { answer, wasFreeform };
  };
}
