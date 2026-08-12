import "./globals.css";
export const metadata = {
  title: "SingleRents | Find a room that feels like home",
  description: "Verified rooms for renters in Lagos",
};
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
