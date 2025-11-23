export const metadata = {
  title: 'BattleTech Unit Customizer',
  description: 'Customize and build BattleTech units',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
