export default function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>
            <a href="/company.html" className="hover:text-cyan-500">2025© Invariant Ego, LLC.</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/company.html" className="hover:text-cyan-600 transition-colors">
              Company
            </a>
            <a href="/PrivacyPolicy.html" className="hover:text-emerald-600 transition-colors">
              Privacy
            </a>
            <a href="/MITlicense.html" className="hover:text-emerald-600 transition-colors">
              License
            </a>
            <a href="mailto:support@callaback.com" className="hover:text-emerald-600 transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
