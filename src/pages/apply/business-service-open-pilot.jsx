import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Shield, Users, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BusinessServiceOpenPilot() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">NC Business Service Open Pilot</h1>
        <p className="text-xl text-muted-foreground">
          Help us build the future of career services — apply to participate in our pilot program
        </p>
      </div>

      {/* Important Notice */}
      <Card className="p-6 mb-8 border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Important Notice</h3>
            <p className="text-sm text-amber-800">
              Participation in this pilot <strong>does not guarantee</strong> acceptance into NC Business Service programs or work opportunities. This is a research and development phase to validate our processes and gather feedback.
            </p>
          </div>
        </div>
      </Card>

      {/* What We Collect */}
      <Card className="p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <FileText className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold mb-4">What We Collect</h2>
            <p className="text-muted-foreground mb-4">
              To evaluate fit and provide meaningful feedback, we collect:
            </p>
          </div>
        </div>

        <ul className="space-y-3 ml-10">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Professional Profile:</strong> Work history, skills, education, certifications</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Service Preferences:</strong> Desired services, availability, location preferences</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Assessment Results:</strong> Skills evaluations, compatibility scores (if applicable)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Communication Records:</strong> Application notes, feedback exchanges, pilot interactions</span>
          </li>
        </ul>
      </Card>

      {/* Why We Collect */}
      <Card className="p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <Shield className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold mb-4">Why We Collect This Information</h2>
            <p className="text-muted-foreground mb-4">
              Your pilot data helps us:
            </p>
          </div>
        </div>

        <ul className="space-y-3 ml-10">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Validate our matching algorithms</strong> — ensure our service recommendations are accurate and relevant</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Refine application workflows</strong> — identify friction points and improve the participant experience</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Test staff processes</strong> — train reviewers, calibrate evaluation criteria, and develop best practices</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Build baseline metrics</strong> — establish quality standards and service delivery benchmarks</span>
          </li>
        </ul>
      </Card>

      {/* Who Can See Your Data */}
      <Card className="p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <Users className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold mb-4">Who Can See Your Data</h2>
          </div>
        </div>

        <div className="space-y-4 ml-10">
          <div>
            <h3 className="font-semibold mb-2">Internal Access (NC Staff Only)</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Pilot Coordinators:</strong> Full access to manage your application and provide feedback</li>
              <li>• <strong>Service Reviewers:</strong> Access to relevant profile sections for evaluation purposes</li>
              <li>• <strong>Product Team:</strong> Anonymized aggregate data for system improvements</li>
            </ul>
          </div>

          <div className="pt-4">
            <h3 className="font-semibold mb-2">External Access</h3>
            <p className="text-sm text-muted-foreground">
              <strong>None during the pilot.</strong> Your data is not shared with employers, clients, or third parties. If you are selected for a post-pilot opportunity, we will seek explicit consent before any external sharing.
            </p>
          </div>
        </div>
      </Card>

      {/* You Control Corrections */}
      <Card className="p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">You Control Your Data</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <strong>Update anytime:</strong> You can edit your profile, preferences, and application details at any point during the pilot.
          </p>
          <p>
            <strong>Request corrections:</strong> If you spot an error or outdated information, contact your pilot coordinator or use the feedback form — we will update your record promptly.
          </p>
          <p>
            <strong>Withdraw:</strong> You may withdraw from the pilot at any time. Your data will be archived (not deleted, for research continuity) but marked inactive.
          </p>
        </div>
      </Card>

      {/* Next Steps */}
      <Card className="p-8 mb-8 bg-primary/5">
        <h2 className="text-2xl font-bold mb-4">Ready to Apply?</h2>
        <p className="text-muted-foreground mb-6">
          The application takes approximately 15-20 minutes. You'll create an account, complete your professional profile, and answer a few pilot-specific questions. Our team will review your application within 5-7 business days.
        </p>
        <div className="flex gap-4">
          <Button size="lg" onClick={() => navigate('/signup')}>
            Start Application
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/privacy')}>
            Read Full Privacy Policy
          </Button>
        </div>
      </Card>

      {/* Questions */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Questions about the pilot?{' '}
          <button
            onClick={() => navigate('/support')}
            className="text-primary hover:underline font-medium"
          >
            Contact Support
          </button>
        </p>
      </div>
    </div>
  );
}
