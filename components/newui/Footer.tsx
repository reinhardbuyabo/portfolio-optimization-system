export default function Footer() {
  return (
    <footer className="container py-8 border-t border-border">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} LSTM-GARCH Platform. All rights reserved.</p>
        <div className="flex gap-6">
          <button className="hover:text-foreground transition-colors">Privacy Policy</button>
          <button className="hover:text-foreground transition-colors">Terms of Service</button>
          <button className="hover:text-foreground transition-colors">Contact</button>
        </div>
      </div>
    </footer>
  );
}
