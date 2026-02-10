import { InitialPromptNode } from "./InitialPromptNode";
import { PromptEnhancerNode } from "./PromptEnhancerNode";
import { GroupNode } from "./GroupNode";
import { TranslatorNode } from "./TranslatorNode";
import { ImageDescriberNode } from "./ImageDescriberNode";
import { TextOutputNode } from "./TextOutputNode";
import { ConsistentCharacterNode } from "./ConsistentCharacterNode";
import { StoryTellerNode } from "./StoryTellerNode";

export const nodeTypes = {
  initialPrompt: InitialPromptNode,
  promptEnhancer: PromptEnhancerNode,
  group: GroupNode,
  translator: TranslatorNode,
  imageDescriber: ImageDescriberNode,
  textOutput: TextOutputNode,
  consistentCharacter: ConsistentCharacterNode,
  storyTeller: StoryTellerNode,
};
