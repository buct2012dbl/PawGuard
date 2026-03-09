import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "../contexts/Web3Context";
import Navigation from "../components/Navigation";

export const metadata: Metadata = {
  title: "PawGuard - Decentralized Pet Insurance",
  description: "Blockchain-based pet insurance platform with NFT pet identities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body">
        <Web3Provider>
          <Navigation />
          <main className="min-h-screen bg-void">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
