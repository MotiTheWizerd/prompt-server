import { InitialPromptNode } from "./InitialPromptNode";
import { PromptEnhancerNode } from "./PromptEnhancerNode";
import { GroupNode } from "./GroupNode";
import { TranslatorNode } from "./TranslatorNode";
import { ConsistentCharacterNode } from "./ConsistentCharacterNode";
import { TextOutputNode } from "./TextOutputNode";

export const nodeTypes = {
  initialPrompt: InitialPromptNode,
  promptEnhancer: PromptEnhancerNode,
  group: GroupNode,
  translator: TranslatorNode,
  consistentCharacter: ConsistentCharacterNode,
  textOutput: TextOutputNode,
};
