import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface CommunityEmailProps {
  communityName: string
  /** Sanitized HTML from the community email editor. */
  bodyHtml: string
  /** Inbox preview line; the subject when there is nothing better. */
  previewText: string
  unsubscribeUrl: string
}

/**
 * The layout every community email (Admin → Email) is sent in: the community
 * name as a header, the admin's text, and a footer with the unsubscribe link
 * that the bulk-sender rules require.
 *
 * The body is HTML from the editor, so Tailwind classes can't reach it; the
 * <style> block below gives its tags the same look instead.
 */
export default function CommunityEmail({
  communityName,
  bodyHtml,
  previewText,
  unsubscribeUrl,
}: CommunityEmailProps) {
  return (
    <Html>
      <Head>
        <style>{`
          .community-email-body { color: #374151; font-size: 16px; line-height: 1.6; }
          .community-email-body p { margin: 0 0 16px; }
          .community-email-body h2 { color: #111827; font-size: 20px; font-weight: 600; margin: 24px 0 12px; }
          .community-email-body h3 { color: #111827; font-size: 17px; font-weight: 600; margin: 20px 0 8px; }
          .community-email-body ul, .community-email-body ol { margin: 0 0 16px; padding-left: 24px; }
          .community-email-body li { margin: 0 0 4px; }
          .community-email-body li p { margin: 0; }
          .community-email-body a { color: #2563eb; text-decoration: underline; }
          .community-email-body blockquote { border-left: 3px solid #d1d5db; margin: 0 0 16px; padding-left: 12px; color: #4b5563; }
          .community-email-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] py-8 px-4">
            <Section className="text-center mb-6">
              <Heading className="text-2xl font-bold text-gray-900 m-0">
                {communityName}
              </Heading>
            </Section>

            <Hr className="border-gray-200 mb-6" />

            <Section>
              <div
                className="community-email-body"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </Section>

            <Hr className="border-gray-200 my-8" />

            <Section className="text-center">
              <Text className="text-xs text-gray-500 m-0 mb-2">
                You&apos;re receiving this because you&apos;re part of the{' '}
                {communityName} community. Reply to this email to reach the
                sender.
              </Text>
              <Text className="text-xs text-gray-500 m-0">
                <Link href={unsubscribeUrl} className="text-gray-500 underline">
                  Unsubscribe from community emails
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
