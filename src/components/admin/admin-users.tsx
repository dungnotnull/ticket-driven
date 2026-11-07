"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changeGlobalRoleAction,
  createUserAction,
  deleteUserAction,
} from "@/app/actions/users";
import { useLang } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DictKey } from "@/lib/i18n/dictionary";
import type { AdminUserDTO } from "@/lib/services/users";
import type { GlobalRole } from "@/lib/types";

const ROLE_OPTIONS: Array<{ value: GlobalRole; labelKey: DictKey; hintKey: DictKey }> = [
  { value: "admin", labelKey: "member.roleAdmin", hintKey: "admin.roleAdminHint" },
  { value: "team", labelKey: "member.roleTeam", hintKey: "admin.roleTeamHint" },
  { value: "client", labelKey: "member.roleClient", hintKey: "admin.roleClientHint" },
];

interface AdminUsersProps {
  currentUserId: string;
  initialUsers: AdminUserDTO[];
}

export function AdminUsers({ currentUserId, initialUsers }: AdminUsersProps) {
  const { t } = useLang();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    globalRole: "team" as GlobalRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changeRole(userId: string, role: GlobalRole) {
    setBusyId(userId);
    const result = await changeGlobalRoleAction({ userId, globalRole: role });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, globalRole: role } : u)),
    );
    toast.success(t("admin.roleUpdated"));
  }

  async function removeUser(userId: string) {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setBusyId(userId);
    const result = await deleteUserAction({ userId });
    setBusyId(null);
    setRemoveTarget(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success(t("admin.deleted"));
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createUserAction(form);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? t("admin.createFail"));
      return;
    }
    if (result.data) setUsers((prev) => [...prev, result.data!]);
    toast.success(t("admin.created"));
    setOpen(false);
    setForm({ name: "", email: "", password: "", globalRole: "team" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("nav.adminConsole")}</h1>
          <p className="text-[13px] text-muted">{t("admin.subtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="new-user">
          {t("admin.addUser")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface" data-testid="users-table">
        {users.map((user) => {
          const self = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Avatar name={user.name} email={user.email} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {user.name}
                  </span>
                  {self && <Badge>{t("admin.you")}</Badge>}
                </div>
                <span className="block truncate text-[12px] text-muted">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={user.globalRole}
                  onValueChange={(value) => {
                    void changeRole(user.id, value as GlobalRole);
                  }}
                  disabled={self || busyId === user.id}
                >
                  <SelectTrigger className="w-[130px]" data-testid="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("admin.deleteAria", { email: user.email })}
                  disabled={self || busyId === user.id}
                  onClick={() => setRemoveTarget(user.id)}
                >
                  {busyId === user.id ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} className="text-muted" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <form onSubmit={createUser}>
            <DialogHeader>
              <DialogTitle>{t("admin.addUser")}</DialogTitle>
              <DialogDescription>
                {t("admin.dialogDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-name">{t("auth.fullName")}</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-email">{t("auth.email")}</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password">{t("admin.tempPassword")}</Label>
                <Input
                  id="user-password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t("auth.passwordPh")}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-role">{t("admin.globalRole")}</Label>
                <Select
                  value={form.globalRole}
                  onValueChange={(value) =>
                    setForm({ ...form, globalRole: value as GlobalRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)} - {t(option.hintKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t("home.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <LoaderCircle size={13} className="animate-spin" />}
                {t("admin.createUser")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Branded destructive-action confirmation (no window.confirm) */}
      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t("admin.deleteConfirm", {
          email: users.find((u) => u.id === removeTarget)?.email ?? "",
        })}
        confirmLabel={t("confirm.delete")}
        cancelLabel={t("home.cancel")}
        busy={busyId !== null}
        onConfirm={() => {
          if (removeTarget) void removeUser(removeTarget);
        }}
      />
    </div>
  );
}
