import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Building2, ArrowLeft } from "lucide-react";
import GlobalOverview from "@/components/global/GlobalOverview";
import CompanyDashboard from "@/components/global/CompanyDashboard";

export default function GlobalOperationsCenter() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("global");
  const [globalData, setGlobalData] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(false);

  const loadCompanies = async () => {
    try {
      const res = await base44.functions.invoke('globalOperationsCenter', { operation: 'get_companies', params: {} });
      setCompanies(res.data?.companies || []);
    } catch (e) { console.error(e); }
  };

  const loadGlobal = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('globalOperationsCenter', { operation: 'get_global_overview', params: {} });
      setGlobalData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadCompany = async (companyId) => {
    setCompanyLoading(true);
    setCompanyData(null);
    try {
      const res = await base44.functions.invoke('globalOperationsCenter', { operation: 'get_company_dashboard', params: { company_id: companyId } });
      setCompanyData(res.data);
    } catch (e) { console.error(e); }
    setCompanyLoading(false);
  };

  useEffect(() => {
    loadCompanies();
    loadGlobal();
  }, []);

  useEffect(() => {
    if (selectedCompanyId === "global") {
      setCompanyData(null);
    } else {
      loadCompany(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header + Company Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Global Operations Center</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />Global Operations Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">One executive command for every NC company · Instant switching · Complete data separation</p>
        </div>

        {/* Company Switcher */}
        <div className="flex items-center gap-2">
          {selectedCompanyId !== "global" && (
            <button onClick={() => setSelectedCompanyId("global")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded border border-border/60">
              <ArrowLeft className="w-3.5 h-3.5" />Global
            </button>
          )}
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[280px] h-9 text-xs">
              <div className="flex items-center gap-1.5">
                {selectedCompanyId === "global" ? <Globe className="w-3.5 h-3.5 text-primary" /> : <Building2 className="w-3.5 h-3.5 text-primary" />}
                <SelectValue placeholder="Select company..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global" className="text-xs"><span className="flex items-center gap-1.5"><Globe className="w-3 h-3" />Global View — All Companies</span></SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />{c.name} ({c.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Separation Banner */}
      {selectedCompanyId !== "global" && (
        <Card className="p-2 border border-primary/30 bg-primary/5">
          <p className="text-[10px] text-primary flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Viewing <span className="font-semibold">{companies.find(c => c.id === selectedCompanyId)?.name}</span> — Data isolated from other companies. Switch companies using the selector above.
          </p>
        </Card>
      )}

      {/* Content */}
      {selectedCompanyId === "global" ? (
        loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <GlobalOverview data={globalData} onSelectCompany={setSelectedCompanyId} />
        )
      ) : (
        companyLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : companyData ? (
          <CompanyDashboard data={companyData} />
        ) : (
          <Card className="p-8 text-center border border-dashed border-border/40">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Unable to load company data. Try selecting another company.</p>
          </Card>
        )
      )}
    </div>
  );
}