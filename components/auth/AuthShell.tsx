import Image from 'next/image'

/**
 * Split frame for the sign-in, join and password pages: the Tanglewood photo
 * under the landing page's brown overlay on one side, the form on the other.
 * Below `lg` the photo collapses to a short banner above the form.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-2">
      <aside className="relative h-40 overflow-hidden sm:h-52 lg:h-auto">
        <Image
          src="/tanglewood.jpg"
          alt="Tanglewood retreat center surrounded by Hill Country landscape"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#2C1810]/60" />
        <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 text-white lg:p-12">
          <p className="hidden text-xs uppercase tracking-[0.25em] text-white/80 sm:block">
            A Tres Dias Community in Central Texas
          </p>
          <p className="font-serif text-2xl font-semibold lg:hidden">
            Dusty Trails Tres Dias
          </p>
          <blockquote className="hidden max-w-md lg:block">
            <p className="font-serif text-3xl leading-snug">
              &ldquo;Being like-minded, having the same love, being one in
              spirit and of one mind.&rdquo;
            </p>
            <cite className="mt-4 block text-sm not-italic text-white/75">
              Philippians 2:2
            </cite>
          </blockquote>
        </div>
      </aside>

      <div className="flex justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
