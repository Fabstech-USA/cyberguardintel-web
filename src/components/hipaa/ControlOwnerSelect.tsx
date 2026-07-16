"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ControlOwnerMember = {
  clerkUserId: string;
  name: string | null;
  email: string | null;
};

const UNASSIGNED_VALUE = "__unassigned__";

function memberLabel(member: ControlOwnerMember): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return member.clerkUserId;
}

export function resolveOwnerLabel(
  ownerId: string | null,
  members: readonly ControlOwnerMember[]
): string {
  if (!ownerId) return "Unassigned";
  const member = members.find((m) => m.clerkUserId === ownerId);
  return member ? memberLabel(member) : "Unknown member";
}

type Props = {
  value: string | null;
  members: readonly ControlOwnerMember[];
  disabled?: boolean;
  /** When false, render read-only text instead of a select. */
  canManage?: boolean;
  onChange: (ownerId: string | null) => void;
  id?: string;
  className?: string;
};

export function ControlOwnerSelect({
  value,
  members,
  disabled = false,
  canManage = true,
  onChange,
  id,
  className,
}: Props): React.JSX.Element {
  if (!canManage) {
    return (
      <span className={className ?? "text-sm text-muted-foreground"}>
        {resolveOwnerLabel(value, members)}
      </span>
    );
  }

  return (
    <Select
      value={value ?? UNASSIGNED_VALUE}
      disabled={disabled}
      onValueChange={(next) => {
        onChange(next === UNASSIGNED_VALUE ? null : next);
      }}
    >
      <SelectTrigger id={id} className={className ?? "w-full min-w-[10rem]"}>
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
        {members
          .filter((m) => m.clerkUserId)
          .map((member) => (
            <SelectItem key={member.clerkUserId} value={member.clerkUserId}>
              {memberLabel(member)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
