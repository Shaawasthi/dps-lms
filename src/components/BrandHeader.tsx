import Image from 'next/image'

export default function BrandHeader({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-3 px-3 py-3 border-b border-gray-200">
        <Image
          src="/dps-logo.png"
          alt="DPS"
          width={34}
          height={34}
          className="rounded-full flex-shrink-0"
        />
        <Image
          src="/eq-logo.png"
          alt="Equanimity Learning"
          width={40}
          height={40}
          className="rounded-full flex-shrink-0"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-5 mb-8">
      <Image
        src="/dps-logo.png"
        alt="DPS"
        width={80}
        height={80}
        className="rounded-full"
      />
      <div className="w-px h-14 bg-gray-200" />
      <Image
        src="/eq-logo.png"
        alt="Equanimity Learning"
        width={96}
        height={96}
        className="rounded-full"
      />
    </div>
  )
}
