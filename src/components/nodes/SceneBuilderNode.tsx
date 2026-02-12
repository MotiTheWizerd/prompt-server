import { useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { CloudSun } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { NodeSettingsPopover } from "./NodeSettingsPopover";
import { useFlowStore } from "@/store/flow-store";
import { SCENE_OPTIONS, type SceneCategory } from "@/lib/scene-prompts";

const selectClass =
  "w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-sky-500/50";

const CATEGORY_ORDER: SceneCategory[] = [
  "imageStyle", "lighting", "timeOfDay", "weather",
  "cameraAngle", "cameraLens", "mood",
];

function SceneSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 mb-0.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">— none —</option>
        {Object.keys(options).map((key) => (
          <option key={key} value={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SceneBuilderNode({ id, data }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const runFromNode = useFlowStore((s) => s.runFromNode);
  const status = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeStatus[id] || "idle");
  const errorMessage = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.error);
  const outputText = useFlowStore((s) => s.flows[s.activeFlowId]?.execution.nodeOutputs[id]?.text);
  const set = (key: string, value: string) => updateNodeData(id, { [key]: value });
  const userProviderId = data.providerId as string | undefined;
  const userModel = data.model as string | undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative">
      <BaseNode
        title="Scene Builder"
        icon={<CloudSun className="w-4 h-4 text-sky-400" />}
        color="ring-sky-500/30"
        hasInput={false}
        hasOutput={true}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onTrigger={() => runFromNode(id)}
        status={status}
        errorMessage={errorMessage}
        outputText={outputText}
      >
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500">
            Build a scene atmosphere description
          </div>
          {CATEGORY_ORDER.map((key) => {
            const config = SCENE_OPTIONS[key];
            return (
              <SceneSelect
                key={key}
                label={config.label}
                value={(data[key] as string) || ""}
                options={config.options}
                onChange={(v) => set(key, v)}
              />
            );
          })}
        </div>
      </BaseNode>
      {settingsOpen && (
        <NodeSettingsPopover
          nodeType="sceneBuilder"
          providerId={userProviderId}
          model={userModel}
          onProviderChange={(pid) => updateNodeData(id, { providerId: pid })}
          onModelChange={(m) => updateNodeData(id, { model: m || undefined })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
