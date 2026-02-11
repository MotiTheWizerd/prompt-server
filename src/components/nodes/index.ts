import { InitialPromptNode } from "./InitialPromptNode";
import { PromptEnhancerNode } from "./PromptEnhancerNode";
import { GroupNode } from "./GroupNode";
import { TranslatorNode } from "./TranslatorNode";
import { ImageDescriberNode } from "./ImageDescriberNode";
import { TextOutputNode } from "./TextOutputNode";
import { ConsistentCharacterNode } from "./ConsistentCharacterNode";
import { StoryTellerNode } from "./StoryTellerNode";
import { GrammarFixNode } from "./GrammarFixNode";
import { SceneBuilderNode } from "./SceneBuilderNode";
import { CompressorNode } from "./CompressorNode";
import { ImageGeneratorNode } from "./ImageGeneratorNode";
import { PersonasReplacerNode } from "./PersonasReplacerNode";

export const nodeTypes = {
  initialPrompt: InitialPromptNode,
  promptEnhancer: PromptEnhancerNode,
  group: GroupNode,
  translator: TranslatorNode,
  imageDescriber: ImageDescriberNode,
  textOutput: TextOutputNode,
  consistentCharacter: ConsistentCharacterNode,
  storyTeller: StoryTellerNode,
  grammarFix: GrammarFixNode,
  sceneBuilder: SceneBuilderNode,
  compressor: CompressorNode,
  imageGenerator: ImageGeneratorNode,
  personasReplacer: PersonasReplacerNode,
};
