import "./globals.css";
export const metadata = {
  title: "Singlerents",
  description: "Verified rooms for renters in Lagos",
};
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
