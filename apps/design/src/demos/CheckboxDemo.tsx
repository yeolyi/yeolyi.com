import Checkbox from "@yeolyi/ui/Checkbox";

export default function CheckboxDemo() {
  return (
    <div className="flex flex-wrap gap-6">
      <Checkbox defaultChecked>새 글</Checkbox>
      <Checkbox>댓글</Checkbox>
    </div>
  );
}
