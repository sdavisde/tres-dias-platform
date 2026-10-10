## [1.64.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.63.1...v1.64.0) (2026-10-10)

### Features

- **secuela:** invite members to volunteer after secuela ([caec27b](https://github.com/sdavisde/tres-dias-platform/commit/caec27b4257bf6e1a6d24163b81c037e95cedd27))

## [1.63.1](https://github.com/sdavisde/tres-dias-platform/compare/v1.63.0...v1.63.1) (2026-10-10)

### Bug Fixes

- **secuela:** open sign-in at the start time instead of 30 minutes early ([d8392b6](https://github.com/sdavisde/tres-dias-platform/commit/d8392b66ad9a037e19e2c070a0702c20d48519fd))

## [1.63.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.62.1...v1.63.0) (2026-10-06)

### Features

- improve the time and date fields ([9cfc3d5](https://github.com/sdavisde/tres-dias-platform/commit/9cfc3d5c5b8ff107ee2783e2a9f0bc9e2e34a3ed))

## [1.62.1](https://github.com/sdavisde/tres-dias-platform/compare/v1.62.0...v1.62.1) (2026-10-06)

### Bug Fixes

- **home:** drop sign-in opening note from upcoming secuela banner ([b59b680](https://github.com/sdavisde/tres-dias-platform/commit/b59b6809a1b66d4685723702d3d77ef1d4c66db1))

## [1.62.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.61.0...v1.62.0) (2026-10-06)

### Features

- **home:** advertise the active group's secuela on the member home page ([a49b6c6](https://github.com/sdavisde/tres-dias-platform/commit/a49b6c68f4478cb6149d4f47ce1732bc9570c490))
- **secuela:** admin Secuela page and event-window attendance ([f1e5181](https://github.com/sdavisde/tres-dias-platform/commit/f1e5181355e25132559aecfc84cff4c5919f9065))

## [1.61.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.60.0...v1.61.0) (2026-10-06)

### Features

- **users:** track ordained clergy on user profiles ([bc5aa4a](https://github.com/sdavisde/tres-dias-platform/commit/bc5aa4a30175cf66ed065839e99666b0527b334f))

### Bug Fixes

- **roster-builder:** don't count early secuela sign-ups as attendance ([3c15274](https://github.com/sdavisde/tres-dias-platform/commit/3c15274aad9b6a3e6ec2e142dafe4305ce437240))

## [1.60.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.59.1...v1.60.0) (2026-10-06)

### Features

- **secuela:** show which group and secuela the sign-in page is for ([74a1b86](https://github.com/sdavisde/tres-dias-platform/commit/74a1b8635553fcc29c758ce03a8f3cb127482f50))
- **shell:** admin link in the mobile top bar, fill gap below tab bar ([6fb06a6](https://github.com/sdavisde/tres-dias-platform/commit/6fb06a6f323d2e694b831a14947a0711abb9c4c7))

## [1.59.1](https://github.com/sdavisde/tres-dias-platform/compare/v1.59.0...v1.59.1) (2026-10-05)

### Bug Fixes

- **layout:** set font variables on the html element ([484354a](https://github.com/sdavisde/tres-dias-platform/commit/484354a0a9bc4e8824333eeb1d23cdb8af9beac0))

## [1.59.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.58.0...v1.59.0) (2026-10-05)

### Features

- **landing:** show the active weekend group and its secuela ([2e3fe54](https://github.com/sdavisde/tres-dias-platform/commit/2e3fe5474ad2b460ca167158466ccc0db8e560ea)), closes [#10](https://github.com/sdavisde/tres-dias-platform/issues/10)

## [1.58.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.57.0...v1.58.0) (2026-10-04)

### Features

- **auth:** split photo layout for sign-in, join and password pages ([7355402](https://github.com/sdavisde/tres-dias-platform/commit/735540250b2deca8b273624777a09969708a5beb))

## [1.57.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.56.0...v1.57.0) (2026-10-04)

### Features

- **admin:** export the People roster as CSV ([fa59348](https://github.com/sdavisde/tres-dias-platform/commit/fa593480351bff11c9b42064a7f819a45caf2a36))

## [1.56.0](https://github.com/sdavisde/tres-dias-platform/compare/v1.55.1...v1.56.0) (2026-09-28)

### Features

- **auth:** map GoTrue errors to owned messages with remediation hints ([50dd2da](https://github.com/sdavisde/tres-dias-platform/commit/50dd2da1b3db57f332946fabde8809e6037a6c8c))
- **billing:** add the admin Billing page ([8a3f77a](https://github.com/sdavisde/tres-dias-platform/commit/8a3f77aa167611acdee229e64f827ef056c52d8a))
- **billing:** add the platform billing webhook ([4664898](https://github.com/sdavisde/tres-dias-platform/commit/4664898ce785d588452299ec2c4430649b629b7f))
- **billing:** add the platform Stripe client and MANAGE_BILLING permission ([bfc18f5](https://github.com/sdavisde/tres-dias-platform/commit/bfc18f59791e1ee2b3a53317829ddf9f02d0ee8a))
- **billing:** mirror the platform subscription in billing_account ([fd74e16](https://github.com/sdavisde/tres-dias-platform/commit/fd74e161ab9658ea9403c66203cc05f1168428ac))
- **billing:** sync subscription state from Stripe and shape it for the page ([7c90b02](https://github.com/sdavisde/tres-dias-platform/commit/7c90b024e5c17510c2e4d17cccdf8b18980dd4c9))
- **billing:** warn on the dashboard when the platform payment fails ([4967f1e](https://github.com/sdavisde/tres-dias-platform/commit/4967f1e407a6b7d9568941c7674d987db40970bb))
- **payments:** share the checkout metadata builder and ignore replayed webhooks ([3a8058b](https://github.com/sdavisde/tres-dias-platform/commit/3a8058b469cc7bf3388d4b9cc27bbd6081607113))
- **seed:** generate date-relative local seed data by weekend phase ([8a2c7e0](https://github.com/sdavisde/tres-dias-platform/commit/8a2c7e0a6c498e078c1a54204186a3519e117d61))
- **sentry:** report handled failures and tag events with the user ([ba91841](https://github.com/sdavisde/tres-dias-platform/commit/ba918417e3b0e21fdf8d444148cde061ca5ae85b))

### Bug Fixes

- **release:** point semantic-release at the renamed GitHub repository ([aa313cf](https://github.com/sdavisde/tres-dias-platform/commit/aa313cf98a4345a8d14ef68f53a9188dd3114f5d))
- **security:** close the redirect bypass and block FULL_ACCESS self-grants ([495db8b](https://github.com/sdavisde/tres-dias-platform/commit/495db8b7ec1d8d8ef93df0595d1856978676314c))
- **security:** gate every remaining server action against the session ([707b771](https://github.com/sdavisde/tres-dias-platform/commit/707b771975cfe0da53a527355026710b5b20cc66))
- **security:** move the public candidate flows to the admin client and finish anon revocation ([8cb8429](https://github.com/sdavisde/tres-dias-platform/commit/8cb842989980644ea1a41fbcb2f673ff8a0a8747))
- **security:** raise the password minimum, validate auth redirects and gate file downloads ([314a0de](https://github.com/sdavisde/tres-dias-platform/commit/314a0defa029e247bd7da6480a819531609300d4))
- **security:** require app permissions for every remaining authenticated write ([aa08676](https://github.com/sdavisde/tres-dias-platform/commit/aa08676e3c3b81bf575a5e5bd7c2bd8e100128f7))
- **security:** require permissions for role, user and storage writes and revoke anon access ([98a1cba](https://github.com/sdavisde/tres-dias-platform/commit/98a1cba0b58c07a58cb82a6b382c5024186b4f7e))
- **security:** sign the impersonation cookie and re-verify the admin on every read ([d891e41](https://github.com/sdavisde/tres-dias-platform/commit/d891e41cbc8c62d2e189333d795dfc8cb86a9a22))
- **server:** raise the default listener limit past the per-request close listeners ([f937108](https://github.com/sdavisde/tres-dias-platform/commit/f937108049b780bb618e488661081733f2eb1b6e))

## [1.55.1](https://github.com/[secure]/dttd/compare/v1.55.0...v1.55.1) (2026-09-25)

### Bug Fixes

- **proxy:** exclude Link prefetches through the matcher, not a header check ([d459bd2](https://github.com/[secure]/dttd/commit/d459bd2636546dcdb00fa409d118be411e476e08))
- **release:** keep the conventionalcommits preset on 9.x for semantic-release ([bef5382](https://github.com/[secure]/dttd/commit/bef5382d59599f6eade6adc428d8e126b2c7f4be))
- **release:** merge the semantic-release preset pin from preview ([6eebb77](https://github.com/[secure]/dttd/commit/6eebb77479e41546039c2c3c6607aad356fa6ac7))

### Performance Improvements

- **auth:** stop paying a GoTrue call per prefetch and per navigation ([e5b1e7a](https://github.com/[secure]/dttd/commit/e5b1e7a8fd7756a5719613d3affb3a8798d662fe))
- **cache:** share weekend, event, role, setting and fee reads across requests ([b357d46](https://github.com/[secure]/dttd/commit/b357d467c9b311fe8534d2c458bc3ef78b8c8b93))
- **caching:** merge the caching layers from preview ([a0a4b19](https://github.com/[secure]/dttd/commit/a0a4b196fd1881d3acbe8700499b244baef01a75))
- **hub:** prefetch tabs on intent and reuse visited tabs for a minute ([290ff09](https://github.com/[secure]/dttd/commit/290ff090f4206eb9bb9c9f7e5e7f3c27242a057a))
- **hub:** resolve the group without the viewer and link straight to the overview ([0462fd4](https://github.com/[secure]/dttd/commit/0462fd4c75021a80c2434a683228a04a320c56aa))
- **roster:** batch the per-row roster and candidate lookups ([c295d4b](https://github.com/[secure]/dttd/commit/c295d4badb12f362864cb995f7c7d8fcdcd6c81e))

## [1.55.0](https://github.com/sdavisde/dttd/compare/v1.54.1...v1.55.0) (2026-09-25)

### Features

- **payments:** charge online checkout from the group's fees ([0f6a80d](https://github.com/sdavisde/dttd/commit/0f6a80dad7a0f4cb55415bc68818f7effcb7851a))
- **payments:** merge per-group weekend fees from preview ([e874cd0](https://github.com/sdavisde/dttd/commit/e874cd0f221326dc295a39933b650812cec2efdf))
- **payments:** store fees per weekend group and track balances across groups ([3817041](https://github.com/sdavisde/dttd/commit/3817041b88aedbeae7c6368b8d85fbeb2452c319)), closes [#13](https://github.com/sdavisde/dttd/issues/13) [#12](https://github.com/sdavisde/dttd/issues/12) [#13](https://github.com/sdavisde/dttd/issues/13)

## [1.54.1](https://github.com/sdavisde/dttd/compare/v1.54.0...v1.54.1) (2026-09-24)

### Bug Fixes

- **admin:** hold the secuela action item until a month before the weekend ([08fc3bc](https://github.com/sdavisde/dttd/commit/08fc3bc110506cb96207dbd2e952d9939318141c))

## [1.54.0](https://github.com/sdavisde/dttd/compare/v1.53.0...v1.54.0) (2026-09-24)

### Features

- **admin:** auto-save the remaining admin editors ([4aad3ce](https://github.com/sdavisde/dttd/commit/4aad3ced7b9a7721b896241690dd21c042a49de6))
- **candidates:** review queue under the weekend hub ([4f236b0](https://github.com/sdavisde/dttd/commit/4f236b044dde2e3c22e25ced9b261e81fb4c2762))
- **files:** browse-only documents page on the admin file browser ([d35b29d](https://github.com/sdavisde/dttd/commit/d35b29db30db9e37549e1a074b30aac9bbff11e3))
- **member:** hub layout, your-part actions, online payment and nav cleanup ([e55b354](https://github.com/sdavisde/dttd/commit/e55b35408190821e049343fb477335ca18019294))
- **member:** merge the member redesign from preview ([6ba81aa](https://github.com/sdavisde/dttd/commit/6ba81aaac7c5193f83ee3c2d64b5c6b92dccf131))
- **people:** auto-save the person editor instead of a Save button ([63a1705](https://github.com/sdavisde/dttd/commit/63a1705c2891be46fdcd37b1f03bbeb0a400046f))
- **security:** inherit once in the header, checklist per area, can/can't summary ([4559325](https://github.com/sdavisde/dttd/commit/4559325699c0680bbe997c7eb4ed90d40e63caa8))
- **shell:** member sidebar, top bar, tab bar and breadcrumbs ([6c4e1cb](https://github.com/sdavisde/dttd/commit/6c4e1cba2970d0a1acd2ddec4fd3442ba1391671))
- **sponsor:** redesign the sponsor form and thank-you page ([8812716](https://github.com/sdavisde/dttd/commit/8812716bba4d0989df0277c948ddf80b5cb84fda))
- **weekends:** member weekend hub with overview, schedule, team and candidates ([7acf829](https://github.com/sdavisde/dttd/commit/7acf8294d69c84cac3bf776bcdb0a519a4f3f2de))

### Bug Fixes

- **community-board:** keep the role assignment dialog inside the viewport ([72759b0](https://github.com/sdavisde/dttd/commit/72759b07f207b2f1022fc67fac2c02a490222517))
- **layout:** stop member pages spilling horizontally ([2d790d6](https://github.com/sdavisde/dttd/commit/2d790d615a40985fe3d2b7676818147c6cb56f7d))
- **member:** conformance and correctness pass on shell, hub and review ([62c4cf3](https://github.com/sdavisde/dttd/commit/62c4cf394aac3f4499d3dd61fcbf1825ac5f9ab8))
- **security:** render the inheritance note outside the form field context ([10ce2ec](https://github.com/sdavisde/dttd/commit/10ce2ec18e84e1dd2d06b57e6980c2b77af998bb))

## [1.53.0](https://github.com/sdavisde/dttd/compare/v1.52.2...v1.53.0) (2026-09-23)

### Features

- **admin:** add dashboard alerts banner, real storage metric, and action items ([d069876](https://github.com/sdavisde/dttd/commit/d069876da46386106a6820ccafa5552624265047))
- **admin:** copy join link, community permission gating and real site settings ([6eb22dd](https://github.com/sdavisde/dttd/commit/6eb22dda3ff53a4e5bdf97870e99c0f4d8586ebb))
- **admin:** copy-link on page headers, board sidebar, to-review stat and weekend hub frame ([87f4a54](https://github.com/sdavisde/dttd/commit/87f4a545e132b4f3d7e39fcab39e4fe58dcc5d37))
- **admin:** dashboard calendar card, storage tile and secuela item; events mobile agenda ([b75d3da](https://github.com/sdavisde/dttd/commit/b75d3dadbe6cd6909d7ca47dc4bf75bc127370c0))
- **admin:** merge the admin redesign from preview ([8af6674](https://github.com/sdavisde/dttd/commit/8af66747e787911e7d48383787664cd5ff749a91))
- **admin:** move the copy-link button from the page header to the breadcrumbs ([eab4fc3](https://github.com/sdavisde/dttd/commit/eab4fc3d92bc489062eb7738c0a86333c1fdc179))
- **admin:** rebuild dashboard as the board's back office ([c81d1b8](https://github.com/sdavisde/dttd/commit/c81d1b81b100aae640da3e0c3853bf35deba3139))
- **admin:** rebuild weekends page for board work ([2662477](https://github.com/sdavisde/dttd/commit/266247777219030b7f199e22a64f94a4d9614916))
- **admin:** replace admin shell with final navigation and warm sidebar ([c747f43](https://github.com/sdavisde/dttd/commit/c747f4338bb9f001696ebefa383268aa289bf621))
- **admin:** replace users page with the new People page ([42e49ad](https://github.com/sdavisde/dttd/commit/42e49ad64e43028bd7de03b401f5aa05c5203378))
- **admin:** weekends fees-open uses the per-person list; files menu goes first ([5450933](https://github.com/sdavisde/dttd/commit/5450933ef66dba5d9cfa96ade5ca1c2ea7c3d96c))
- **avatar:** show name, email and phone in the avatar hover card ([f31aab0](https://github.com/sdavisde/dttd/commit/f31aab0718dd1108ca4b19321158d74933e552c9))
- **branding:** show color-inverted favicon on Vercel preview deployments ([12996c7](https://github.com/sdavisde/dttd/commit/12996c72abcac3a8898fd618c4836d0a2864dd4f))
- **community:** add a committee or team from the Community page ([d947c90](https://github.com/sdavisde/dttd/commit/d947c904ebc1b5884c2f7c3e075537ca48c5bf28))
- **community:** compact minutes list, member counts and first-column row menu ([25d912c](https://github.com/sdavisde/dttd/commit/25d912c173193c77247c85651d1222050647713c))
- **design:** warm admin sidebar tokens and add design-system conventions doc ([88b341f](https://github.com/sdavisde/dttd/commit/88b341f341f2c7f99a0e693931ce1587c8ef328f))
- **email:** log every email send through a single sendEmail wrapper ([7531ea8](https://github.com/sdavisde/dttd/commit/7531ea8ffab48a14e81cd2b34ce2d892be3443d3))
- **files:** replace the All files view with a pick-a-folder empty state ([3ef1461](https://github.com/sdavisde/dttd/commit/3ef1461bfbad6d610ad890ebf2c7376f8b337175))
- **files:** single-page folder browser with rail, nested folders and mobile cards ([3c48549](https://github.com/sdavisde/dttd/commit/3c485495364651f22ab559954f20265200c10f95))
- **payments:** open the payment summary from a fourth stat tile ([cc56c9f](https://github.com/sdavisde/dttd/commit/cc56c9f8f932a32babb7e1c6a48b369c570046ef))
- **payments:** per-person outstanding on the dashboard and a CHA role column ([5eda9ff](https://github.com/sdavisde/dttd/commit/5eda9ff8942dda6381ede424aa9a01e61902fd91))
- **payments:** rebuild the ledger per the PaymentsA board with waived and outstanding fees ([e8aa2c4](https://github.com/sdavisde/dttd/commit/e8aa2c4d2aeff84b52db81f161e1ab04194d8f8b))
- **people:** inline person editor with collapsible sections and role chips ([7365df3](https://github.com/sdavisde/dttd/commit/7365df3ede199fed7adf6d1b11216ae051073adc))
- **security:** rebuild the Security page with role inheritance and permission ladders ([f11fb8e](https://github.com/sdavisde/dttd/commit/f11fb8ea71f4f55f6b9706ab4c0f44afeeb58f57))

### Bug Fixes

- **admin:** stop community board spilling right; trim site settings ([e78500f](https://github.com/sdavisde/dttd/commit/e78500fb4278428132047602a78df57f3a013629))
- **admin:** stop wide tables from stretching the page horizontally ([6e92317](https://github.com/sdavisde/dttd/commit/6e92317ea5b535ef21f2337458c5cddbfdc01874))
- **files:** list every file under All files instead of repeating the folder rail ([0fabca9](https://github.com/sdavisde/dttd/commit/0fabca9e4361ef666235d40fdaeea149ad53e664))

## [1.52.2](https://github.com/sdavisde/dttd/compare/v1.52.1...v1.52.2) (2026-09-02)

### Performance Improvements

- **loading:** parallelize page waterfalls and stream roster views ([8fb16cf](https://github.com/sdavisde/dttd/commit/8fb16cf53a7ee3edf4e6950765433282e582117a))

## [1.52.1](https://github.com/sdavisde/dttd/compare/v1.52.0...v1.52.1) (2026-09-01)

### Bug Fixes

- **navbar:** stop toast listener router dispatch crashing Next router ([88ea77a](https://github.com/sdavisde/dttd/commit/88ea77a8250096b1bbd34116bebd3f0ee20361ac))
- **routing:** remove post-flush redirects and unflagged history dispatches ([62c6b8d](https://github.com/sdavisde/dttd/commit/62c6b8d7a989a70b60e42764570d77d0fa4d7327))

### Performance Improvements

- **loading:** stream public shell and dedupe per-request auth fetches ([5f8ed79](https://github.com/sdavisde/dttd/commit/5f8ed79dbec9f66028ff3d524336f8f157db01d4))

## [1.52.0](https://github.com/sdavisde/dttd/compare/v1.51.0...v1.52.0) (2026-09-01)

### Features

- **roster:** expand team forms column into filterable sub-columns ([6be8c28](https://github.com/sdavisde/dttd/commit/6be8c287b8c9b8c2def690a9090ebe3ebef3544e))

## [1.51.0](https://github.com/sdavisde/dttd/compare/v1.50.0...v1.51.0) (2026-09-01)

### Features

- **roster:** show team member church and sort export by CHA role ([017a823](https://github.com/sdavisde/dttd/commit/017a823281dd2c14c43bffcbc197bdb7297b1442))

## [1.50.0](https://github.com/sdavisde/dttd/compare/v1.49.1...v1.50.0) (2026-08-31)

### Features

- **auth:** let users change their account email ([79c673d](https://github.com/sdavisde/dttd/commit/79c673d130f5f89cfded273b1906917f835041b2))
- **security:** allow anyone to export candidate and roster lists ([8f258d1](https://github.com/sdavisde/dttd/commit/8f258d1caac6585a632ca5481a599195cdff8e64))
- **ui:** warm design foundation and profile settings redesign ([448bdc3](https://github.com/sdavisde/dttd/commit/448bdc31e41299e843d39144d9f2f193c7bb0730))

### Bug Fixes

- **auth:** keep public.users email in sync when auth email changes ([8edc7ca](https://github.com/sdavisde/dttd/commit/8edc7ca49f1fda2edda9832526e02ccd58d24734))
- **supabase:** unblock release config push and keep Resend SMTP in sync ([ef8c699](https://github.com/sdavisde/dttd/commit/ef8c699e4a30a0a13646be5be2a99afb765e2acf))

## [1.49.1](https://github.com/sdavisde/dttd/compare/v1.49.0...v1.49.1) (2026-08-29)

### Bug Fixes

- **payments:** derive payment weekends from roster placement, not gender ([795aca2](https://github.com/sdavisde/dttd/commit/795aca234c0651cfe75a7ed2e7fd05cd4b201827))

## [1.49.0](https://github.com/sdavisde/dttd/compare/v1.48.0...v1.49.0) (2026-08-29)

### Features

- **payments:** reassign, edit, and void payments from the admin table ([86ca1b8](https://github.com/sdavisde/dttd/commit/86ca1b8f59728b1fe11c32350ae0eba3b34a3c49))

### Bug Fixes

- **payments:** point the default sort at the column that exists ([1067203](https://github.com/sdavisde/dttd/commit/106720348798cf031a19cc6192ac3238a17ca401))

## [1.48.0](https://github.com/sdavisde/dttd/compare/v1.47.4...v1.48.0) (2026-08-21)

### Features

- **payments:** show who each payment was paid for and by ([d94386c](https://github.com/sdavisde/dttd/commit/d94386c60a8785e3790196aeb39c582723649647))

## [1.47.4](https://github.com/sdavisde/dttd/compare/v1.47.3...v1.47.4) (2026-08-12)

### Bug Fixes

- **payments:** cast weekend type comparison to weekend_type enum in backfill ([e932510](https://github.com/sdavisde/dttd/commit/e932510ec15aa0ff197a998aa0cf24c6154cf334))
- **payments:** tag manual cash/check payments with their weekend ([f620d80](https://github.com/sdavisde/dttd/commit/f620d8089854ce8aeeaaaa1c15b95239b477f8a1))

## [1.47.3](https://github.com/sdavisde/dttd/compare/v1.47.2...v1.47.3) (2026-08-02)

### Bug Fixes

- **ui:** pin table and form dates to en-US MM/DD/YYYY ([eb21146](https://github.com/sdavisde/dttd/commit/eb21146ef7fb7b8d544ec237c822dadf0ad2a487))
- **ui:** standardize date input components on MM/DD/YYYY ([5c3233c](https://github.com/sdavisde/dttd/commit/5c3233c22e9408407aefc35ad9afa939939bcf1c))
- **weekend:** serialize weekend dates from the local calendar day ([d4604b6](https://github.com/sdavisde/dttd/commit/d4604b67bbdf6cf3046afd83e762fd951c4254f5))

## [1.47.2](https://github.com/sdavisde/dttd/compare/v1.47.1...v1.47.2) (2026-07-15)

### Bug Fixes

- make payment owner editable on candidate review page ([667269b](https://github.com/sdavisde/dttd/commit/667269b61cd4dd223651671cc06c7f087e3a290f))

## [1.47.1](https://github.com/sdavisde/dttd/compare/v1.47.0...v1.47.1) (2026-07-11)

### Bug Fixes

- improve layout of homepage ([5185cd1](https://github.com/sdavisde/dttd/commit/5185cd1885954df7a9b74e26f5458a3b2766b9dc))

## [1.47.0](https://github.com/sdavisde/dttd/compare/v1.46.0...v1.47.0) (2026-07-11)

### Features

- **home:** redesign dashboard to surface weekend info at a glance ([8964c88](https://github.com/sdavisde/dttd/commit/8964c88b12e62f9ef6f9b686897e0620d1d7372f))

## [1.46.0](https://github.com/sdavisde/dttd/compare/v1.45.1...v1.46.0) (2026-07-11)

### Features

- **home:** prompt members without a profile photo to add one ([38efc8a](https://github.com/sdavisde/dttd/commit/38efc8a2010169bf4365ff945b4717d5a37996cc))

## [1.45.1](https://github.com/sdavisde/dttd/compare/v1.45.0...v1.45.1) (2026-07-11)

### Bug Fixes

- **payments:** tie team payments to the correct-gender weekend ([ae0d5c7](https://github.com/sdavisde/dttd/commit/ae0d5c7edf5f22f619f98f67325a64945116059f))

## [1.45.0](https://github.com/sdavisde/dttd/compare/v1.44.0...v1.45.0) (2026-06-29)

### Features

- **users:** clarify profile photo guidance during upload ([cdd9522](https://github.com/sdavisde/dttd/commit/cdd95228249e8f7731c4ca071114b854330b4668))
- **users:** roll UserAvatar out to all in-scope surfaces ([84a1363](https://github.com/sdavisde/dttd/commit/84a13639c2be320536dc9f461b71a75a0f148802))

### Bug Fixes

- make hover efffect for profile pics larger ([8bf3be6](https://github.com/sdavisde/dttd/commit/8bf3be61f931f8161f1eeb615bca95055634d202))

## [1.44.0](https://github.com/sdavisde/dttd/compare/v1.43.1...v1.44.0) (2026-06-27)

### Features

- **auth:** add optional avatar picker to signup ([d3b4a05](https://github.com/sdavisde/dttd/commit/d3b4a055105f74df2869e3e2f91c189271e629a1))
- **users:** add avatars storage bucket, owner-only RLS, and photo columns ([e447441](https://github.com/sdavisde/dttd/commit/e447441803b6092f0e2a8b890a87320456aad834))
- **users:** add profile photo upload, crop, replace, and remove ([d200060](https://github.com/sdavisde/dttd/commit/d20006086a2fbb717db5d2edd951171b96296df8))
- **users:** add reusable UserAvatar component and image helpers ([c87e8e5](https://github.com/sdavisde/dttd/commit/c87e8e5df12e4e5ea941365538c41d90855b0a96))

## [1.43.1](https://github.com/sdavisde/dttd/compare/v1.43.0...v1.43.1) (2026-06-22)

### Bug Fixes

- use candidate id instead of sponsorship info to build links ([b51d0cc](https://github.com/sdavisde/dttd/commit/b51d0ccbfafabb3ec4d4b8aa7dd4584218a8bb81))

## [1.43.0](https://github.com/sdavisde/dttd/compare/v1.42.0...v1.43.0) (2026-06-22)

### Features

- **weekend:** add export and share buttons to team roster ([3381dc9](https://github.com/sdavisde/dttd/commit/3381dc91b36e6ccc669dd8f4c5051f6e69beda4f))

## [1.42.0](https://github.com/sdavisde/dttd/compare/v1.41.0...v1.42.0) (2026-06-08)

### Features

- **candidate:** add camp waiver to candidate intake forms ([0f8cc4d](https://github.com/sdavisde/dttd/commit/0f8cc4deb6b23fa004369516ec6a3292525a391c))

## [1.41.0](https://github.com/sdavisde/dttd/compare/v1.40.2...v1.41.0) (2026-06-08)

### Features

- **candidate:** let pre-weekend couple move candidates between weekends ([9301a9d](https://github.com/sdavisde/dttd/commit/9301a9da539cb24d946a06d1ad6110d5d3b3eeb3)), closes [#11](https://github.com/sdavisde/dttd/issues/11)

### Bug Fixes

- **files:** restore meeting minutes location after signed-URL upload switch ([7bc6bf1](https://github.com/sdavisde/dttd/commit/7bc6bf13301f1b09a63a123dd471336cb4543ea7))
- **files:** show specific reasons when a file upload fails ([9959a80](https://github.com/sdavisde/dttd/commit/9959a80e3b1be9f11194de77d093247fe0a45478))

## [1.40.2](https://github.com/sdavisde/dttd/compare/v1.40.1...v1.40.2) (2026-06-08)

### Bug Fixes

- **files:** allow large PDF uploads via direct-to-storage signed URLs ([41dbe6d](https://github.com/sdavisde/dttd/commit/41dbe6d4a2fe7b79297d2ddd88fc83e0756175cd))

## [1.40.1](https://github.com/sdavisde/dttd/compare/v1.40.0...v1.40.1) (2026-05-29)

### Bug Fixes

- move rover under leaders in cha sort ([beb347b](https://github.com/sdavisde/dttd/commit/beb347b4c64cb8ee17809532c50a0dbf6a357020))

## [1.40.0](https://github.com/sdavisde/dttd/compare/v1.39.0...v1.40.0) (2026-05-29)

### Features

- add storeroom cha ([96763d0](https://github.com/sdavisde/dttd/commit/96763d0fdc08b72be2a24247a2d598c1294d1137))

## [1.39.0](https://github.com/sdavisde/dttd/compare/v1.38.1...v1.39.0) (2026-05-18)

### Features

- **roster:** add email column to team roster page ([507fc75](https://github.com/sdavisde/dttd/commit/507fc75157db9f71de29b16d48dd0e90f625172a))

## [1.38.1](https://github.com/sdavisde/dttd/compare/v1.38.0...v1.38.1) (2026-05-16)

### Bug Fixes

- **team-forms:** prevent info-sheet page crash from misused FormLabel ([519b503](https://github.com/sdavisde/dttd/commit/519b50307259f8dc7679694503b9e780139cef95))

## [1.38.0](https://github.com/sdavisde/dttd/compare/v1.37.0...v1.38.0) (2026-04-22)

### Features

- **dashboard:** add Sign Up to Serve button linking to secuela sign-in ([3debc61](https://github.com/sdavisde/dttd/commit/3debc61a522a2822c741c99bee81add4de94a705))

## [1.37.0](https://github.com/sdavisde/dttd/compare/v1.36.0...v1.37.0) (2026-04-21)

### Features

- **roster:** swap Meat CHA for Outside Prayer on Mobile team ([258e511](https://github.com/sdavisde/dttd/commit/258e5110eaa49c5cc6cc5646afd84a01d176953d))

## [1.36.0](https://github.com/sdavisde/dttd/compare/v1.35.2...v1.36.0) (2026-04-14)

### Features

- **landing:** redesign welcome page with proper sections and layout ([fc9c4f1](https://github.com/sdavisde/dttd/commit/fc9c4f131863fe8f60a25ead328a261da9fbda50))
- new events page ([31b5994](https://github.com/sdavisde/dttd/commit/31b599490888a382a665c41c20ba2ffa82f7e4b8))

### Bug Fixes

- **events:** lock event type and hide irrelevant fields by context ([2fd0e99](https://github.com/sdavisde/dttd/commit/2fd0e99caf776ee1b5f3f2cd9d889069924f78be))
- **events:** prevent orphaned events when changing between group and singleton types ([7d16af5](https://github.com/sdavisde/dttd/commit/7d16af57c5e35d9a8116746df2ea91d07efe95af))
- **meetings:** correct weekend meetings to 4 slots and improve event form field syncing ([6cbdc69](https://github.com/sdavisde/dttd/commit/6cbdc69e82a7b12155104d6681eaabcf13cdee3f))

## [1.35.2](https://github.com/sdavisde/dttd/compare/v1.35.1...v1.35.2) (2026-04-12)

### Bug Fixes

- generalize the secuela sign-in page ([58aa00a](https://github.com/sdavisde/dttd/commit/58aa00a8f2e6e5a1d6a977bd5e258eb0a295b021))

## [1.35.1](https://github.com/sdavisde/dttd/compare/v1.35.0...v1.35.1) (2026-04-12)

### Bug Fixes

- mobile styling fix on roster builder ([ca10f51](https://github.com/sdavisde/dttd/commit/ca10f510555549b46ca2c4dfb4a005999462c20f))

## [1.35.0](https://github.com/sdavisde/dttd/compare/v1.34.0...v1.35.0) (2026-04-12)

### Features

- create testing framework with example test ([10f2b25](https://github.com/sdavisde/dttd/commit/10f2b2508f69a7e70757031cd5a1f3e763fd0d29))
- **roster-builder:** add tooltips and missing secuela event warning ([361130a](https://github.com/sdavisde/dttd/commit/361130a1018e340b4a56b94607f5cb898014fde9))

## [1.34.0](https://github.com/sdavisde/dttd/compare/v1.33.3...v1.34.0) (2026-04-12)

### Features

- **roster-builder:** distinguish secuela attendees from late volunteers ([eb2f67e](https://github.com/sdavisde/dttd/commit/eb2f67e944fd61192f09b4d0a1ca6cd03f6f4b41))
- **secuela:** migrate attendance tracking from boolean to timestamp ([1c5c0b8](https://github.com/sdavisde/dttd/commit/1c5c0b851b6646b83fa5635f7a1037b69c541035))

## [1.33.3](https://github.com/sdavisde/dttd/compare/v1.33.2...v1.33.3) (2026-04-12)

### Bug Fixes

- **auth:** resolve 404s and broken password reset flow ([fc4e40f](https://github.com/sdavisde/dttd/commit/fc4e40fc6cd9f9f8efa4b028ec279f12dada102d))
- **roster:** add group_member_id FK to weekend_roster to prevent role/permission leaking ([fe3e7a1](https://github.com/sdavisde/dttd/commit/fe3e7a109d8001d434a20845a5d9d40cf2db6a62))
- **roster:** use comma-separated FROM in migration to fix PostgreSQL error ([9b59768](https://github.com/sdavisde/dttd/commit/9b597686b0370e76a2ff51b8d9fcb91b01f51109))

## [1.33.2](https://github.com/sdavisde/dttd/compare/v1.33.1...v1.33.2) (2026-04-12)

### Bug Fixes

- ensure we're pulling the correct permissions back for users ([4f9ed15](https://github.com/sdavisde/dttd/commit/4f9ed15717458d1939f4ba3e02f5db6f1f85cb16))

## [1.33.1](https://github.com/sdavisde/dttd/compare/v1.33.0...v1.33.1) (2026-04-12)

### Bug Fixes

- **roster-builder:** center weekend picker content on page ([52e1513](https://github.com/sdavisde/dttd/commit/52e1513b8c922fed75e56e248e90450828fee136))

## [1.33.0](https://github.com/sdavisde/dttd/compare/v1.32.0...v1.33.0) (2026-04-12)

### Features

- **roster-builder:** redesign weekend picker for a professional look ([8aab535](https://github.com/sdavisde/dttd/commit/8aab5356da582257475cae268f513d585b17e265))

### Bug Fixes

- **seed:** use RFC 4122-compliant UUIDs so Zod validation passes ([b9113ad](https://github.com/sdavisde/dttd/commit/b9113ad8f132e2d29804f63eea955cea144db982))

## [1.32.0](https://github.com/sdavisde/dttd/compare/v1.31.2...v1.32.0) (2026-04-11)

### Features

- **roster-builder:** display silent table leaders as "Table Leader — Silent" ([beb65a5](https://github.com/sdavisde/dttd/commit/beb65a5deab92aede999b2888f9bd9cea3669e67))
- **roster-builder:** improve card UX, fix remove bug, and distinguish past rectors ([58f043c](https://github.com/sdavisde/dttd/commit/58f043c1be06ab952a5366b493684348cbca0b60)), closes [#45](https://github.com/sdavisde/dttd/issues/45)
- **roster-builder:** restrict access to Rectors and Leaders Committee ([5a6c8dd](https://github.com/sdavisde/dttd/commit/5a6c8ddc58b97529bb00e6ea65c8ae4406272891))
- **weekend:** add Silent as a proper Rollo and simplify roster template ([3fccb17](https://github.com/sdavisde/dttd/commit/3fccb171b4f3b0bc92ac207201fcc5e69f7ca100))

### Bug Fixes

- **roster-builder:** fix community sheet gender filter, scroll, and role dedup ([c5e8ae5](https://github.com/sdavisde/dttd/commit/c5e8ae5684b9c00953a51353094b5d4a1777a3b9))
- **weekend:** store silent table leaders with rollo = null, not a string ([e7ce950](https://github.com/sdavisde/dttd/commit/e7ce950225fa004cf4725b3ebfd8a416ad956ba5))

## [1.31.2](https://github.com/sdavisde/dttd/compare/v1.31.1...v1.31.2) (2026-04-11)

### Bug Fixes

- use WRITE_TEAM_ROSTER permission for roster builder nav visibility ([166eae2](https://github.com/sdavisde/dttd/commit/166eae25b35cb61db7b733962c8e6a1d60f5b08d))

## [1.31.1](https://github.com/sdavisde/dttd/compare/v1.31.0...v1.31.1) (2026-04-11)

### Bug Fixes

- **roster-builder:** restrict nav and homepage links to Rectors and full-access users ([be284a2](https://github.com/sdavisde/dttd/commit/be284a2d1c6752da6b30a753b5b55ba5a418a277))

## [1.31.0](https://github.com/sdavisde/dttd/compare/v1.30.0...v1.31.0) (2026-04-11)

### Features

- add accordion and scrollarea components ([a5cc814](https://github.com/sdavisde/dttd/commit/a5cc8140275b51b3b5bbdc05f3b826498e9afc41))
- add ui pro skill ([f209bf9](https://github.com/sdavisde/dttd/commit/f209bf9f10df214bfe55ff818bdfba239160ab4b))
- **roster-builder:** add community data fetching and eligibility system ([5064705](https://github.com/sdavisde/dttd/commit/50647051c578804ceefedf8517bf56e3ed205f7b))
- **roster-builder:** add draft finalization and roster management flows ([1ee8377](https://github.com/sdavisde/dttd/commit/1ee837783aedc71db509170012b518f9bc80d779))
- **roster-builder:** add draft roster data model and service layer ([209ef52](https://github.com/sdavisde/dttd/commit/209ef52f0ba85248af0987b91d44fede05da3f1a))
- **roster-builder:** give rectors quick access from nav and homepage ([1233a3d](https://github.com/sdavisde/dttd/commit/1233a3d00cecd3dfaccbd753dd335e3b6ff60cb2))

### Bug Fixes

- **roster-builder:** resolve draft removal failure and polish header UI ([40278b7](https://github.com/sdavisde/dttd/commit/40278b7e5cfbb6302ac173245cfb915e965bca58)), closes [#N](https://github.com/sdavisde/dttd/issues/N)

## [1.30.0](https://github.com/sdavisde/dttd/compare/v1.29.1...v1.30.0) (2026-04-07)

### Features

- force user to confirm before finishing weekend ([9d01eac](https://github.com/sdavisde/dttd/commit/9d01eacad100398106864f95433572d546e710ee))

### Bug Fixes

- replace raw error toasts with user-friendly messages ([fd9656c](https://github.com/sdavisde/dttd/commit/fd9656c5b3e43c52743b9ba51acf7c18f8228c34))
- RLS improvement for weekend_groups ([e65212f](https://github.com/sdavisde/dttd/commit/e65212f3c943670dc40ba090fbfc053d44660801))
- **weekend:** resolve FK constraint error when creating weekend groups ([3a22f2c](https://github.com/sdavisde/dttd/commit/3a22f2cfdb19ab2a243df7ecac127fa1fbdb272f))

## [1.29.1](https://github.com/sdavisde/dttd/compare/v1.29.0...v1.29.1) (2026-04-07)

### Bug Fixes

- ensure users experience is recorded when a weekend is finished ([eb00841](https://github.com/sdavisde/dttd/commit/eb008415132e837927451d7aebb2d9aa9998ec32))

## [1.29.0](https://github.com/sdavisde/dttd/compare/v1.28.0...v1.29.0) (2026-04-07)

### Features

- allow editing users in the master roster ([9eed052](https://github.com/sdavisde/dttd/commit/9eed0528b57d8c30940cbaa0977fe9c9d03316d2))

## [1.28.0](https://github.com/sdavisde/dttd/compare/v1.27.2...v1.28.0) (2026-04-01)

### Features

- add curated public pages config and searchable page selector ([4613748](https://github.com/sdavisde/dttd/commit/4613748b782f1513d2d4eb58738d4fb33ea45580))
- add landing page for secuela ([cf6ee61](https://github.com/sdavisde/dttd/commit/cf6ee61d9065e7647206a54e34454a3057723836))
- add QR code generation with copy and download actions ([50dd821](https://github.com/sdavisde/dttd/commit/50dd821c52a266cf299d4436ea5941c92d715309))
- add QR Codes page to admin navigation and create page shell ([23ebab2](https://github.com/sdavisde/dttd/commit/23ebab2de0a9c66fa1a9d51575f2f06535f188db))
- add secuela check page ([95e6442](https://github.com/sdavisde/dttd/commit/95e6442c245bc82d5de458f00fd3e8e9cc011a2a))

### Bug Fixes

- make design of QR page easier ([d0eaf0e](https://github.com/sdavisde/dttd/commit/d0eaf0ecad9a07b72361928961b37c464da6153d))

## [1.27.2](https://github.com/sdavisde/dttd/compare/v1.27.1...v1.27.2) (2026-03-29)

### Bug Fixes

- address pr comments ([f60609e](https://github.com/sdavisde/dttd/commit/f60609eec06676f0eb97317c5654f13ba3cd042b))
- align Supabase seed data and storage bucket setup ([4260b69](https://github.com/sdavisde/dttd/commit/4260b6966c4c9557499e228fd753ac2d3543b9ba))

## [1.27.1](https://github.com/sdavisde/dttd/compare/v1.27.0...v1.27.1) (2026-03-27)

### Bug Fixes

- allow review job description link to remain clickable after completion ([e165d8a](https://github.com/sdavisde/dttd/commit/e165d8af4183ec053559827db203f4481bd2a07f))

## [1.27.0](https://github.com/sdavisde/dttd/compare/v1.26.2...v1.27.0) (2026-03-27)

### Features

- add candidate address to candidate list page ([a600928](https://github.com/sdavisde/dttd/commit/a600928c93edb7c271bd321e00e9efa05299c37b))
- **ui:** add DateInput component with blur validation ([f53dd09](https://github.com/sdavisde/dttd/commit/f53dd097a7091001aa6e5cdf6fb666698699eef0))

## [1.26.2](https://github.com/sdavisde/dttd/compare/v1.26.1...v1.26.2) (2026-03-20)

### Bug Fixes

- **payments:** correct paid counts and percentages in collection cards ([70a6602](https://github.com/sdavisde/dttd/commit/70a66027aeb17e8f470f61c6764c2500d45059ec))

## [1.26.1](https://github.com/sdavisde/dttd/compare/v1.26.0...v1.26.1) (2026-03-20)

### Bug Fixes

- only show active team members on the payment page ([a5d56c6](https://github.com/sdavisde/dttd/commit/a5d56c6167dc9abc35bc27187d6854aa72ec0f13))

## [1.26.0](https://github.com/sdavisde/dttd/compare/v1.25.1...v1.26.0) (2026-03-20)

### Features

- redesign payments page to be more helpful for treasurer ([48b78fa](https://github.com/sdavisde/dttd/commit/48b78fab01a48760d6def5a23397f7fb77e4e5a3))

## [1.25.1](https://github.com/sdavisde/dttd/compare/v1.25.0...v1.25.1) (2026-03-20)

### Bug Fixes

- show correct data on payments page ([6313015](https://github.com/sdavisde/dttd/commit/6313015e960359ea9929e891f946802858001e23))

## [1.25.0](https://github.com/sdavisde/dttd/compare/v1.24.0...v1.25.0) (2026-03-19)

### Features

- **payments:** add weekend column, summary totals, and report page ([9d78143](https://github.com/sdavisde/dttd/commit/9d78143527a40fbc1be38a8d0e8a2097d2b1418d))

## [1.24.0](https://github.com/sdavisde/dttd/compare/v1.23.1...v1.24.0) (2026-03-19)

### Features

- **forms:** add dev-mode "Fill with test data" buttons to candidate and sponsor forms ([d5da267](https://github.com/sdavisde/dttd/commit/d5da267b9b3dee03c594d4077af83fc14e1bb34d))

## [1.23.1](https://github.com/sdavisde/dttd/compare/v1.23.0...v1.23.1) (2026-03-15)

### Bug Fixes

- tie events to weekend groups instead of individual weekends ([565ecfc](https://github.com/sdavisde/dttd/commit/565ecfc5c44448bbd614dcb65bf6fa03b8760063))
- use individual weekend IDs instead of group IDs for events ([466b259](https://github.com/sdavisde/dttd/commit/466b259284e1a1ec4f0e5a9f660cf54bb1afe51c))

## [1.23.0](https://github.com/sdavisde/dttd/compare/v1.22.0...v1.23.0) (2026-03-15)

### Features

- **weekend:** add team form info column and modal to roster table ([8fc86ce](https://github.com/sdavisde/dttd/commit/8fc86ce6e8d9e6caa9afc4d06d58bbc1a35ed42d))

### Bug Fixes

- show medical columns with permissions ([fefa5bb](https://github.com/sdavisde/dttd/commit/fefa5bb465ee455ae1f3848fb49b9b5ff1b9dc16))

## [1.22.0](https://github.com/sdavisde/dttd/compare/v1.21.0...v1.22.0) (2026-03-13)

### Features

- **ui:** use PhoneInput component for all phone number form fields ([5f3a13e](https://github.com/sdavisde/dttd/commit/5f3a13e24645046328c83e65d3eda11a1b353c8b))

### Bug Fixes

- add null guards for Supabase storage responses and fix type casts ([4c07cd3](https://github.com/sdavisde/dttd/commit/4c07cd355daf63c27a5c868050fc34814106386e))
- fix implicit null checks ([e9fb295](https://github.com/sdavisde/dttd/commit/e9fb295527676b35463cda8aa1fb48bd01a27675))
- type imports are sorted ([cb7ea44](https://github.com/sdavisde/dttd/commit/cb7ea44247d2ae50b297ab4d6c194ba43ed9800e))

## [1.21.0](https://github.com/sdavisde/dttd/compare/v1.20.0...v1.21.0) (2026-03-12)

### Features

- form completion and medical info service rework ([9fa9e13](https://github.com/sdavisde/dttd/commit/9fa9e138bd9b8b82d6958c65e0b6a4f03d5c66af))
- multi-weekend volunteer experience — task 4.0 ([7590e53](https://github.com/sdavisde/dttd/commit/7590e5368c495de8b1dc692b67ef2c061d12b5ef))
- payment rework — target weekend_group_member ([ea4c264](https://github.com/sdavisde/dttd/commit/ea4c2646b62dfd1bfe97ff874554f08eba59294a))
- schema foundation migrations for multi-weekend volunteer support ([47f05ae](https://github.com/sdavisde/dttd/commit/47f05aeff849ec7306fddb7754bc12f088e03a56))
- **volunteer:** rework TeamMemberInfo for multi-weekend support ([39863fe](https://github.com/sdavisde/dttd/commit/39863fef7ba83e74766319b28c5ae4bb0b829381))

### Bug Fixes

- **db:** add admin policy for user_medical_profiles to support impersonation ([1242f4d](https://github.com/sdavisde/dttd/commit/1242f4d51cfc8eda6045a72ea8b2d655a2562675))
- post-migration bugs in payment and info-sheet flows ([af33b70](https://github.com/sdavisde/dttd/commit/af33b70c26d45fd4348ddabf782a1692aea25d2a))
- update migration script to ensure fields aren't missed ([dd206b7](https://github.com/sdavisde/dttd/commit/dd206b732464c4a537ca3fbb0179922612c3f780))

## [1.20.0](https://github.com/sdavisde/dttd/compare/v1.19.0...v1.20.0) (2026-03-07)

### Features

- improve form UX with phone formatting, gender toggle, and email validation ([b90c753](https://github.com/sdavisde/dttd/commit/b90c753a3c2f19d2166775bbe637bc079148638d))

## [1.19.0](https://github.com/sdavisde/dttd/compare/v1.18.1...v1.19.0) (2026-02-20)

### Features

- allow editing team forms ([6840c12](https://github.com/sdavisde/dttd/commit/6840c12907bdcd9ebbff23cfd145f4c8e53c1179))

## [1.18.1](https://github.com/sdavisde/dttd/compare/v1.18.0...v1.18.1) (2026-02-20)

### Bug Fixes

- format options correctly ([05c6d40](https://github.com/sdavisde/dttd/commit/05c6d4018ab8f52066d7f58aa7e0fca75f01a163))

## [1.18.0](https://github.com/sdavisde/dttd/compare/v1.17.1...v1.18.0) (2026-02-20)

### Features

- remove deprecated db tables ([386fe27](https://github.com/sdavisde/dttd/commit/386fe2750c3bca3327fcb9a23dba8c78dd368b3d))

### Bug Fixes

- update seed data for candidate payments ([34e00fe](https://github.com/sdavisde/dttd/commit/34e00fee390001cbdfeea180ab8bc97ad66fe6e6))

## [1.17.1](https://github.com/sdavisde/dttd/compare/v1.17.0...v1.17.1) (2026-02-14)

### Bug Fixes

- fix FK relation between events and weekends ([4ea2fc9](https://github.com/sdavisde/dttd/commit/4ea2fc9d6185ae6bbb6f15462bd1ae19486a63a9))

## [1.17.0](https://github.com/sdavisde/dttd/compare/v1.16.0...v1.17.0) (2026-02-10)

### Features

- add filter state to columns ([798aa3f](https://github.com/sdavisde/dttd/commit/798aa3f4a0dda893fcbf27392c77414c40068aa8))
- add onRowClick, columnVisibility, toolbarChildren to DataTable ([3b9e1ac](https://github.com/sdavisde/dttd/commit/3b9e1acc4e055192287bf555a2ae005f5c13862c))
- add TanStack Table core infrastructure and shared components ([d34581f](https://github.com/sdavisde/dttd/commit/d34581f127c225dbb427d6126ddaf002a2ebc723))
- add useDataTableUrlState hook for URL-synced table state ([42deca8](https://github.com/sdavisde/dttd/commit/42deca8006c90ab1411fcf14de2cd71aa0565065))
- improve mobile data table experience ([1096f31](https://github.com/sdavisde/dttd/commit/1096f317ae95768cc36b291b2a3db5aa5a93559e))
- migrate candidate list to TanStack Table with URL state ([a263fe6](https://github.com/sdavisde/dttd/commit/a263fe67bda989b0f9c891fcbeeebd9e61cb984c))
- migrate Candidate Review table to DataTable ([b75e7ea](https://github.com/sdavisde/dttd/commit/b75e7ea9f745fd1bac0da301b3cfefeac7510211))
- refactor remaining tables ([f1cab12](https://github.com/sdavisde/dttd/commit/f1cab1230019612234496a3c83f65af0de2a6732))

### Bug Fixes

- remove contact info table from settings page ([873fb56](https://github.com/sdavisde/dttd/commit/873fb56998d11f6f9a41cd6ed871a1a9a411d425))

## [1.16.0](https://github.com/sdavisde/dttd/compare/v1.15.0...v1.16.0) (2026-02-09)

### ⚠ BREAKING CHANGES

- update stripe webhook route in order to make a single route more

### Features

- add deposit service ([3a2ffb6](https://github.com/sdavisde/dttd/commit/3a2ffb648a6fef0e75f528bb9a7304a4ad185bcb))
- add new payment transaction tables and migrate old data to them ([b5c3522](https://github.com/sdavisde/dttd/commit/b5c35226b00a6ff1d1acae5d24d9de040cd7bba8))
- update payment page to pull new attributes ([7479d4c](https://github.com/sdavisde/dttd/commit/7479d4cba1c14578c4130cab726f24801bef2860))
- update payment service to use the new generic payment tables ([8927cd1](https://github.com/sdavisde/dttd/commit/8927cd19ec8c991301dbfc294807aad057011ae4))
- update stripe webhook route in order to make a single route more ([afb5531](https://github.com/sdavisde/dttd/commit/afb5531d7eeac3ba003bafd43b1d0ea0c5ca85b8))

### Bug Fixes

- make logs easier to read ([30bbb18](https://github.com/sdavisde/dttd/commit/30bbb18fe4f21b106df7da229a774de0f25c5f77))
- tie payment owner to manual payments and fix payment owner not ([f734347](https://github.com/sdavisde/dttd/commit/f7343475564bfcbdb79057ea856eb29bc32e4a3d))

## [1.15.0](https://github.com/sdavisde/dttd/compare/v1.14.1...v1.15.0) (2026-02-07)

### Features

- add balance_transaction_id, charge_id, net_amount, deposited_at, ([272aeb6](https://github.com/sdavisde/dttd/commit/272aeb676032ac97da900511040ddd028c72bac0))
- add payout.paid event handling ([64a422d](https://github.com/sdavisde/dttd/commit/64a422d38bc78010fd9991c3a58921068b665a98))

### Bug Fixes

- add candidate payments to candidate list locked under ([495fb1d](https://github.com/sdavisde/dttd/commit/495fb1d9c2d7006e7ebae403caed517f6a4eab31))
- show candidate payments on the payments page ([66081d6](https://github.com/sdavisde/dttd/commit/66081d6aa55fd2b8fc64c26a55d5df380e576bc8))

## [1.14.1](https://github.com/sdavisde/dttd/compare/v1.14.0...v1.14.1) (2026-02-06)

### Bug Fixes

- add icon for community borad ([1ed4a05](https://github.com/sdavisde/dttd/commit/1ed4a0596527c3b15c768a1f4405f2c532c80536))
- fix seed file ([0543d70](https://github.com/sdavisde/dttd/commit/0543d70ba02fd4f98a3128c6c798a5c3929c6363))
- further restrict columns ([48bba41](https://github.com/sdavisde/dttd/commit/48bba41221b4b255eb105366112124c3b1a0e921))

## [1.14.0](https://github.com/sdavisde/dttd/compare/v1.13.1...v1.14.0) (2026-02-04)

### Features

- small board page UI update and refactor to use services pattern ([773b1db](https://github.com/sdavisde/dttd/commit/773b1dbde8938b2eeba9048d0e50ab27ec65c65a))

### Bug Fixes

- apply migrations correctly ([f70811a](https://github.com/sdavisde/dttd/commit/f70811affb9ffb2bb392ea5ca1b2723b30bc224d))
- remove nested database.types ([e91a0ef](https://github.com/sdavisde/dttd/commit/e91a0efe41b849130f7d3fbd727be5df32e1c01c))

## [1.13.1](https://github.com/sdavisde/dttd/compare/v1.13.0...v1.13.1) (2026-02-03)

### Bug Fixes

- order leader positions by importance ([1c591bb](https://github.com/sdavisde/dttd/commit/1c591bb614ebc06583ed4c6ed379250bf71ddf30))

## [1.13.0](https://github.com/sdavisde/dttd/compare/v1.12.1...v1.13.0) (2026-02-03)

### Features

- add CSV export for candidate list (Roster CHA role) ([2eb86f4](https://github.com/sdavisde/dttd/commit/2eb86f4fd0d7573b6443d9a4054efb98be780769))
- add leadership team preview to current weekend page ([63b25a8](https://github.com/sdavisde/dttd/commit/63b25a8c813eab4b8a946426632de06991279c44))
- add link to candidate list and team roster to current weekend page ([9caaab0](https://github.com/sdavisde/dttd/commit/9caaab05789085729c2334b15fce6540b388ba95))

### Bug Fixes

- add candidate list to the navigation ([637900d](https://github.com/sdavisde/dttd/commit/637900de6802713a3086908626318638111adc78))
- remove leadership preivew from roster page ([910d826](https://github.com/sdavisde/dttd/commit/910d826580c32cb55322a37eb8924b7143ae2793))

## [1.12.1](https://github.com/sdavisde/dttd/compare/v1.12.0...v1.12.1) (2026-02-02)

### Bug Fixes

- add new event fields to the create/edit event form ([a5b9fd6](https://github.com/sdavisde/dttd/commit/a5b9fd652ff1cf6769bd2c5fa7fca575b77d2bb8))

## [1.12.0](https://github.com/sdavisde/dttd/compare/v1.11.1...v1.12.0) (2026-02-02)

### Features

- another navbar redesign ([fa10b70](https://github.com/sdavisde/dttd/commit/fa10b70a0ffcfa0cf101aaf72e149a07cf7f795c))

## [1.11.1](https://github.com/sdavisde/dttd/compare/v1.11.0...v1.11.1) (2026-02-01)

### Bug Fixes

- allow users to be redirected to their target url after necessary ([d8ffb03](https://github.com/sdavisde/dttd/commit/d8ffb033a95c59af07ffba5de7169ba9de70005e))
- apply same permission checks to the admin dashboard links as the ([99f4f25](https://github.com/sdavisde/dttd/commit/99f4f250bbf4958f0b5715e7eeb712255edc9568))
- hide admin navigation whenever the user doesn't have access to a ([057c8c0](https://github.com/sdavisde/dttd/commit/057c8c0bb1df62104607f39ce33265ec25add5da))
- improve nav ui again.. still not hppy w it ([e36ec24](https://github.com/sdavisde/dttd/commit/e36ec24443b9e9f6e5b0842a4710be3f8a59bb3e))

## [1.11.0](https://github.com/sdavisde/dttd/compare/v1.10.1...v1.11.0) (2026-02-01)

### Features

- add event list display with URL hash-based date selection ([59eba96](https://github.com/sdavisde/dttd/commit/59eba9658c89975dcf170df1419585692034c4e9)), closes [current-weekend#2024-02-15](https://github.com/sdavisde/current-weekend/issues/2024-02-15)
- add mobile responsive layout with tabbed interface ([253f41b](https://github.com/sdavisde/dttd/commit/253f41b9ac6a3b811553aa892e139d21b72887aa))
- add new "end_datetime", "weekend_id", and "type" fields to events ([81fde23](https://github.com/sdavisde/dttd/commit/81fde23b7e971f26540b0663a89da2b9459c49ce))
- add the bones of the current weekend page ([52f9554](https://github.com/sdavisde/dttd/commit/52f955403bb07e8c5c6eb60313d23ec3d57fe614))
- add weekend calendar view ([13a7b1b](https://github.com/sdavisde/dttd/commit/13a7b1b7075d13b6cf5e86a28eaa335d40d2c409))
- improve navigation UI ([febfe1c](https://github.com/sdavisde/dttd/commit/febfe1cb6d5a974c6ce5306a651b8fc7f52573ec))

### Bug Fixes

- remove job description ([f676768](https://github.com/sdavisde/dttd/commit/f6767688f4b9dead58d329706014309288daa36d))

## [1.10.1](https://github.com/sdavisde/dttd/compare/v1.10.0...v1.10.1) (2026-01-31)

### Bug Fixes

- always show pagination components ([bddb66c](https://github.com/sdavisde/dttd/commit/bddb66cb573e510d0e14466f9a79d03df292f0c9))
- make the admin header clearly link back to site ([9b1443c](https://github.com/sdavisde/dttd/commit/9b1443ca35128ed6f5115ff5be5c76576c172a4f))
- small UI tweaks to weekends in admin ([2f1b612](https://github.com/sdavisde/dttd/commit/2f1b612e1e4b6d0c8ccebb830a2b1db4d5dcf652))

## [1.10.0](https://github.com/sdavisde/dttd/compare/v1.9.0...v1.10.0) (2026-01-31)

### Features

- add candidate link to roster page ([0e1aa4b](https://github.com/sdavisde/dttd/commit/0e1aa4b2676abb4bed45df27f7c21b5477ef6657))
- add candidate-list page ([93d82aa](https://github.com/sdavisde/dttd/commit/93d82aad38b55d9517e02d3b21103b50ff919a33))
- add share button to candidate page ([3b7a34a](https://github.com/sdavisde/dttd/commit/3b7a34a7e9aaddb0d94613623fc165fc1cf42762))
- dynamically add permissions to users based on their CHA_Role ([f0a9bac](https://github.com/sdavisde/dttd/commit/f0a9bac6c7f4483b6114ebc8c24b90fc11e59a14))
- restrict columns to specific cha roles ([464bd4a](https://github.com/sdavisde/dttd/commit/464bd4ad5d7a06f03cd8dca5c966600ad9af0579))

### Bug Fixes

- align public roster page with admin capabilities ([9299984](https://github.com/sdavisde/dttd/commit/929998473261b18a992b7b327404934caa0c0c5b))
- fix build error ([b053202](https://github.com/sdavisde/dttd/commit/b0532021c6e4037054aa2c2d618d573d5313d365))
- render placeholder graph for team experience ([f00329e](https://github.com/sdavisde/dttd/commit/f00329e0f5ebed4084766615be73dc52b7ea8edf))
- update team payments permission ([e5faf1d](https://github.com/sdavisde/dttd/commit/e5faf1d25a0fd4a618382165c34a8b7e401bbc4e))

## [1.9.0](https://github.com/sdavisde/dttd/compare/v1.8.0...v1.9.0) (2026-01-27)

### Features

- add prayer wheel links to the admin settings page ([863776f](https://github.com/sdavisde/dttd/commit/863776fc50ee25fab4ecd288961bc7d074528ded))

## [1.8.0](https://github.com/sdavisde/dttd/compare/v1.7.3...v1.8.0) (2026-01-26)

### Features

- send pre-weekend couple an email when candidates complete forms or ([0be8500](https://github.com/sdavisde/dttd/commit/0be8500a7f656135c9a854e98067f10a6e216690))

### Bug Fixes

- update status colors to try and be more clear ([be910c7](https://github.com/sdavisde/dttd/commit/be910c70e658d3c0cb6045b1ed80e876caffcd5d))
- update styles of candidate rows ([71e5afd](https://github.com/sdavisde/dttd/commit/71e5afd653caa7586854486d6c32a0aa3ee1a135))

## [1.7.3](https://github.com/sdavisde/dttd/compare/v1.7.2...v1.7.3) (2026-01-25)

### Bug Fixes

- fix build ([de326c3](https://github.com/sdavisde/dttd/commit/de326c3f64a577f0edd8aeef74c2dcdb4093ed09))

## [1.7.2](https://github.com/sdavisde/dttd/compare/v1.7.1...v1.7.2) (2026-01-25)

### Bug Fixes

- allow deleting last file ([fd4f682](https://github.com/sdavisde/dttd/commit/fd4f682d5f3b147af985ba5d2b219f6ec0898156))

## [1.7.1](https://github.com/sdavisde/dttd/compare/v1.7.0...v1.7.1) (2026-01-25)

### Bug Fixes

- fee validation should be dynamic based on payment type ([d54d289](https://github.com/sdavisde/dttd/commit/d54d28944f29342704092c1ad3a835203b0f4852))

## [1.7.0](https://github.com/sdavisde/dttd/compare/v1.6.0...v1.7.0) (2026-01-23)

### Features

- add back pending approval status ([c9adf88](https://github.com/sdavisde/dttd/commit/c9adf883023d2143be5c1c04823d0a01aced6b0c))

## [1.6.0](https://github.com/sdavisde/dttd/compare/v1.5.0...v1.6.0) (2026-01-23)

### Features

- add inline editable form for candidate details ([64d5c35](https://github.com/sdavisde/dttd/commit/64d5c355222440b18accee1cfad692235ebadc3e))
- add pencil icon for better UX on the editable inline fields ([6ce1b63](https://github.com/sdavisde/dttd/commit/6ce1b63a2c03f86c7937bdab75054d8a44fa5c69))

### Bug Fixes

- add date picker field ([551a564](https://github.com/sdavisde/dttd/commit/551a56412f5ac514737b1dd066d7f22e5e1b2891))
- add number and boolean inline fields ([a63afab](https://github.com/sdavisde/dttd/commit/a63afabe1b0c29ed070314afd1793e9f0de5269b))

## [1.5.0](https://github.com/sdavisde/dttd/compare/v1.4.0...v1.5.0) (2026-01-23)

### Features

- add candidate payments to table ([b247450](https://github.com/sdavisde/dttd/commit/b247450ffd541f0687e3bc077f5bd35487794040))

## [1.4.0](https://github.com/sdavisde/dttd/compare/v1.3.0...v1.4.0) (2026-01-23)

### Features

- Integrate Sentry for better error aggregation ([20ef2be](https://github.com/sdavisde/dttd/commit/20ef2be2e1f1de4a202b929421ade9a35a5fa26e))

## [1.3.0](https://github.com/sdavisde/dttd/compare/v1.2.0...v1.3.0) (2026-01-21)

### Features

- add error catching pages ([0fbfabc](https://github.com/sdavisde/dttd/commit/0fbfabcee58c859eafd0096a6217908ee1e0e1e2))
- add specific candidate page to replace the candidate sheet ([6de87b2](https://github.com/sdavisde/dttd/commit/6de87b2e92bf66fd402213a9ef9a4b314eca7f87))
- add test candidate info ([cf81a81](https://github.com/sdavisde/dttd/commit/cf81a819f59dfa6c5c04c71640bfd16580cbff79))
- enable analytics ([99818e3](https://github.com/sdavisde/dttd/commit/99818e3de944ee803a473f3044cf61d1e779330e))

### Bug Fixes

- fix build error ([96618f4](https://github.com/sdavisde/dttd/commit/96618f418255e9086b170e93a716ea3e20cf0a8e))

## [1.2.0](https://github.com/sdavisde/dttd/compare/v1.1.0...v1.2.0) (2026-01-20)

### Features

- add Stripe webhook listener task for local development ([69349a8](https://github.com/sdavisde/dttd/commit/69349a826016a7f7f46c832e3730d2f9b0ce9d80))
- add yarn install step to setup task ([1c316c3](https://github.com/sdavisde/dttd/commit/1c316c37c82b19da5e760782ea2852f030d7c6e7))
- automate Supabase local key population in setup task ([deb8c42](https://github.com/sdavisde/dttd/commit/deb8c4253cfcad1cad1f2b40bcc5461d911f8fad))
- integrate Infisical for secret management ([cdb8261](https://github.com/sdavisde/dttd/commit/cdb82616366ca38bfb3445368dbc2314448a6ae7))

### Bug Fixes

- add Infisical path for Development folder ([ff7c6d6](https://github.com/sdavisde/dttd/commit/ff7c6d63a5e05f9f84efb033d5899f9405add1f5))
- improve Infisical auth check and secret pulling ([87deaa5](https://github.com/sdavisde/dttd/commit/87deaa565b903123858ed8fbb0c2833e223477e6))
- update README with better description ([0c8f8b6](https://github.com/sdavisde/dttd/commit/0c8f8b6d895c1edf6efc4e2b040bd23863be03de))

## [1.1.0](https://github.com/sdavisde/dttd/compare/v1.0.0...v1.1.0) (2026-01-20)

### Features

- create Taskfile foundation with prerequisite checking ([b008155](https://github.com/sdavisde/dttd/commit/b008155a5dc21b55e84868fb21028344a0fc1955))

### Bug Fixes

- Remove READ_MASTER_ROSTER permission ([1cecb42](https://github.com/sdavisde/dttd/commit/1cecb42308ac0e4ee66c18c06a058c1d8377ddd0))
- use POSIX-compatible shell syntax in Taskfile ([27c07ea](https://github.com/sdavisde/dttd/commit/27c07ea11eb5d319109fab4ddc21986c037e6a38))

## 1.0.0 (2026-01-18)

### ⚠ BREAKING CHANGES

- Add supabase migration script and config

### Features

- add action to fetch weekend team experience distribution ([60a5a39](https://github.com/sdavisde/dttd/commit/60a5a397cb51b0ae1c027ab992c514e6d53b4026))
- add address to team forms ([a61c81a](https://github.com/sdavisde/dttd/commit/a61c81a71fde4f00019cc8f0bcc7cfa03014ae8f))
- add address to user table ([5f283d4](https://github.com/sdavisde/dttd/commit/5f283d43bf7b7ba2e6a212eefc58107ffe9f9a46))
- add community service for the encouragement logic ([1353568](https://github.com/sdavisde/dttd/commit/13535682f53cfb613db55a73553ca7853fbb95c5))
- add delete candidate confirm modal ([04463d7](https://github.com/sdavisde/dttd/commit/04463d767687612c434281c3b44247223489bb79))
- add enhanced details to user sheet in master roster ([55f791a](https://github.com/sdavisde/dttd/commit/55f791aaafd4ca652877fb3096b3f2ae321fb640))
- add experience chart to the roster page ([9341c0d](https://github.com/sdavisde/dttd/commit/9341c0dc7cbdd5fe74daead3831044083582553e))
- add features to candidate table like additional statuses and filtering ([b8afc66](https://github.com/sdavisde/dttd/commit/b8afc66b9e5d6a00e8d0c6bae60502dbece1082c))
- add impersonation dialog for FULL_ACCESS users ([0ea16ac](https://github.com/sdavisde/dttd/commit/0ea16ac1e3a9d7a2ff43c39fdd3a08759a205a6c))
- add impersonation service ([54f730b](https://github.com/sdavisde/dttd/commit/54f730b94a0dd4f86f779c08fb6a1bfca7444c74))
- add logic to save and load addresses for users ([ddbb729](https://github.com/sdavisde/dttd/commit/ddbb7295c24660d85ba37dddffc057281b994955))
- add medical info to team forms ([c4f9693](https://github.com/sdavisde/dttd/commit/c4f9693be2cffc592216bded2bc2361e75ce3476))
- add medical info to team roster ([67e865a](https://github.com/sdavisde/dttd/commit/67e865a637070454edc26cb8fe443da99d0d9a0d))
- add new colors for roster experience level ([5e2c93e](https://github.com/sdavisde/dttd/commit/5e2c93e629072657cd69647aa2c5a94100706442))
- add new lint rules to prevent returning Error from server action ([2821dc9](https://github.com/sdavisde/dttd/commit/2821dc9d0c85378f1d866a04cb94c3d28193fdf0))
- add new permission for community encouragement ([4523641](https://github.com/sdavisde/dttd/commit/4523641c069b347239366a4495c76e2f5a3bdc37))
- add null coalescing checks ([3a0009e](https://github.com/sdavisde/dttd/commit/3a0009e1304b78f06acb0ee9e56f042f40d46c74))
- add pointer styling to actions ([29b5c30](https://github.com/sdavisde/dttd/commit/29b5c308282459e63c84757244115a7bc46c55a5))
- add second form page ([e3e64d4](https://github.com/sdavisde/dttd/commit/e3e64d443245151b1fedf80bd829c794e762c9e7))
- add send candidate forms confirmation email ([983fe2c](https://github.com/sdavisde/dttd/commit/983fe2cefb5df8b5899eb6319936256f63b58c54))
- Add supabase migration script and config ([86bb027](https://github.com/sdavisde/dttd/commit/86bb0279b35bd3d1ede8ed5e0b65079dfaaf33b1))
- add team forms check to the roster page ([2102d59](https://github.com/sdavisde/dttd/commit/2102d592e37171c02e2b7c954fd6ef11c0ce813a))
- add third team form for release of claim ([67ff853](https://github.com/sdavisde/dttd/commit/67ff853aad14ab48c0646932888bc6fb0f3d5580))
- add useful columns to the master roster ([646eaca](https://github.com/sdavisde/dttd/commit/646eaca0ad31d52c0cd868c47e67bfe6397ebc7c))
- add user experience server actions to get user service history ([6fa5749](https://github.com/sdavisde/dttd/commit/6fa57491f1109a3a0358b14bdbdd6b3e7bf077ab))
- add weekend status badge ([69e30a7](https://github.com/sdavisde/dttd/commit/69e30a78daf0810904709969c17d333f131ed7ad))
- allow job desciptions todo to be saved in local storage ([307a07b](https://github.com/sdavisde/dttd/commit/307a07bf59c283b9927e9f11d50d3e690d73acf3))
- allow payment owner to be updated when reviewing candidate details ([303a9d6](https://github.com/sdavisde/dttd/commit/303a9d623c5eede82581c4046b1959877ea2eb67))
- allow rejecting candidates ([2a51fb8](https://github.com/sdavisde/dttd/commit/2a51fb8ed19aca7fc5cbfd4e0ba52c3c067bc36d))
- allow users to have multiple roles ([da5ad9b](https://github.com/sdavisde/dttd/commit/da5ad9bd4938e03a42b91210a7d30ef428f54abd))
- complete team info todo ([8def250](https://github.com/sdavisde/dttd/commit/8def250219a2cf9ebac5e7a9dc6ffc442ebda1f4))
- differentiate rector ready from previous rectors ([4aa384f](https://github.com/sdavisde/dttd/commit/4aa384f7c2c57e5c947c57d5d893a0357159a2c0))
- filter candidates list to only include candidates from a specific weekend ([e27c8c6](https://github.com/sdavisde/dttd/commit/e27c8c603814736cae417493aa559f3a646771fc))
- finish up community encouragement editor ([356451f](https://github.com/sdavisde/dttd/commit/356451f370233cdd151d58a75ca6dccf0c54a29d))
- implement "send forms" action for candidates ([b7abcae](https://github.com/sdavisde/dttd/commit/b7abcae8589fc04075ef7927c58cd5681db5bf47))
- initialize master roster service ([a2df1de](https://github.com/sdavisde/dttd/commit/a2df1de5bc19965b2c99d7906f1cf5fb7987c404))
- introduce authorized actions helper ([07a445b](https://github.com/sdavisde/dttd/commit/07a445b8f8384658211f6199467e5c6df9413762))
- introduce basic info and experience sections ([0af8e54](https://github.com/sdavisde/dttd/commit/0af8e540ee513be7f05a07d810df9601cd9eb1c5))
- introduce better date picker for team forms ([ff061f0](https://github.com/sdavisde/dttd/commit/ff061f081b48242c85006186b4f0b5323fff2eee))
- introduce camp waiver form ([9111d1f](https://github.com/sdavisde/dttd/commit/9111d1f480c25f12cfd9921c63d2ac939428f308))
- introduce empty state for candidates list + hide status legend unless hovered ([b92298f](https://github.com/sdavisde/dttd/commit/b92298f7cf07c8f6fc0207525d83fb37751ff576))
- introduce eslint config ([8ab8455](https://github.com/sdavisde/dttd/commit/8ab8455914bd579812138a8e66877e34e773fd3f))
- introduce new service pattern for users ([cdeb5a4](https://github.com/sdavisde/dttd/commit/cdeb5a420456abf572a9c710ad99ec52d9b7efd5))
- introduce send payment request email modal ([135b831](https://github.com/sdavisde/dttd/commit/135b8314744c8ea559c743afb9f465e39004fd8b))
- introduce skills section to forms ([a7d440a](https://github.com/sdavisde/dttd/commit/a7d440a7ffb2db1938b1f33d1bbbacd7b03d81ed))
- introduce statement of belief form ([35e9c43](https://github.com/sdavisde/dttd/commit/35e9c4317f8ee86b8cf06c31b92a88135100063e))
- introduce stepper to team forms ([3b5c135](https://github.com/sdavisde/dttd/commit/3b5c1355e250e0425f4faad4e614d8a86f827971))
- introduce team forms breakdown page ([ef40881](https://github.com/sdavisde/dttd/commit/ef40881db3dfefcabc73e2b0c2bc2ee7d489a211))
- introduce todo section for team members on homepage ([7668784](https://github.com/sdavisde/dttd/commit/76687840b0aa275ec16d20d473855c13ebea259d))
- introduce type guard to help with finding team member info ([298d4d3](https://github.com/sdavisde/dttd/commit/298d4d32521e410e0950f5528f0e90475a649ef6))
- introduce types and helpers to support rendering user experience ([b02dae3](https://github.com/sdavisde/dttd/commit/b02dae38d642b6e7714df455052c83966572082f))
- mark payment step as completed when user has payment record for team fees ([d2170a9](https://github.com/sdavisde/dttd/commit/d2170a9ba84f17a5cf68a1045b8afcde7a91c23c))
- read in user experience when loading info sheet ([1897a05](https://github.com/sdavisde/dttd/commit/1897a05f4d608142ca06875d6ec16f400c6c774c))
- update db types ([0468d8d](https://github.com/sdavisde/dttd/commit/0468d8d949ecf924076be6df89f4bc1239ff70a3))

### Bug Fixes

- add apos; to fix linter errs ([3400555](https://github.com/sdavisde/dttd/commit/3400555da813106a9ac5f043e100971bab44ea74))
- add logging and redirect when candidate info not found on fee page ([fbf3f19](https://github.com/sdavisde/dttd/commit/fbf3f19f78ed9a1ec17ffafde4ca4d2ac3e0046c))
- add other release packages ([e189c05](https://github.com/sdavisde/dttd/commit/e189c050313bd9e7914107f2e098d67ac0bad149))
- add readonly mode to roles page ([c6020d9](https://github.com/sdavisde/dttd/commit/c6020d9c0a898b1eb8fe10ff39ca582c3d48ee6e))
- add semantic-release ([dcfb307](https://github.com/sdavisde/dttd/commit/dcfb307616b4f76633aa7ab3387f4b20b548a90e))
- add weekend title to cards ([b3e5c36](https://github.com/sdavisde/dttd/commit/b3e5c364cebe1ade84f019141f0641581f7be004))
- allow both genders on team roster dropdown ([938f314](https://github.com/sdavisde/dttd/commit/938f3142ff3c275b6f3abfc87873d4a6c112bac4))
- allow entering dates in the future for events ([52fee87](https://github.com/sdavisde/dttd/commit/52fee878b034bb8bc029ebe8eab2edd617f235b8))
- allow large files + add weekend_Id to sponsor form ([79dd65d](https://github.com/sdavisde/dttd/commit/79dd65dbb0d3028f692c16f5074827f0e230a820))
- allow READ_CANDIDATES to view candidates page ([4ef1637](https://github.com/sdavisde/dttd/commit/4ef1637f69d4654f9b5d4a32666846765c4adda5))
- allow team info sheet completion to be saved ([c0995ea](https://github.com/sdavisde/dttd/commit/c0995ea290181d141cb8ccaac3112633679902c5))
- broken import ([704b8e2](https://github.com/sdavisde/dttd/commit/704b8e2eff6da7aa6b719a461956b110aa78651c))
- broken imports after user service consolidation ([f83b88e](https://github.com/sdavisde/dttd/commit/f83b88e280294a80327cf5e68ac1f647474e3fde))
- bug when submitting team forms ([e489f75](https://github.com/sdavisde/dttd/commit/e489f753d4c1b3b9fc704edf1da86a04f6046ffb))
- build and separate weekend cards ([2b73ee9](https://github.com/sdavisde/dttd/commit/2b73ee990a5f5b6ed090a865bad101e67b334be1))
- build error around users action ([92153b6](https://github.com/sdavisde/dttd/commit/92153b645f5d3e46b590f6ed140925b0d7c879b1))
- build errors in py files ([cb41cb8](https://github.com/sdavisde/dttd/commit/cb41cb896f3450edaf376e1dfed257f94508dcb1))
- cleanup remaining low effort lint errs ([c0ee053](https://github.com/sdavisde/dttd/commit/c0ee0533a345b89cf3ef16c4173f3cf8d8dba1db))
- disable only steps that are past the first step that needs to be completed ([fb44bef](https://github.com/sdavisde/dttd/commit/fb44befb44c6317b5a7e4c7e1249d80342645055))
- dramatically improve UI of stepper ([b73d1cf](https://github.com/sdavisde/dttd/commit/b73d1cfe94b5efeea88cf5304beeca91556b6145))
- filter out medical conditions answers like "n/a, none, no" from ([0160639](https://github.com/sdavisde/dttd/commit/0160639d8fd13b8ca2fb8131efbdcea6ef5997a3))
- fix bug when adding experience ([e60ab12](https://github.com/sdavisde/dttd/commit/e60ab1291d29b3fcf18730b05548864bd3b7a0f0))
- fix build error ([deb791c](https://github.com/sdavisde/dttd/commit/deb791cb34051ed0aa1f11a05f1518ea6f4adf4a))
- fix build errors ([6b0f842](https://github.com/sdavisde/dttd/commit/6b0f842356cebb8d1113fda28a0835ee4786170f))
- fix candidate fee UX ([c3c1d28](https://github.com/sdavisde/dttd/commit/c3c1d286dde41b481c656ca5ceeab11642e12ec7))
- fix client side user data not refreshing when impersonating ([51f8ea5](https://github.com/sdavisde/dttd/commit/51f8ea52e17111ecbe06f562b34c8a8324a946a4))
- fix date picker to require range passed in ([8fddd7f](https://github.com/sdavisde/dttd/commit/8fddd7f88425e5768c9b19bafd1af4acd1d351d0))
- fix datetime ([d57deac](https://github.com/sdavisde/dttd/commit/d57deacc74b28dfe9257bf210c4a3fdcc7bd3c96))
- fix error when submitting forms ([66503dd](https://github.com/sdavisde/dttd/commit/66503ddbb513082a34df933ff403e53c9c273b2d))
- fix infinite load ([9a96db0](https://github.com/sdavisde/dttd/commit/9a96db0d81d0032c790c0284a58e6ad4fc1c5089))
- fix linting errors in component library ([b4fecf6](https://github.com/sdavisde/dttd/commit/b4fecf6548a6121634cc058c7459a5f41b819e7a))
- fix prop serialization ([6e579ce](https://github.com/sdavisde/dttd/commit/6e579cec88969a36a2e40584c11eb0337c635995))
- fix style for user experience field ([6a0acd1](https://github.com/sdavisde/dttd/commit/6a0acd13bdd628d5af903b5cbd602238966ab06a))
- fix warning ([7ace18a](https://github.com/sdavisde/dttd/commit/7ace18a57c869f78bde02b9a98481bbdfab755b7))
- fix warnings ([0000364](https://github.com/sdavisde/dttd/commit/0000364104849f10404316ebe6d6d16c32a1919a))
- fix weekend option label ([7f26802](https://github.com/sdavisde/dttd/commit/7f2680284103ee84e9e6ac2c0826ae550fbbc9e6))
- fixed broken import ([e1c6676](https://github.com/sdavisde/dttd/commit/e1c6676f8843a158db7f2c4eff794802a1259ec2))
- fixing error when sponsoring candidate ([696309e](https://github.com/sdavisde/dttd/commit/696309e11cfcbe42050a53cdb302ee62c81db5f5))
- force user to go through team forms 1 by 1 ([a3fb350](https://github.com/sdavisde/dttd/commit/a3fb350fbcb10547b81818d3fba9b2aa571d9791))
- format review candidates page ([4b8ccaa](https://github.com/sdavisde/dttd/commit/4b8ccaa8d666c28a26e71d6fdfb52e64afa75221))
- generalize the user experience field ([21430ed](https://github.com/sdavisde/dttd/commit/21430edfc874ac8e3fe5e790cd36c929a626734b))
- get month string correctly to set into essentials training date ([d8be6eb](https://github.com/sdavisde/dttd/commit/d8be6eb59dffb108c8051426426f45f25c037408))
- hide controls with feature flag ([2f585c9](https://github.com/sdavisde/dttd/commit/2f585c91c4478e4aad61c48089c4ad3feb7e49b9))
- homepage design adjustments ([0b8011e](https://github.com/sdavisde/dttd/commit/0b8011e1acb5de82796dbc916d414644c2b189eb))
- improve design to match the rest of the homepage ([c000acc](https://github.com/sdavisde/dttd/commit/c000acca092f93920b41b7f0db512365f502ae93))
- improve previous roles section of team forms ([78e3d30](https://github.com/sdavisde/dttd/commit/78e3d30108170478ffdd3ef2edc0ba38fa5e7cd3))
- improve sep of logic ([e773f31](https://github.com/sdavisde/dttd/commit/e773f31bea07e38f3aec345f474a5337a5841e84))
- improve text ([9c9f843](https://github.com/sdavisde/dttd/commit/9c9f843d5e75c58bd56de0b6eb51d52ad65fc824))
- improve UI design on mobile for the experience chart ([42d40e0](https://github.com/sdavisde/dttd/commit/42d40e05ffd41ab331e26d4dabae4f27adb4c2b3))
- improve UI for status filter ([5aa7844](https://github.com/sdavisde/dttd/commit/5aa784443ef7f8028151a40a462c3395e07fb0aa))
- improve UI of team forms and reduce duplication of wrapping elements ([3108276](https://github.com/sdavisde/dttd/commit/3108276831422c1f6066b11da3ad1577b8e2c4db))
- improve ui on team forms ([6ba7cfb](https://github.com/sdavisde/dttd/commit/6ba7cfb244312dda4eca4332026c5c04dc95f159))
- improve UI/UX on team info sheet form ([ddd54c7](https://github.com/sdavisde/dttd/commit/ddd54c77e90ce3d3966078994cb7ce3656a0dee5))
- improve weekend card UI to clearly show edit and rosters ([05a4333](https://github.com/sdavisde/dttd/commit/05a43337aa33d2a04740319e40a8d1d987c967bd))
- make candidate fee page public ([478c828](https://github.com/sdavisde/dttd/commit/478c828ceb76eebd79c00eada9e0d0d9431b8647))
- make roster table thinner ([211287d](https://github.com/sdavisde/dttd/commit/211287d88683142cf0e4fae190bc3d2cb1104070))
- parse essentials training date correctly ([0674d53](https://github.com/sdavisde/dttd/commit/0674d5329906de0820b6c148ea263785b5975497))
- patch nextjs sec vuln ([f74cec5](https://github.com/sdavisde/dttd/commit/f74cec590454ed586ebf1bd9cb0688896096adb1))
- payment permissions ([7f2978a](https://github.com/sdavisde/dttd/commit/7f2978a23832dfb1653aa35f73be620cf371ae49))
- persist the first 3 team form submissions ([ee8fb67](https://github.com/sdavisde/dttd/commit/ee8fb67faf510ab835daadcf3b0ad920a2596c7c))
- prepare project for semantic release notes ([b0d5f8c](https://github.com/sdavisde/dttd/commit/b0d5f8c728443e549c83bd97154c883e64c24af8))
- put more state into form for single source of truth ([5c2f8eb](https://github.com/sdavisde/dttd/commit/5c2f8eb31cc53293c46ac3e57cd4e9c712e7f29c))
- redriect to admin from roles page if user doesn't have permission ([98c2f0a](https://github.com/sdavisde/dttd/commit/98c2f0a9fd8a2b3ec36e6cceeaacf00403cacd22))
- remaining lint errs ([5e4b9c2](https://github.com/sdavisde/dttd/commit/5e4b9c28c1a32bb3c8a29ef8ce8fdcd663f09ad5))
- remove engine causing errors ([583b2ca](https://github.com/sdavisde/dttd/commit/583b2ca71da24e806087d1049bf1a41603e1cad8))
- remove medical information ([7e6a08b](https://github.com/sdavisde/dttd/commit/7e6a08bee660772a1bffc3dba2bf75acd0f3781d))
- remove team fees from dashboard since they're now in the todo list ([caf8614](https://github.com/sdavisde/dttd/commit/caf8614d6eb2b13c1e71ed064bf625ef17b78977))
- remove title fallback from scheduling fn ([d699100](https://github.com/sdavisde/dttd/commit/d69910016a2c51acede44531a793bdb2e5219228))
- remove unused comp ([5285b4e](https://github.com/sdavisde/dttd/commit/5285b4efde86fc81d2e6acb82f30bad82315b72f))
- render the correct team fee amount in committment forms ([1a7da31](https://github.com/sdavisde/dttd/commit/1a7da3101c0c19f6b9071c64d16ea7a190381f46))
- replace remaining instance of old key ([3ad43d3](https://github.com/sdavisde/dttd/commit/3ad43d3bbc9430944669ecfdc5fd4808dfbb9a81))
- respect user cha_role in security ([ddba2a5](https://github.com/sdavisde/dttd/commit/ddba2a5a75488eb4ab92e526901a0c0e08ac043e))
- run prettier on all files ([17623dc](https://github.com/sdavisde/dttd/commit/17623dce31923297ff926b32f6cf139715bd048c))
- stop sending Error objects back from server actions, sending strings instead ([ebfeb52](https://github.com/sdavisde/dttd/commit/ebfeb52913e7b3c211b0b6465e9acb08c458b94e))
- update env variables ([5f3d00c](https://github.com/sdavisde/dttd/commit/5f3d00ceb8ef5d9c13fa15828db6a12de17f7420))
- update error to string to try and fix prod error ([7c74e55](https://github.com/sdavisde/dttd/commit/7c74e55a405a1077cd70da1161a5b10d9afb2eb9))
- update some design around master roster ([bfc4106](https://github.com/sdavisde/dttd/commit/bfc4106b124800d31eba1cb30865569a34407f2e))
- update status documentation for candidate table ([bffcf4a](https://github.com/sdavisde/dttd/commit/bffcf4ad2fa63a87e9912af9b1745382cc887e59))
- update wording for medical conditions field ([a2d19d9](https://github.com/sdavisde/dttd/commit/a2d19d93b17ed9db5d7b47b4cd79618b9df45848))
- upgrade supabase version to most recent ([ca81768](https://github.com/sdavisde/dttd/commit/ca817680985372974970f20be45083245c8efd55))
- upgrade versions again ([94870b6](https://github.com/sdavisde/dttd/commit/94870b6e35cb96b30d9785b77645ba7534b0289e))
- use admin client during webhook flow ([9990fc2](https://github.com/sdavisde/dttd/commit/9990fc2f4e4af6d20297bcdb146744c239a729dc))
- use consistent date formatting to ensure consistency in showing ([a494a9f](https://github.com/sdavisde/dttd/commit/a494a9f73bf367a828820d639822679fb47268f3))
- use date instead of string to power date picker, reducing string ([182cd98](https://github.com/sdavisde/dttd/commit/182cd98ef9a4baf899d97a7ba1eaaa81347988b2))
- use enum for weekend statuses ([7a85d0e](https://github.com/sdavisde/dttd/commit/7a85d0ea779b213c9f52fbdce4db8e751ba7e4c9))
- use permissions to hide user experience ([68193d0](https://github.com/sdavisde/dttd/commit/68193d0f95633d8e1fdf14fe09569c4b11e235ce))
- use sonner instead of alert ([29e88a8](https://github.com/sdavisde/dttd/commit/29e88a843cdd3fa553b14d22b7e11a0b6d88fe27))
- use updated db columns when saving forms, and add one for the last form step ([b40f5c1](https://github.com/sdavisde/dttd/commit/b40f5c1441187c1d79b9d6864faf52378df7501c))
