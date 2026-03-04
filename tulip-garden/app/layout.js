export const metadata = {
  title: 'Tulip Garden — Bitcoin Ordinals ASCII Garden',
  description: 'A collaborative ASCII tulip garden on Bitcoin. Rooted at @. Inspired by game.tulip.farm and Rogue (1980).',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#020a02' }}>{children}</body>
    </html>
  )
}
