import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Home } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground">
              <Home className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold">Bait to Maintain</span>
          </div>
        </div>

        <Card>
          <CardContent className="prose prose-sm max-w-none p-6 md:p-8 dark:prose-invert">
            <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm mb-6">Last updated: April 12, 2026</p>

            <h2>1. Information We Collect</h2>
            <p>Bait to Maintain collects the following categories of personal data:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, password (hashed)</li>
              <li><strong>Property Data:</strong> Property details, addresses, rental amounts, unit information</li>
              <li><strong>Tenant Information:</strong> Tenant names, contact numbers, email addresses, Emirates ID numbers, nationality, company details, emergency contacts</li>
              <li><strong>Financial Data:</strong> Rent amounts, cheque details, expense records, security deposits</li>
              <li><strong>Usage Data:</strong> Page views, login timestamps, device information (user agent)</li>
            </ul>

            <h2>2. How We Use Your Data</h2>
            <p>We use collected data to:</p>
            <ul>
              <li>Provide property management services</li>
              <li>Process and track rental payments and expenses</li>
              <li>Generate reports and analytics for property owners</li>
              <li>Send maintenance and announcement notifications</li>
              <li>Improve platform performance and user experience</li>
            </ul>

            <h2>3. Data Storage & Security</h2>
            <p>Your data is stored on Google Firebase infrastructure with the following protections:</p>
            <ul>
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Role-based access control (RBAC) with 6 permission levels</li>
              <li>Firestore security rules enforcing data isolation between users</li>
              <li>30-minute idle session timeout</li>
              <li>File upload validation and size restrictions</li>
            </ul>

            <h2>4. Data Sharing</h2>
            <p>We do not sell your personal data. Data may be shared with:</p>
            <ul>
              <li><strong>Property team members:</strong> Based on role-based permissions set by the property owner</li>
              <li><strong>Service providers:</strong> Google Firebase for hosting and data storage</li>
              <li><strong>Legal obligations:</strong> When required by UAE law or court order</li>
            </ul>

            <h2>5. Data Retention</h2>
            <ul>
              <li><strong>Active accounts:</strong> Data retained while your account is active</li>
              <li><strong>Analytics & login events:</strong> Automatically deleted after 12 months</li>
              <li><strong>Deleted accounts:</strong> Personal data purged within 30 days of account deletion</li>
              <li><strong>Audit logs:</strong> Retained for 3 years for legal compliance</li>
            </ul>

            <h2>6. Your Rights (UAE PDPL)</h2>
            <p>Under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021), you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Restriction:</strong> Request restriction of data processing</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
            </ul>
            <p>To exercise these rights, use the "Request My Data" feature in Settings, or contact us at the email below.</p>

            <h2>7. Cross-Border Data Transfer</h2>
            <p>Your data may be processed on Google Cloud servers located outside the UAE. We rely on Google's data processing agreements and security certifications to ensure adequate protection in compliance with UAE PDPL requirements.</p>

            <h2>8. Cookies & Local Storage</h2>
            <p>Bait to Maintain uses browser local storage to save your preferences (language, currency, date format). We do not use third-party tracking cookies.</p>

            <h2>9. Children's Privacy</h2>
            <p>Bait to Maintain is not intended for use by individuals under 18 years of age.</p>

            <h2>10. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Material changes will be communicated via in-app announcement.</p>

            <h2>11. Contact</h2>
            <p>For privacy-related inquiries, contact your platform administrator or email the data protection officer at the address provided in your account settings.</p>

            <div className="mt-8 p-4 rounded-lg bg-muted text-sm text-muted-foreground">
              <p className="font-medium">&#x26A0;&#xFE0F; Legal Review Required</p>
              <p>This privacy policy is a template and should be reviewed by a qualified legal professional familiar with UAE data protection law before publication.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
