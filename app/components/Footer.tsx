import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <b>⌂ singlerents</b>
        <p>A simpler way to find your next home.</p>
      </div>
      <div className="footer-links">
        <Link href="/#rooms">Find a room</Link>
        <Link href="/#how-it-works">How it helps</Link>
        <Link href="/register">List a room</Link>
        <Link href="/login">Log in</Link>
      </div>
      <span className="copyright">© 2026 Singlerents. All rights reserved.</span>
    </footer>
  );
}
