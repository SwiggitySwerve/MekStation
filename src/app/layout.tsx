import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'BattleTech Unit Customizer',
  description: 'Customize and build BattleTech units',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-[var(--surface-base)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
