"use client";

import { useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMemberAction,
  removeMemberAction,
  updateMemberAction,
} from "@/app/actions/projects";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";
import type { ProjectDTO, ProjectRole } from "@/lib/types";

interface MembersDialogProps {
  project: ProjectDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  myRole: "admin" | "team" | "client";
  onChanged: () => void;
}

export function MembersDialog({
  project,
  open,
  onOpenChange,
  canManage,
  myRole,
  onChanged,
}: MembersDialogProps) {
  const { t } = useLang();
  const [members, setMembers] = useState(project.members);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("client");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await addMemberAction({
      projectId: project.id,
      member: { email: email.trim().toLowerCase(), role },
    });
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(explainApi(result, t, "member.addFail"));
      return;
    }
    setMembers(result.data.members);
    setEmail("");
    toast.success(t("member.added"));
    onChanged();
  }

  async function changeRole(userId: string, value: ProjectRole) {
    const result = await updateMemberAction({
      projectId: project.id,
      member: { userId, role: value },
    });
    if (!result.ok || !result.data) {
      toast.error(explainApi(result, t, "member.roleFail"));
      return;
    }
    setMembers(result.data.members);
    toast.success(t("member.roleUpdated"));
    onChanged();
  }

  async function removeMember(userId: string) {
    setRemoving(true);
    const result = await removeMemberAction({
      projectId: project.id,
      member: { userId },
    });
    setRemoving(false);
    setRemoveTarget(null);
    if (!result.ok || !result.data) {
      toast.error(explainApi(result, t, "member.removeFail"));
      return;
    }
    setMembers(result.data.members);
    toast.success(t("member.removed"));
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t("member.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {canManage ? t("member.descManage") : t("member.descView")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 px-5 py-4" data-testid="members-list">
          {members.map((member) => {
            const isOwner = member.user.id === project.ownerId;
            return (
              <div
                key={member.user.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-2/50 px-3 py-2"
              >
                <Avatar name={member.user.name} email={member.user.email} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">
                      {member.user.name}
                    </span>
                    {isOwner && <Badge>{t("member.owner")}</Badge>}
                  </div>
                  <span className="block truncate text-[11.5px] text-muted">
                    {member.user.email}
                  </span>
                </div>
                {canManage && !isOwner ? (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={member.role}
                      onValueChange={(value) => void changeRole(member.user.id, value as ProjectRole)}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("member.roleAdmin")}</SelectItem>
                        <SelectItem value="team">{t("member.roleTeam")}</SelectItem>
                        <SelectItem value="client">{t("member.roleClient")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      aria-label={t("member.removeAria", { name: member.user.name })}
                      onClick={() => setRemoveTarget(member.user.id)}
                      className="rounded p-1 text-muted transition-colors hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <Badge variant="primary">{member.role}</Badge>
                )}
              </div>
            );
          })}
        </div>

        {canManage && (
          <form            onSubmit={addMember}
            className="border-t border-border px-5 py-4"
            data-testid="add-member-form"
          >
            <Label className="mb-2">{t("member.addTitle")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.dev"
                required
                className="flex-1"
                data-testid="member-email"
              />
              <Select value={role} onValueChange={(value) => setRole(value as ProjectRole)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">{t("member.roleTeam")}</SelectItem>
                  <SelectItem value="client">{t("member.roleClient")}</SelectItem>
                  <SelectItem value="admin">{t("member.roleAdmin")}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <LoaderCircle size={13} className="animate-spin" /> : <UserPlus size={13} />}
                {t("member.add")}
              </Button>
            </div>
            {error && (
              <p className="mt-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-[12.5px] text-danger">
                {error}
              </p>
            )}
            {myRole !== "admin" && (
              <p className="mt-2 text-[11.5px] text-muted">{t("member.clientNote")}</p>
            )}
          </form>
        )}
        <ConfirmDialog
          open={removeTarget !== null}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          title={t("member.removeConfirm", {
            name: members.find((m) => m.user.id === removeTarget)?.user.name ?? "",
          })}
          confirmLabel={t("confirm.remove")}
          cancelLabel={t("home.cancel")}
          busy={removing}
          onConfirm={() => removeTarget && void removeMember(removeTarget)}
        />
      </DialogContent>
    </Dialog>
  );
}
