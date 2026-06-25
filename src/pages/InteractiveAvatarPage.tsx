import { useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { motion } from 'framer-motion'

const avatarId = import.meta.env.VITE_HAYGEN_AVATAR_ID || 'dexter'
const configuredEmbedUrl = import.meta.env.VITE_HAYGEN_EMBED_URL || ''

export default function InteractiveAvatarPage() {
  const iframeSrc = useMemo(() => {
    if (configuredEmbedUrl) {
      return configuredEmbedUrl
    }

    const normalized = avatarId.trim().toLowerCase()
    return `https://app.haygen.com/embed/avatar/${normalized}?autoplay=1&controls=1`
  }, [])

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Immersive</p>
            <h1 className="text-4xl font-heading font-bold text-black mb-2">
              Interactive Avatar
            </h1>
            <p className="text-black/60">
              Meet Amina, your 3D virtual wellness guide powered by Haygen’s live avatar platform.
            </p>
          </div>
          <InfoDialogButton
            title="About Amina"
            description="Amina can walk users through appointments, deals, and key features."
            points={[
              'Use the controls beside the avatar to start or pause the experience.',
              'Amina can respond to scripted prompts that you configure within Haygen.',
              'Update the embed settings or session token in the Haygen dashboard at any time.',
            ]}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none" />
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title="Haygen Interactive Avatar"
            allow="camera; microphone; fullscreen; autoplay"
            className="relative z-10 h-[540px] w-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </motion.div>
      </div>
    </div>
  )
}


