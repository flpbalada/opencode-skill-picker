import type {
  TuiDialogSelectOption,
  TuiPluginApi,
} from "@opencode-ai/plugin/tui";
import { getMaxStringLength } from "../utils/get-max-string-length";
import { normalizeWhitespace } from "../utils/normalize-whitespace";

export interface Skill {
  name: string;
  description?: string;
}

interface SkillDialogProps {
  api: TuiPluginApi;
  skills: Skill[];
  onSelect: (skill: Skill) => void;
}

export function showSkillDialog(
  api: TuiPluginApi,
  skills: Skill[],
  onSelect: (skill: Skill) => void,
  onClose: () => void,
) {
  api.ui.dialog.setSize("xlarge");
  api.ui.dialog.replace(
    () => <SkillDialog api={api} skills={skills} onSelect={onSelect} />,
    onClose,
  );
}

export function SkillDialog(props: SkillDialogProps) {
  const options = createSkillOptions(props.skills);
  const DialogSelect = props.api.ui.DialogSelect;

  return (
    <DialogSelect
      title="Skills"
      placeholder="Search skills..."
      options={options}
      onSelect={(option) => props.onSelect(option.value)}
    />
  );
}

function createSkillOptions(skills: Skill[]): TuiDialogSelectOption<Skill>[] {
  const nameWidth = getMaxStringLength(skills.map((skill) => skill.name));

  return skills.map((skill) => {
    const description = skill.description
      ? normalizeWhitespace(skill.description)
      : undefined;

    return {
      title: skill.name.padEnd(nameWidth),
      description,
      value: skill,
      category: "Skills",
    };
  });
}
