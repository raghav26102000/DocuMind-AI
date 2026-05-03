// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Your main global CSS file
import Header from "./Header/page"; // Adjust path if Header is in a different location
import Footer from "./Footer/page"; // Adjust path if Footer is in a different location
import BootstrapClient from "./bootstrap-client"; // Assuming this is for Bootstrap JS integration
import { Barlow_Condensed } from "next/font/google"; // Your chosen font

// Updated import path for the new FloatingChatbot component
import FloatingChatbot from "./chatbot/GlobalChatbot";

const barlow_condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "Saral Sewa",
  description: "Your portal for government schemes and services",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlow_condensed.variable}`}>
      <body>
        {/*
          This div acts as the main container for your application.
          'relative' helps in positioning any absolute children correctly,
          though not strictly necessary for the 'fixed' chatbot.
          'min-h-screen flex flex-col' ensures your content pushes the footer
          to the bottom and fills the viewport.
        */}
        <div className="relative min-h-screen flex flex-col">
          {/* Your main application Header */}
          <Header />
          
          {/* The main content area where your pages will be rendered */}
          <main className="flex-1">
            {children}
          </main>
          
          {/* Your main application Footer */}
          <Footer />
          
          {/*
            The FloatingChatbot component. It uses 'fixed' positioning and
            a high z-index to float above all other content.
            It's placed here so it's part of the main layout and always present.
            The new component includes:
            - Floating button that appears on every page
            - Sidebar that slides in from the right
            - Three-panel interface (main, chat, feedback)
            - Colorful gradient design with purple theme
            - Predefined questions for quick access
            - Star rating system for feedback
            - Smooth animations and hover effects
          */}
          <FloatingChatbot />
        </div>

        {/*
          BootstrapClient usually handles global Bootstrap JS. Keep it here
          if it needs to be at the end of the <body>.
        */}
        <BootstrapClient />
      </body>
    </html>
  );
}