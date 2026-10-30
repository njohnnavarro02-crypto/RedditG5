# Reddit Clone — IIT414 Final Project (Group 5)

A **Reddit-inspired social app UI** built with **React Native CLI** (no Expo).
This milestone is **UI-only**: every screen mimics the real Reddit app's look and
interactions, running on local mock data. Firebase, voting transactions, and the
AI backend will be wired in a later stage.

## What's inside

| Screen | What it does |
| --- | --- |
| **Sign in** | Logo hero + "Continue with Google" / guest (mock auth gate) |
| **Home** | Feed of post cards, Hot / New / Top sort chips, logo header |
| **Communities** | Directory of r/technology, r/gaming, r/education, r/programming, r/general with Join buttons |
| **Community page** | Colored banner, member counts, description, that community's feed |
| **Create Post** | Community picker chips, title + body, Post button (validates title) |
| **Post Detail** | Full post, vote pill, comment list, working comment composer |
| **Ask the Feed** | Mock AI chat with word-by-word streaming and tappable `[P1]`-style citations that jump to the cited post |
| **Profile** | Avatar, karma chips, Overview/Posts/Comments tabs, Log out |

Voting is interactive: tap the up/down arrows to vote, tap again to remove the
vote — the score updates like Reddit. Your own posts are auto-upvoted (like Reddit).
Everything lives in memory (resets on app restart) until Firebase is connected.

## Run it (Android)

Prerequisites: Node 18+, JDK 17, Android Studio with an emulator (or a device
with USB debugging). See the official
[React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

```bash
npm install
npm start            # Metro (keep it running)
# in a second terminal:
npm run android
```

The project already contains the `android/` folder, so no extra init step is needed.

## Project structure

```
App.tsx                    # providers + root
src/
  navigation/              # bottom tabs + stack, typed param lists
  screens/                 # SignIn, Home, Communities, Community, CreatePost, Ask, Profile, PostDetail
  components/              # PostCard, VotePill, Icon (svg set), JoinButton, CommunityAvatar
  context/PostsContext.tsx # posts, votes, comments, mock auth state
  data/mock.ts             # 5 communities, 16 posts, comments, AI answers
  assets/                  # reddit logo / snoo / google G images
```

## Branding note

This project uses the Reddit name, Snoo logo, and wordmark **solely for a
non-published school coursework demo**, as agreed by the group. They are
trademarks of Reddit Inc. If the professor asks for original branding, swap
`src/assets/reddit-logo.png` / `reddit-icon.png` and the two `Image` tags in
`HomeScreen` / `SignInScreen` — everything else stays the same.

## Next stages (per the project spec)

1. Firebase Auth (Google Sign-In) + Firestore replacing the mock context
2. Transaction-safe voting (`posts/{postId}/votes/{uid}`)
3. Real "Ask the Feed" AI (Firebase AI Logic) with citations + caching
4. Admin web app (currently dropped per group decision)
