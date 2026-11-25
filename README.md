# LUGHA

One Language. Every Learner.

LUGHA is an Arabic learning and arcade app built with Next.js, React, TypeScript and Tailwind CSS. Its retained browser gameplay uses Canvas. Next.js API routes serve the same game, learning and classroom logic backed by SQLite locally or Turso in production.

## Run locally

Use Node.js 24 and pnpm. From this directory, run:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open [LUGHA on localhost](http://127.0.0.1:3000/). Start as a guest or select the account avatar to sign in to a school portal. Settings contains guided setup and the optional placement quiz.

Run the integration tests with `node --test`. They use a temporary database and require loopback network access.

## Teacher and administrator accounts

Register the account in the app. From the server directory, assign the role using the same environment and database as the running application.

```powershell
node --env-file-if-exists=.env server.mjs role teacher@example.test teacher
node --env-file-if-exists=.env server.mjs role admin@example.test admin
```

Teachers can create private classrooms, assign lessons, view and export reports, and control the classroom leaderboard. Students join using the classroom code and can opt in to appear under an anonymous alias. Administrators can add or edit lessons and vocabulary in Content Studio.

## Layla and speech

Guided Practice works without an API key. To enable the AI conversation option, set `GEMINI_API_KEY` as a server secret or put it in the ignored local `.env` file. The default model is `gemini-3.5-flash-lite`. Set `GEMINI_MODEL` to change it. Restart the server after changing configuration. The Gemini endpoint is limited to eight requests per account per minute. Google applies its own project, region and model limits. This app does not activate billing. Google lists free-tier text input and output for the default model and indicates that free-tier inputs may be used to improve its products. Leave the integration disconnected if those terms are unsuitable for your learners. [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite), [Gemini rate limits](https://aistudio.google.com/docs/rate-limits).

The app uses the browser's available Arabic voice for speech synthesis and browser speech recognition for microphone transcription. Voice availability and microphone support depend on the browser and operating system. The UI provides a text alternative and describes what the browser transcribed without assigning a pronunciation score. The app stores no audio recordings. Gemini Live and Gemini TTS offer Arabic capabilities, but this build uses REST text generation and browser speech. [Live API languages](https://aistudio.google.com/docs/live-api/capabilities#supported-languages), [Gemini speech generation](https://aistudio.google.com/docs/speech-generation).

## Production on Vercel

1. Import the `lugha-giis` GitHub repository into the `lugha-giis` Vercel project. Select the repository root and Next.js preset, retain the default install and build commands, and select Node.js 24.
2. Set the production branch to `main`. Vercel creates previews for branch pushes and deploys new commits to `main` to the same production project.
3. Create a Turso database and enter `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel's **Environment Variables** for Production. Use a separate database and token in Preview. If testing locally against Turso, put development-only values in an ignored `.env.local` file. Start from [the environment template](.env.example).
4. Optionally set `GEMINI_API_KEY` and `GEMINI_MODEL` for Layla. Without a key, the guided practice option is available. Set `LUGHA_TIME_ZONE` if you want quests and streaks to use a timezone besides Asia/Dubai.
5. Redeploy after adding secrets. Verify the actual HTTPS production domain in Vercel and test registration, progress, rewards, arcade controls, branding, accessibility settings and optional speech services.

The server seeds missing curriculum records and creates missing tables on first API access. Seed operations preserve existing content and learner records. Production requires Turso at runtime. The Vercel file system is never used for production learner data. Keep the production database binding stable during releases and use the provider's backup facilities. Account passwords are salted and hashed with scrypt, and session cookies are HTTP-only and secure on Vercel. Only the server holds the database token. Private progress and classroom scope are enforced by the API.

For future changes, run `pnpm test`, `pnpm build`, and `pnpm typecheck`. Push to a feature branch for a preview, verify the preview, merge to `main`, then check the production deployment and smoke-test the live site. Reuse the original project and database for every release.

Before a school launch, have a qualified Arabic teacher review the starter curriculum. Review account recovery, identity verification, safeguarding, and external speech and AI services for the intended learners. [Vercel Git deployments](https://vercel.com/docs/git), [Vercel plans](https://vercel.com/docs/plans), [Turso TypeScript SDK](https://docs.turso.tech/sdk/ts/reference).

## Implementation limits

- Starter content includes 50 lessons, 28 letters, 313 single-word entries, 100 multiword phrases, 20 conversation scenarios and 30 achievement badges. Lesson knowledge checks are generated from the curriculum. Some topics use translation matching and could use more explicit grammar instruction, reading passages and teacher-reviewed examples.
- The video centre uses narrated, captioned slides with follow-up checks. Writing practice uses tracing, dictation and learner self-assessment.
- Google sign-in, email verification and account recovery, continuous Gemini Live voice, real pronunciation or handwriting assessment, independently produced video, animated stroke-order guidance, friend and global leaderboards, streak reminders and protection, and admin editing for resources other than lessons and vocabulary remain outside this build.
- A credentialed AI request, device Arabic audio, actual microphone transcription and cross-device browser behaviour require further checks before deployment.

## GIIS Arcade

LUGHA uses the supplied GIIS logo as-is and identifies itself as a student innovation. The Arcade contains ten compact movement-based games with keyboard and touch controls, four selectable difficulty tiers and untimed assist. The server replays movement to determine the answer collision and score, and keeps personal bests per game. A completed game awards up to one completion reward per account and cabinet per day. Teachers can assign a cabinet from the classroom screen.

The current cabinets are compact takes on the brief. Snake uses vocabulary runes, Block Builder drops pieces into answer slots, and Grand Prix uses a scrolling gate course. Dedicated Snake spelling, freeform block combinations, extended platform campaigns, full racing tracks, additional puzzle formats and classroom tournaments are areas for expansion. The existing Layla integration still requires a Gemini API key for live testing and uses browser text-to-speech and transcription. It does not use streaming Gemini Live.


## School portals and demonstration accounts

The live guest preview keeps sign-in and shared school records disabled until a production database is added. To test the three authenticated portals locally, set `LUGHA_ENABLE_DEMOS=1` and run the app using a fresh local database. The server seeds fictional learners and links once. Demo seeding is disabled on Vercel.

| Portal | Email | Demo password |
| --- | --- | --- |
| Student | `student@lugha.example` | `LughaDemo2026!` |
| Parent | `parent@lugha.example` | `LughaDemo2026!` |
| Teacher | `teacher@lugha.example` | `LughaDemo2026!` |

The server-only `school.mjs` module reads authorised student profiles and parent links. A future school integration must provide documented identity claims or an SSO provider, authorised roster and relationship exports or APIs, and permission to ingest the specific teaching accommodations required. Map school learner identifiers to LUGHA account IDs. Keep parent links and teacher classroom assignments server-managed, and import only functional preferences such as larger text and untimed practice. School credentials and roster data must never be placed in client code or source control.

Bolt's narrated transcript approach now links lesson content to its related arcade game. With a database, the video knowledge check and the lesson-linked arcade results are recorded separately. The tutor uses the existing server Gemini key with structured Arabic examples, pronunciation and translations. Browser audio support still depends on the device.
