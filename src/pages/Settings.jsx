import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="max-w-2xl space-y-6">
        <Card className="p-6 border border-border/60">
          <h2 className="text-sm font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <p className="text-sm font-medium mt-0.5">{user?.full_name || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium mt-0.5">{user?.email || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <p className="text-sm font-medium mt-0.5 capitalize">{user?.role || "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border/60">
          <h2 className="text-sm font-semibold mb-4">Platform</h2>
          <p className="text-sm text-muted-foreground">
            Nautical Compass OS v1.0 — Modular business operating system
          </p>
        </Card>
      </div>
    </div>
  );
}