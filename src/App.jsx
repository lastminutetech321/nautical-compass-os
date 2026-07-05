import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Layout
import AppLayout from '@/components/layout/AppLayout';

// Executive Command
import ExecutiveCommand from '@/pages/ExecutiveCommand';

// Personal Operating Console
import DailyCompass from '@/pages/DailyCompass';

// Director Navigation System
import DirectorAssistant from '@/pages/DirectorAssistant';

// AI Workforce
import AIWorkforce from '@/pages/AIWorkforce';
import AgentCenter from '@/pages/AgentCenter';
import CapabilityRegistry from '@/pages/CapabilityRegistry';
import ExecutiveAIWorkforce from '@/pages/ExecutiveAIWorkforce';

// Build Studio
import BuildStudio from '@/pages/BuildStudio';
import FeatureBuilder from '@/pages/FeatureBuilder';
import BlueprintLibrary from '@/pages/BlueprintLibrary';
import InfrastructureLibrary from '@/pages/InfrastructureLibrary';

// JurisEngine
import JurisEngine from '@/pages/JurisEngine';

// Business Platform
import BusinessPlatform from '@/pages/BusinessPlatform';

// Sprint Board
import SprintBoard from '@/pages/SprintBoard';

// Agent Roster
import AgentRoster from '@/pages/AgentRoster';

// Evidence Command
import EvidenceVault from '@/pages/EvidenceVault';
import EvidenceChecklist from '@/pages/EvidenceChecklist';
import VideoEvidenceReview from '@/pages/VideoEvidenceReview';
import CaseTimelinePage from '@/pages/CaseTimelinePage';
import WitnessTracker from '@/pages/WitnessTracker';
import LegalIssueSpotter from '@/pages/LegalIssueSpotter';
import FOIATracker from '@/pages/FOIATracker';

// Knowledge & Automation
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import AutomationCenter from '@/pages/AutomationCenter';

// Business Ops (existing)
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Clients from '@/pages/Clients';
import Team from '@/pages/Team';
import Documents from '@/pages/Documents';
import ActivityLog from '@/pages/ActivityLog';

// Canon
import CanonIngestion from '@/pages/CanonIngestion';
import CanonCoverageMap from '@/pages/CanonCoverageMap';
import CanonReviewQueue from '@/pages/CanonReviewQueue';
import CanonEntryBuilder from '@/pages/CanonEntryBuilder';
import CanonGapResolver from '@/pages/CanonGapResolver';
import CanonDashboard from '@/pages/CanonDashboard';

// JurisEngine
import JurisTestLibrary from '@/pages/JurisTestLibrary';

// Decision Compass
import DecisionCompass from '@/pages/DecisionCompass';

// Survival
import SurvivalDashboard from '@/pages/SurvivalDashboard';

// Diagnosis
import DiagnosisDashboard from '@/pages/DiagnosisDashboard';

// Executive Intelligence v2
import FounderDashboard from '@/pages/FounderDashboard';
import CriticalPathEngine from '@/pages/CriticalPathEngine';
import MissionControl from '@/pages/MissionControl';
import ResourceAllocation from '@/pages/ResourceAllocation';

// NCOS Intelligence
import NCOSMemoryPage from '@/pages/NCOSMemoryPage';
import TechnicalDebtDashboard from '@/pages/TechnicalDebtDashboard';
import NCIntelligence from '@/pages/NCIntelligence';
import NCIntelligenceOps from '@/pages/NCIntelligenceOps';
import NCDM from '@/pages/NCDM';

// Architecture Layers
import FounderVisionPage from '@/pages/FounderVisionPage';
import NCCanon from '@/pages/NCCanon';
import AIServicesLayer from '@/pages/AIServicesLayer';
import PlatformApplications from '@/pages/PlatformApplications';

// Rails
import CultureRail from '@/pages/CultureRail';
import CultureHub from '@/pages/culture/CultureHub';
import CultureContentManager from '@/pages/culture/CultureContentManager';
import CreatorDashboard from '@/pages/culture/CreatorDashboard';
import SubscriberDashboard from '@/pages/culture/SubscriberDashboard';
import CommunityDashboard from '@/pages/culture/CommunityDashboard';
import EngagementAnalytics from '@/pages/culture/EngagementAnalytics';
import EventCalendar from '@/pages/culture/EventCalendar';
import MarketplacePage from '@/pages/culture/MarketplacePage';
import AdvertisingPage from '@/pages/culture/AdvertisingPage';
import CultureExecutiveDashboard from '@/pages/culture/CultureExecutiveDashboard';
import CreatorProfilesPage from '@/pages/culture/CreatorProfilesPage';
import BuildRegistry from '@/pages/BuildRegistry';
import BlueprintFactory from '@/pages/BlueprintFactory';
import EnterpriseCloneEngine from '@/pages/EnterpriseCloneEngine';
import FounderBrain from '@/pages/FounderBrain';
import EnterpriseSimulator from '@/pages/EnterpriseSimulator';
import EngineeringAcademy from '@/pages/EngineeringAcademy';
import EnterpriseMarketplace from '@/pages/EnterpriseMarketplace';
import GlobalOperationsCenter from '@/pages/GlobalOperationsCenter';
import NCKnowledgeGraph from '@/pages/NCKnowledgeGraph';
import NCDependencyEngine from '@/pages/NCDependencyEngine';
import NCProjectDirector from '@/pages/NCProjectDirector';
import NCCustomerSuccess from '@/pages/NCCustomerSuccess';
import NCFinancialIntelligence from '@/pages/NCFinancialIntelligence';
import NCEvolutionEngine from '@/pages/NCEvolutionEngine';

// Enterprise & Infrastructure
import NotificationCenter from '@/pages/NotificationCenter';
import AuditLogViewer from '@/pages/AuditLogViewer';
import EnterprisePanel from '@/pages/EnterprisePanel';
import PlatformHealthMonitor from '@/pages/PlatformHealthMonitor';
import PlatformConfigPage from '@/pages/PlatformConfigPage';

// Product & Roadmap
import RoadmapPage from '@/pages/RoadmapPage';

// Legal / Case Management
import CaseFileManager from '@/pages/CaseFileManager';

// Agent Work Queue
import AgentWorkQueue from '@/pages/AgentWorkQueue';

// Resource Compass Rail
import ResourceCompass from '@/pages/ResourceCompass';
import ResourceSearch from '@/pages/ResourceSearch';
import ResourceCases from '@/pages/ResourceCases';
import ResourceApplications from '@/pages/ResourceApplications';
import ResourceReminders from '@/pages/ResourceReminders';
import ResourceAppointments from '@/pages/ResourceAppointments';
import ResourceEligibility from '@/pages/ResourceEligibility';
import ResourcePlanner from '@/pages/ResourcePlanner';
import ResourceDocs from '@/pages/ResourceDocs';

// Enterprise CRM
import CRMCommand from '@/pages/CRMCommand';
import CRMPipeline from '@/pages/CRMPipeline';
import CRMLeads from '@/pages/CRMLeads';
import CRMContacts from '@/pages/CRMContacts';
import CRMRevenue from '@/pages/CRMRevenue';
import CRMPartners from '@/pages/CRMPartners';
import CRMCommunications from '@/pages/CRMCommunications';

// Workforce Rail
import WorkforceHub from '@/pages/workforce/WorkforceHub';
import WorkerProfiles from '@/pages/workforce/WorkerProfiles';
import WorkerSkillsPage from '@/pages/workforce/WorkerSkillsPage';
import ResumeBuilder from '@/pages/workforce/ResumeBuilder';
import WorkerSchedulePage from '@/pages/workforce/WorkerSchedulePage';
import WorkerContractsPage from '@/pages/workforce/WorkerContractsPage';
import TimeTrackerPage from '@/pages/workforce/TimeTrackerPage';
import WorkforceInvoicesPage from '@/pages/workforce/WorkforceInvoicesPage';
import VendorRegistryPage from '@/pages/workforce/VendorRegistryPage';
import UnionTrackingPage from '@/pages/workforce/UnionTrackingPage';
import GigMarketplacePage from '@/pages/workforce/GigMarketplacePage';
import TrainingLibraryPage from '@/pages/workforce/TrainingLibraryPage';
import CareerPlannerPage from '@/pages/workforce/CareerPlannerPage';
import SafetyReportingPage from '@/pages/workforce/SafetyReportingPage';
import WorkerRatingsPage from '@/pages/workforce/WorkerRatingsPage';
import IncomeForecastPage from '@/pages/workforce/IncomeForecastPage';
import OpportunityMatchingPage from '@/pages/workforce/OpportunityMatchingPage';
import WorkforceExecutiveDashboard from '@/pages/workforce/WorkforceExecutiveDashboard';
import PayrollDashboard from '@/pages/workforce/PayrollDashboard';

// Authority Compass
import AuthorityCompass from '@/pages/authority/AuthorityCompass';
import AuthorityIntake from '@/pages/authority/AuthorityIntake';
import AuthorityTimeline from '@/pages/authority/AuthorityTimeline';
import AuthorityValidation from '@/pages/authority/AuthorityValidation';
import AuthorityComplaintsPage from '@/pages/authority/AuthorityComplaintsPage';
import AuthorityAppealsPage from '@/pages/authority/AuthorityAppealsPage';
import AuthorityDocRequestsPage from '@/pages/authority/AuthorityDocRequestsPage';
import AuthorityEscalationPage from '@/pages/authority/AuthorityEscalationPage';
import AuthorityAccountabilityPage from '@/pages/authority/AuthorityAccountabilityPage';
import AuthorityEvidencePage from '@/pages/authority/AuthorityEvidencePage';
import AuthorityFOIAPage from '@/pages/authority/AuthorityFOIAPage';
import AuthorityDashboard from '@/pages/authority/AuthorityDashboard';

// NC Ecosystem Orchestrator
import BuildNC from '@/pages/BuildNC';

// NC Operations & Organizational OS
import NOOSCommand from '@/pages/NOOSCommand';

// NC Autonomous Intelligence Loop
import NAILDashboard from '@/pages/NAILDashboard';

// NC Continuous Intelligence & Communication Engine
import NCICECommand from '@/pages/NCICECommand';

// Canon Verification Engine
import CanonVerificationDashboard from '@/pages/CanonVerificationDashboard';

// Unified Execution Engine
import ExecutionCommand from '@/pages/ExecutionCommand';

// NC Build Director
import BuildDirector from '@/pages/BuildDirector';

// NC Payment Fabric
import PaymentFabricCommand from '@/pages/PaymentFabricCommand';
import PayoutCenter from '@/pages/PayoutCenter';
import ContributionEconomy from '@/pages/ContributionEconomy';

// NC Payment Sandbox & Verification
import PaymentSandboxCommand from '@/pages/PaymentSandboxCommand';
import PaymentVerificationCenter from '@/pages/PaymentVerificationCenter';
import WebhookTestingCenter from '@/pages/WebhookTestingCenter';

// NC Workforce Gateway
import WorkforceGateway from '@/pages/workforce/WorkforceGateway';
import TalentPartnership from '@/pages/TalentPartnership';
import WorkforceDirector from '@/pages/workforce/WorkforceDirector';
import CareerPassport from '@/pages/workforce/CareerPassport';
import IndustryTemplateManager from '@/pages/workforce/IndustryTemplateManager';

// NC Experience Network
import NCExperienceNetwork from '@/pages/experience/NCExperienceNetwork';
import VenueOptimization from '@/pages/experience/VenueOptimization';
import EventReadiness from '@/pages/experience/EventReadiness';
import EventProviderProfiles from '@/pages/experience/EventProviderProfiles';
import EventOperationsRoom from '@/pages/experience/EventOperationsRoom';
import EventIntelligence from '@/pages/experience/EventIntelligence';

// Canon Population
import CanonImportQueuePage from '@/pages/CanonImportQueuePage';
import CanonJurisDependencyMap from '@/pages/CanonJurisDependencyMap';

// EvoSystem
import EvoSystem from '@/pages/EvoSystem';
import ActivationCenter from '@/pages/ActivationCenter';

// Self Improvement
import SelfImprovement from '@/pages/SelfImprovement';
import AutonomousImprovement from '@/pages/AutonomousImprovement';
import SelfGovernance from '@/pages/SelfGovernance';
import AIAssistant from '@/pages/AIAssistant';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          {/* Personal Operating Console — Daily Compass is the default landing */}
          <Route path="/" element={<DailyCompass />} />

          {/* Director Navigation System */}
          <Route path="/director-assistant" element={<DirectorAssistant />} />

          {/* Executive Command (Founder-level) */}
          <Route path="/executive-command" element={<ExecutiveCommand />} />

          {/* AI Workforce */}
          <Route path="/workforce" element={<AIWorkforce />} />
          <Route path="/executive-workforce" element={<ExecutiveAIWorkforce />} />
          <Route path="/agents" element={<AgentCenter />} />
          <Route path="/agent-roster" element={<AgentRoster />} />
          <Route path="/capabilities" element={<CapabilityRegistry />} />

          {/* Build Studio */}
          <Route path="/build-studio" element={<BuildStudio />} />
          <Route path="/sprint-board" element={<SprintBoard />} />
          <Route path="/features" element={<FeatureBuilder />} />
          <Route path="/blueprints" element={<BlueprintLibrary />} />
          <Route path="/infrastructure" element={<InfrastructureLibrary />} />

          {/* Evidence Command */}
          <Route path="/evidence" element={<EvidenceVault />} />
          <Route path="/evidence-checklist" element={<EvidenceChecklist />} />
          <Route path="/video-evidence" element={<VideoEvidenceReview />} />
          <Route path="/case-timeline" element={<CaseTimelinePage />} />
          <Route path="/witnesses" element={<WitnessTracker />} />
          <Route path="/legal-issues" element={<LegalIssueSpotter />} />
          <Route path="/foia" element={<FOIATracker />} />

          {/* Knowledge & Automation */}
          <Route path="/knowledge" element={<KnowledgeGraph />} />
          <Route path="/automations" element={<AutomationCenter />} />

          {/* Business Ops */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/team" element={<Team />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/activity" element={<ActivityLog />} />

          {/* JurisEngine */}
          <Route path="/jurisengine" element={<JurisEngine />} />
          <Route path="/juris-tests" element={<JurisTestLibrary />} />

          {/* Decision Compass */}
          <Route path="/decision-compass" element={<DecisionCompass />} />

          {/* Survival Dashboard */}
          <Route path="/survival" element={<SurvivalDashboard />} />

          {/* Diagnosis Dashboard */}
          <Route path="/diagnosis" element={<DiagnosisDashboard />} />

          {/* Executive Intelligence v2 */}
          <Route path="/founder-dashboard" element={<FounderDashboard />} />
          <Route path="/critical-path" element={<CriticalPathEngine />} />
          <Route path="/mission-control" element={<MissionControl />} />
          <Route path="/resource-allocation" element={<ResourceAllocation />} />

          {/* NCOS Intelligence */}
          <Route path="/ncos-memory" element={<NCOSMemoryPage />} />
          <Route path="/nc-intelligence" element={<NCIntelligence />} />
          <Route path="/nc-intelligence-ops" element={<NCIntelligenceOps />} />
          <Route path="/nc-dev-memory" element={<NCDM />} />
          <Route path="/technical-debt" element={<TechnicalDebtDashboard />} />

          {/* Business Platform */}
          <Route path="/business-platform" element={<BusinessPlatform />} />

          {/* Architecture Layers */}
          <Route path="/founder-vision" element={<FounderVisionPage />} />
          <Route path="/canon" element={<NCCanon />} />
          <Route path="/canon-ingestion" element={<CanonIngestion />} />
          <Route path="/canon-coverage" element={<CanonCoverageMap />} />
          <Route path="/canon-review" element={<CanonReviewQueue />} />
          <Route path="/canon-entry-builder" element={<CanonEntryBuilder />} />
          <Route path="/canon-gap-resolver" element={<CanonGapResolver />} />
          <Route path="/canon-dashboard" element={<CanonDashboard />} />
          <Route path="/ai-services" element={<AIServicesLayer />} />
          <Route path="/applications" element={<PlatformApplications />} />

          {/* Rails */}
          <Route path="/culture-rail" element={<CultureRail />} />
          <Route path="/culture" element={<CultureHub />} />
          <Route path="/culture/artists" element={<CultureContentManager type="artists" />} />
          <Route path="/culture/albums" element={<CultureContentManager type="albums" />} />
          <Route path="/culture/songs" element={<CultureContentManager type="songs" />} />
          <Route path="/culture/creators" element={<CultureContentManager type="creators" />} />
          <Route path="/culture/podcasts" element={<CultureContentManager type="podcasts" />} />
          <Route path="/culture/videos" element={<CultureContentManager type="videos" />} />
          <Route path="/culture/events" element={<CultureContentManager type="events" />} />
          <Route path="/culture/merch" element={<CultureContentManager type="merch" />} />
          <Route path="/culture/communities" element={<CultureContentManager type="communities" />} />
          <Route path="/culture/fan-clubs" element={<CultureContentManager type="fan-clubs" />} />
          <Route path="/culture/radio" element={<CultureContentManager type="radio" />} />
          <Route path="/culture/playlists" element={<CultureContentManager type="playlists" />} />
          <Route path="/culture/licensing" element={<CultureContentManager type="licensing" />} />
          <Route path="/culture/royalties" element={<CultureContentManager type="royalties" />} />
          <Route path="/culture/creator-dashboard" element={<CreatorDashboard />} />
          <Route path="/culture/subscriber-dashboard" element={<SubscriberDashboard />} />
          <Route path="/culture/community-dashboard" element={<CommunityDashboard />} />
          <Route path="/culture/analytics" element={<EngagementAnalytics />} />
          <Route path="/culture/calendar" element={<EventCalendar />} />
          <Route path="/culture/marketplace" element={<MarketplacePage />} />
          <Route path="/culture/advertising" element={<AdvertisingPage />} />
          <Route path="/culture/promotions" element={<AdvertisingPage />} />
          <Route path="/culture/profiles" element={<CreatorProfilesPage />} />
          <Route path="/culture/executive" element={<CultureExecutiveDashboard />} />
          <Route path="/build-registry" element={<BuildRegistry />} />
          <Route path="/blueprint-factory" element={<BlueprintFactory />} />
          <Route path="/clone-engine" element={<EnterpriseCloneEngine />} />
          <Route path="/founder-brain" element={<FounderBrain />} />
          <Route path="/enterprise-simulator" element={<EnterpriseSimulator />} />
          <Route path="/engineering-academy" element={<EngineeringAcademy />} />
          <Route path="/enterprise-marketplace" element={<EnterpriseMarketplace />} />
          <Route path="/global-operations" element={<GlobalOperationsCenter />} />
          <Route path="/knowledge-graph" element={<NCKnowledgeGraph />} />
          <Route path="/dependency-engine" element={<NCDependencyEngine />} />
          <Route path="/project-director" element={<NCProjectDirector />} />
          <Route path="/customer-success" element={<NCCustomerSuccess />} />
          <Route path="/financial-intelligence" element={<NCFinancialIntelligence />} />
          <Route path="/evolution-engine" element={<NCEvolutionEngine />} />

          {/* Enterprise & Infrastructure */}
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/audit-log" element={<AuditLogViewer />} />
          <Route path="/enterprise" element={<EnterprisePanel />} />
          <Route path="/health" element={<PlatformHealthMonitor />} />
          <Route path="/platform-config" element={<PlatformConfigPage />} />

          {/* Product Roadmap */}
          <Route path="/roadmap" element={<RoadmapPage />} />

          {/* Case File Manager */}
          <Route path="/cases" element={<CaseFileManager />} />

          {/* Agent Work Queue */}
          <Route path="/agent-queue" element={<AgentWorkQueue />} />

          {/* Resource Compass Rail */}
          <Route path="/resource-compass" element={<ResourceCompass />} />
          <Route path="/resource-search" element={<ResourceSearch />} />
          <Route path="/resource-cases" element={<ResourceCases />} />
          <Route path="/resource-applications" element={<ResourceApplications />} />
          <Route path="/resource-reminders" element={<ResourceReminders />} />
          <Route path="/resource-appointments" element={<ResourceAppointments />} />
          <Route path="/resource-eligibility" element={<ResourceEligibility />} />
          <Route path="/resource-planner" element={<ResourcePlanner />} />
          <Route path="/resource-docs" element={<ResourceDocs />} />

          {/* Enterprise CRM */}
          <Route path="/crm" element={<CRMCommand />} />
          <Route path="/crm-pipeline" element={<CRMPipeline />} />
          <Route path="/crm-leads" element={<CRMLeads />} />
          <Route path="/crm-contacts" element={<CRMContacts />} />
          <Route path="/crm-revenue" element={<CRMRevenue />} />
          <Route path="/crm-partners" element={<CRMPartners />} />
          <Route path="/crm-communications" element={<CRMCommunications />} />

          {/* Workforce Rail */}
          <Route path="/workforce" element={<WorkforceHub />} />
          <Route path="/workforce/profiles" element={<WorkerProfiles />} />
          <Route path="/workforce/skills" element={<WorkerSkillsPage />} />
          <Route path="/workforce/resume" element={<ResumeBuilder />} />
          <Route path="/workforce/schedule" element={<WorkerSchedulePage />} />
          <Route path="/workforce/contracts" element={<WorkerContractsPage />} />
          <Route path="/workforce/time" element={<TimeTrackerPage />} />
          <Route path="/workforce/invoices" element={<WorkforceInvoicesPage />} />
          <Route path="/workforce/vendors" element={<VendorRegistryPage />} />
          <Route path="/workforce/unions" element={<UnionTrackingPage />} />
          <Route path="/workforce/gigs" element={<GigMarketplacePage />} />
          <Route path="/workforce/training" element={<TrainingLibraryPage />} />
          <Route path="/workforce/career" element={<CareerPlannerPage />} />
          <Route path="/workforce/safety" element={<SafetyReportingPage />} />
          <Route path="/workforce/ratings" element={<WorkerRatingsPage />} />
          <Route path="/workforce/income" element={<IncomeForecastPage />} />
          <Route path="/workforce/matching" element={<OpportunityMatchingPage />} />
          <Route path="/workforce/dashboard" element={<WorkforceExecutiveDashboard />} />
          <Route path="/workforce/payroll" element={<PayrollDashboard />} />

          {/* Authority Compass */}
          <Route path="/authority/compass" element={<AuthorityCompass />} />
          <Route path="/authority/intake" element={<AuthorityIntake />} />
          <Route path="/authority/timeline" element={<AuthorityTimeline />} />
          <Route path="/authority/validation" element={<AuthorityValidation />} />
          <Route path="/authority/complaints" element={<AuthorityComplaintsPage />} />
          <Route path="/authority/appeals" element={<AuthorityAppealsPage />} />
          <Route path="/authority/documents" element={<AuthorityDocRequestsPage />} />
          <Route path="/authority/escalation" element={<AuthorityEscalationPage />} />
          <Route path="/authority/accountability" element={<AuthorityAccountabilityPage />} />
          <Route path="/authority/evidence" element={<AuthorityEvidencePage />} />
          <Route path="/authority/foia" element={<AuthorityFOIAPage />} />
          <Route path="/authority/dashboard" element={<AuthorityDashboard />} />

          {/* NC Ecosystem Orchestrator */}
          <Route path="/build-nc" element={<BuildNC />} />

          {/* NC Operations & Organizational OS */}
          <Route path="/noos" element={<NOOSCommand />} />

          {/* NC Autonomous Intelligence Loop */}
          <Route path="/nail" element={<NAILDashboard />} />

          {/* NC Continuous Intelligence & Communication Engine */}
          <Route path="/ncice" element={<NCICECommand />} />

          {/* Canon Verification Engine */}
          <Route path="/canon-verification" element={<CanonVerificationDashboard />} />

          {/* Unified Execution Engine */}
          <Route path="/execution" element={<ExecutionCommand />} />

          {/* NC Build Director */}
          <Route path="/build-director" element={<BuildDirector />} />

          {/* NC Payment Fabric */}
          <Route path="/payment-fabric" element={<PaymentFabricCommand />} />
          <Route path="/payouts" element={<PayoutCenter />} />
          <Route path="/contribution-economy" element={<ContributionEconomy />} />

          {/* NC Payment Sandbox & Verification */}
          <Route path="/payment-sandbox" element={<PaymentSandboxCommand />} />
          <Route path="/payment-verification" element={<PaymentVerificationCenter />} />
          <Route path="/webhook-testing" element={<WebhookTestingCenter />} />

          {/* NC Workforce Gateway */}
          <Route path="/workforce-gateway" element={<WorkforceGateway />} />
          <Route path="/talent-partnership" element={<TalentPartnership />} />
          <Route path="/workforce-director" element={<WorkforceDirector />} />
          <Route path="/workforce-passport/:workerId" element={<CareerPassport />} />
          <Route path="/workforce-templates" element={<IndustryTemplateManager />} />

          {/* NC Experience Network */}
          <Route path="/experience" element={<NCExperienceNetwork />} />
          <Route path="/experience/venues" element={<VenueOptimization />} />
          <Route path="/experience/readiness" element={<EventReadiness />} />
          <Route path="/experience/providers" element={<EventProviderProfiles />} />
          <Route path="/experience/operations" element={<EventOperationsRoom />} />
          <Route path="/experience/intelligence" element={<EventIntelligence />} />

          {/* Canon Population */}
          <Route path="/canon-import-queue" element={<CanonImportQueuePage />} />
          <Route path="/canon-juris-deps" element={<CanonJurisDependencyMap />} />

          {/* EvoSystem */}
          <Route path="/evosystem" element={<EvoSystem />} />
          <Route path="/activation" element={<ActivationCenter />} />

          {/* Self Improvement */}
          <Route path="/self-improvement" element={<SelfImprovement />} />
          <Route path="/autonomous-improvement" element={<AutonomousImprovement />} />
          <Route path="/self-governance" element={<SelfGovernance />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;