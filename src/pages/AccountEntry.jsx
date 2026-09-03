import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Scale, Search } from "lucide-react";
import { accountEntryGateway } from "@/api/pilotGateways";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { assertServiceChoice, buildAccountEntry } from "@/lib/pilotFlow";

export default function AccountEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferredName, setPreferredName] = useState(user?.full_name || user?.display_name || "");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [selectingService, setSelectingService] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const email = user?.email || "";

  const continueWith = async (profileChoice) => {
    setBusy(true);
    setError("");
    try {
      const entry = buildAccountEntry({ preferredName, authenticatedEmail: email, termsAccepted, phone, smsConsent, profileChoice });
      await accountEntryGateway.getOrCreateProfile();
      await accountEntryGateway.acknowledgeTerms();
      await accountEntryGateway.updateProfile({ preferred_name: entry.preferred_name, phone: entry.phone });
      await accountEntryGateway.setSmsConsent(entry.sms_consent);
      setSelectingService(true);
    } catch (err) {
      setError(err.message || "Account entry could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const chooseService = async (service) => {
    setBusy(true);
    setError("");
    try {
      await accountEntryGateway.selectService(assertServiceChoice(service));
      if (service === "legal") navigate("/nc-legal");
    } catch (err) {
      setError(err.message || "Service selection could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (selectingService) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <h1 className="text-2xl font-bold">Choose a service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Legal or Grant information is collected only after you make this selection.</p>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5"><Scale className="mb-3 h-6 w-6 text-primary" /><h2 className="font-semibold">NC Legal</h2><p className="my-3 text-sm text-muted-foreground">Organize legal intake, matters, evidence, timelines, and authority research.</p><Button className="w-full" disabled={busy} onClick={() => chooseService("legal")}>Choose NC Legal</Button></Card>
          <Card className="p-5"><Search className="mb-3 h-6 w-6 text-primary" /><h2 className="font-semibold">Grant Engine</h2><p className="my-3 text-sm text-muted-foreground">Internal testing only tonight. Enrollment and information collection remain disabled.</p><Button className="w-full" variant="outline" disabled>Internal test only</Button></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-3"><Compass className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Welcome to Nautical Compass</h1><p className="text-sm text-muted-foreground">Confirm a few account details before choosing a service.</p></div></div>
      <Card className="space-y-5 p-5 sm:p-6">
        <div><Label htmlFor="preferred-name">Preferred or display name</Label><Input id="preferred-name" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} autoComplete="name" required /></div>
        <div><Label htmlFor="account-email">Authenticated email</Label><Input id="account-email" value={email} readOnly disabled /></div>
        <div><Label htmlFor="phone">Phone (optional)</Label><Input id="phone" value={phone} onChange={(event) => { setPhone(event.target.value); if (!event.target.value) setSmsConsent(false); }} autoComplete="tel" /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={smsConsent} disabled={!phone.trim()} onChange={(event) => setSmsConsent(event.target.checked)} /><span>I separately consent to receive SMS messages. This is optional and unchecked by default. SMS sending remains disabled.</span></label>
        <div className="rounded-lg bg-muted p-4 text-sm"><p className="font-medium">Why start a profile?</p><p className="mt-1 text-muted-foreground">A profile can reduce repeated questions and personalize your workspace across services. Nautical Compass does not sell profile information or use it for unrelated advertising.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I acknowledge the <a className="underline" href="#terms">Terms</a> and <a className="underline" href="#privacy">Privacy Notice</a>.</span></label>
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2"><Button className="w-full" disabled={busy} onClick={() => continueWith("start_profile")}>Start my profile</Button><Button className="w-full" variant="outline" disabled={busy} onClick={() => continueWith("skip_profile")}>Not now — choose a service</Button></div>
        <div className="grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2"><p id="terms"><strong>Terms:</strong> Use the service lawfully and verify important information before acting.</p><p id="privacy"><strong>Privacy:</strong> Account information is used to provide selected services and administer access.</p></div>
      </Card>
    </div>
  );
}
