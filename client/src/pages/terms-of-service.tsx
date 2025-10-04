import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <button 
            className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </Link>

        <div className="bg-card rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-terms-title">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="mb-3">
                By accessing and using Passport Photo Generator, you accept and agree to be bound by the terms 
                and provisions of this agreement. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
              <p className="mb-3">
                Passport Photo Generator is an online tool that helps users create passport-compliant photos. 
                We provide image processing, background removal, and formatting services for various passport 
                and ID photo requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Responsibilities</h2>
              <p className="mb-3">You agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not upload inappropriate, offensive, or copyrighted content</li>
                <li>Maintain the security of your account credentials</li>
                <li>Verify that generated photos meet official requirements before use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Photo Compliance</h2>
              <p className="mb-3">
                While we strive to generate passport photos that meet official requirements, it is your responsibility 
                to verify that the final photo complies with the specific requirements of your country or issuing authority. 
                We are not responsible for rejected applications due to photo non-compliance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
              <p className="mb-3">
                You retain all rights to the photos you upload. By using our service, you grant us a limited license 
                to process and store your photos solely for the purpose of providing our services. We do not claim 
                ownership of your content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Service Availability</h2>
              <p className="mb-3">
                We strive to maintain service availability but do not guarantee uninterrupted access. We reserve 
                the right to modify, suspend, or discontinue the service at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="mb-3">
                Passport Photo Generator is provided "as is" without warranties of any kind. We are not liable for 
                any direct, indirect, incidental, or consequential damages arising from your use of the service, 
                including but not limited to rejected passport applications or lost data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Payment and Refunds</h2>
              <p className="mb-3">
                If applicable, payment terms will be clearly stated before purchase. Refund policies, if any, 
                will be communicated at the time of transaction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Privacy</h2>
              <p className="mb-3">
                Your use of our service is also governed by our Privacy Policy. Please review our Privacy Policy 
                to understand our practices regarding your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Account Termination</h2>
              <p className="mb-3">
                We reserve the right to terminate or suspend your account at our discretion if you violate these 
                terms or engage in activities harmful to our service or other users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Modifications to Terms</h2>
              <p className="mb-3">
                We may modify these terms at any time. Changes will be effective immediately upon posting. 
                Your continued use of the service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Governing Law</h2>
              <p className="mb-3">
                These terms shall be governed by and construed in accordance with applicable laws, without 
                regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Contact Information</h2>
              <p className="mb-3">
                For questions regarding these Terms of Service, please contact us through our support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
