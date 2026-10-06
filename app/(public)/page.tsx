import { Suspense } from 'react'
import { Mail, Heart, BookOpen, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { UpcomingWeekends, UpcomingWeekendsSkeleton } from './upcoming-weekends'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero — full-bleed with tall image */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/tanglewood.jpg"
          alt="Tanglewood retreat center surrounded by Hill Country landscape"
          className="absolute inset-0 object-cover w-full h-full"
          width={1920}
          height={1080}
          priority
        />
        <div className="absolute inset-0 bg-[#2C1810]/60" />

        <div className="relative z-10 text-center px-6 py-20 max-w-3xl mx-auto">
          <p className="text-white/80 uppercase tracking-[0.25em] text-sm mb-4">
            A Tres Dias Community in Central Texas
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Dusty Trails
            <br />
            Tres Dias
          </h1>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-xl mx-auto mb-10">
            A place where Christians gather for spiritual renewal, fellowship,
            and encouragement in faith.
          </p>
          <Button
            href="/login"
            size="lg"
            className="bg-white text-[#3D2B1F] hover:bg-white/90 text-base px-8 py-6"
          >
            Community Login
          </Button>
        </div>
      </section>

      {/* Scripture banner */}
      <section className="bg-secondary py-10 px-6">
        <blockquote className="max-w-2xl mx-auto text-center">
          <p className="text-lg md:text-xl italic text-secondary-foreground leading-relaxed">
            &ldquo;For in Christ all the fullness of the Deity lives in bodily
            form, and in Christ you have been brought to fullness. He is the
            head over every power and authority.&rdquo;
          </p>
          <cite className="block mt-3 text-sm font-medium text-secondary-foreground/70 not-italic">
            Colossians 2:9-10
          </cite>
        </blockquote>
      </section>

      {/* What is Tres Dias */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What is Tres Dias?
            </h2>
            <Separator className="w-16 mx-auto mb-6 bg-primary" />
            <p className="text-muted-foreground text-lg leading-relaxed">
              Tres Dias is an international Christian movement designed to train
              Christian leaders to serve in their communities.
            </p>
          </div>

          {/* Three pillars */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Spiritual Renewal
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Fifteen talks exploring life in Christian grace, supported by
                worship, prayer, and personal reflection.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Authentic Community
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Build deep, lasting friendships with fellow believers in a
                supportive and encouraging environment.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Living Faith
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Discover practical ways to carry your renewed faith back into
                your everyday life, family, and church.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming weekends */}
      <section className="bg-muted py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Upcoming Weekends
          </h2>
          <Separator className="w-16 mx-auto mb-6 bg-primary" />
          <p className="text-muted-foreground text-lg mb-10">
            Get in touch with our team to figure out how you can help pray for
            our upcoming weekend events.
          </p>

          <Suspense fallback={<UpcomingWeekendsSkeleton />}>
            <UpcomingWeekends />
          </Suspense>

          <Button
            href="mailto:admin@dustytrailstresdias.org"
            className="mt-10 text-base px-8 py-6"
            size="lg"
          >
            Reach Out to Our Team
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Get Involved
          </h2>
          <Separator className="w-16 mx-auto mb-6 bg-primary" />
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Whether you&apos;re looking to attend a weekend, sponsor someone you
            care about, or serve on a team &mdash; there&apos;s a place for you
            in our community.
          </p>

          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Mail className="w-5 h-5" />
            <Link
              href="mailto:admin@dustytrailstresdias.org"
              className="text-primary hover:underline font-medium"
            >
              admin@dustytrailstresdias.org
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
