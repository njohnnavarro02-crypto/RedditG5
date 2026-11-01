# RedditG5 – Software Requirements

**Course:** IIT414 – Computer Programming 5 – Mobile Programming (w/Lab)
**Term:** First Semester, AY 2026–2027
**Group:** Group 5 (Platform: Reddit)
**Members:** Navarro, John Benedict · Ching, Jake Luis · Santos, Mico
**Final defense:** November 6, 2026 · **Files due:** November 3, 2026, 11:00 PM

> Items marked **(Proposed)** are our own design choices. They are not stated in the exam document. Everything else comes from the Finals exam.

---

## 1. Overview

RedditG5 is a Reddit-style social media app for Android. People sign in with Google, post to topic channels, and upvote or downvote posts. AI features help users read, write, and understand the feed. A separate web app lets administrators manage posts and users.

The project has two parts:

1. **Mobile app** – React Native CLI, installed on an Android device.
2. **Admin web app** – React + Vite (or plain HTML/CSS/JS), in an `admin-web` folder of the group's GitHub repo.

Both connect to **one Firebase project** on the **free Spark plan**. Do not upgrade to Blaze.

## 2. Goals

- Build a multi-screen social app with sign-in gating, lists, and navigation.
- Use Google Sign-In and Cloud Firestore for create, read, update, and delete (CRUD).
- Protect data with role-based Firestore security rules.
- Add Gemini AI (through Firebase AI Logic) safely, with protection against prompt injection.
- Test, document, and defend the design as a team.

## 3. Tech Stack

| Area | Requirement |
| --- | --- |
| Mobile app | React Native CLI (New Architecture), Android |
| Mobile Firebase | `@react-native-firebase` (auth, firestore, app-check, ai) |
| Admin web app | React + Vite recommended, Firebase JS SDK (modular, `firebase` npm package) |
| Auth | Firebase Authentication with Google Sign-In (`webClientId` = Web client ID) |
| Database | Cloud Firestore (Spark plan) |
| AI | Firebase AI Logic, Gemini Developer API (`@react-native-firebase/ai` on mobile, `firebase/ai` on web). No API key in the app |
| App Check | Required for Firebase AI Logic starting November 2, 2026. Use the debug provider and register the debug token in the Firebase console on Day 1 |
| Source control | One GitHub repo containing the mobile app and `admin-web` (no `node_modules`, keystores, or API keys) |

**Not required (paid or out of scope):** image uploads / Firebase Storage, Cloud Functions, push notifications, follows, direct messages. Text-only posts are fine.

## 4. Mobile App Requirements

### 4.1 Required features

| ID | Feature | What it must do |
| --- | --- | --- |
| M1 | Google Sign-In | Login and logout with Firebase Authentication. The user stays signed in after the app restarts. |
| M2 | Feed screen (Read) | Shows posts in real time from Firestore, newest first, with the author's name and photo. |
| M3 | Create post (Create) | A signed-in user can publish a text post. An image by URL is optional. |
| M4 | Edit post (Update) | Only the author can edit their own post. |
| M5 | Delete post (Delete) | Only the author can delete their own post, with a confirmation prompt. |
| M6 | Profile screen | Shows the Google account name, photo, and email, plus the user's own posts. |
| M7 | "Ask the Feed" AI chatbot | Multi-turn chat that answers questions about the community's posts, using recent posts as context. Each answer cites the posts it used (for example [P1], [P2]). Tapping a citation opens or highlights that post. Replies stream word by word. |
| M8 | AI Feed Summary (cached) | A "Summarize" button sends the latest posts (maximum 20) to the AI and shows a short summary. The summary is saved in `summaries/latest` with a "last updated" time. It is regenerated only when newer posts exist. |
| M9 | AI Writing Helper | In the Create and Edit screens, buttons to **Improve**, **Shorten**, or **Translate to Filipino**. The user reviews and edits the result before posting. The AI never publishes on its own. |
| M10 | AI safety guardrails | See section 6. |
| M11 | Disabled account notice | A user disabled by an admin sees a message in the app and cannot create posts. |

### 4.2 Reddit signature feature (bonus)

Group 5's platform feature is **topic channels with upvote and downvote**. The exam treats the signature feature as a bonus (up to +4 points for all bonus items together).

| ID | Feature | What it should do **(Proposed)** |
| --- | --- | --- |
| R1 | Topic channels | Each post belongs to one channel (like a subreddit). Users can pick a channel when posting and filter the feed by channel. |
| R2 | Upvote / downvote | Each user gets one vote per post (up, down, or none). Tapping the same vote again removes it. Switching between up and down changes it. |
| R3 | Vote score | The feed and post cards show a net score (upvotes minus downvotes). |
| R4 | Sort | Feed can sort by **New** and **Top** (by score). |

### 4.3 Other bonus ideas (up to +4 points total)

Comments, image by URL, search, pull-to-refresh, dark mode, AI moderation review queue, AI chatbot actions (function calling, with user confirmation), "Report post" with a Reports page, Firebase Hosting for the admin web app.

### 4.4 Suggested screens

- Login
- Feed (with channel filter and sort)
- Create / Edit Post (with AI Writing Helper)
- Profile
- Ask the Feed (chatbot)
- Disabled-account notice

Navigation: stack and tab navigation, with authentication gating (signed-out users only see Login).

## 5. Admin Web App Requirements

Four pages only: **Login, Dashboard, Posts, Users**.

| ID | Page | What it must do |
| --- | --- | --- |
| A1 | Admin Login | Google Sign-In with `signInWithPopup`. Only accounts listed in the `admins` collection may enter. Any other account sees "Access denied" and is signed out. |
| A2 | Dashboard | Shows total users, total posts, and posts created today. Includes an **AI Insights** panel with trending topics and the overall mood (positive, neutral, negative) of recent posts. Insights use structured JSON output, are saved in `insights/latest`, and refresh with a Refresh button. |
| A3 | Posts (moderation) | Table of all posts (author, text, date) with a Delete button and confirmation prompt. A deleted post disappears from the mobile feed in real time. |
| A4 | Users | Table of users (name, email, date joined, status) with a Disable / Enable button that sets the user's `disabled` field. |
| A5 | Logout | Signs the admin out. |

**Admin role without Cloud Functions:** create admin accounts by hand. In the Firebase console, add a document `admins/{uid}` for each admin. Security rules check this collection. Custom claims and the Admin SDK are not needed.

**Disabling users:** a browser cannot delete Firebase Auth accounts. Disabling uses the `disabled` field in `users/{uid}`, enforced by the security rules and the mobile app.

**Running it:** `npm run dev` on localhost is acceptable for the defense. For localhost AI, set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, then register the printed debug token in the Firebase console. Deploying to Firebase Hosting is a bonus.

## 6. AI Requirements

### 6.1 Shared AI helper

Write **one shared AI helper** used by all AI features. It holds the system instruction, guardrails, and error handling.

### 6.2 Safety guardrails

- **Posts are data, not instructions.** Use a system instruction plus clearly labeled post blocks, so a post like "Ignore previous instructions…" cannot change the AI's behavior.
- **No personal data to the AI.** Send only post text. No names, emails, or UIDs. (Free-tier prompts may be used by Google.)
- **Cooldown.** A short cooldown prevents repeated calls.
- **Friendly errors.** Show a clear message when an AI call fails or the free rate limit is reached (HTTP 429).
- **Streaming fallback.** If streaming does not work on the device, show a typing indicator and reveal the full reply word by word.

### 6.3 AI Safety Test Table

Document **10 test prompts**, including a prompt-injection post. For each, record the expected result and the actual result.

## 7. Firestore Data Model

From the exam:

| Collection | Fields |
| --- | --- |
| `users/{uid}` | `displayName`, `email`, `photoURL`, `createdAt`, `disabled` (true/false) |
| `posts/{postId}` | `authorId`, `authorName`, `authorPhotoUrl`, `text`, `createdAt` (serverTimestamp), optional `imageUrl`, optional `likeCount` |
| `admins/{uid}` | Created manually in the Firebase console |
| `summaries/latest` | `text`, `postCount`, `lastPostAt`, `updatedAt` |
| `insights/latest` | `topics`, `mood`, `updatedAt` (written by admins only) |

Add a **composite index** on `authorId` + `createdAt` for the Profile query. Use the link shown in the Firestore error message to create it.

**(Proposed) additions for the Reddit feature:**

| Collection / field | Purpose |
| --- | --- |
| `posts/{postId}.channel` | The topic channel name for the post (for example `"gaming"`). |
| `posts/{postId}.score` | Net vote score shown in the feed. |
| `posts/{postId}/votes/{uid}` | One document per voter with a `value` of `1` or `-1`. Prevents double voting. |
| `channels/{channelId}` | `name`, `description`, `createdAt`. Can be a fixed list created by admins. |

Because there are no Cloud Functions, the app updates `score` and the user's vote document together in one Firestore **transaction**.

## 8. Firestore Security Rules

From the exam:

- Only signed-in users can read.
- A post can be created only when `authorId` equals the signed-in user's UID **and** the user is not disabled.
- Only the author or an administrator can delete a post.
- Only the author can edit a post.
- Only an administrator can change a user's `disabled` field.
- If you add likes, other users may update **only** the `likeCount` field.
- Signed-in users may write `summaries/latest`. Only administrators may write `insights/latest`.
- Do not use test mode.

**(Proposed) for voting:** other users may update **only** the `score` field on a post, and a user may write only their own `votes/{uid}` document.

## 9. Firebase Setup Requirements

- Use **one Firebase project per group**.
- Add the **debug SHA-1** of every member's laptop **and** the SHA-1 of the **release keystore** to the Firebase project. The defense uses the signed release APK.
- Re-download `google-services.json` after adding fingerprints.
- Register a Web app in the same project for the admin module.
- Set up App Check (debug provider) on Day 1.
- If the midterm project does not build with the current `@react-native-firebase` version, create a fresh React Native CLI project and copy the screens over. Midterm screens, navigation, and styles can be reused.

## 10. Suggested Role Distribution

| Member | Responsibilities |
| --- | --- |
| **Member 1** | Firebase and App Check setup, Google Sign-In, Profile screen, disabled-account notice, Firestore security rules (including admin rules), admin web **Login** and **Users** pages |
| **Member 2** | Feed, Create, Edit, Delete Post (Firestore CRUD), AI Writing Helper, admin web **Posts** page |
| **Member 3** | Shared AI helper and guardrails, Ask the Feed chatbot, AI Feed Summary, admin **Dashboard** with AI Insights, AI Safety Test Table |
| **All members** | Testing on physical devices and the browser, documentation, presentation |

The Reddit signature feature (channels, voting) can be split between Members 1 and 2 as needed. Write the final assignment in your documentation.

## 11. Schedule

| Week | Dates | Goals |
| --- | --- | --- |
| Week 1 | Oct 14–20 | Project builds on all three laptops. Firebase and App Check set up. Google Sign-In works. Security rules written (no test mode). Shared AI helper gives a first reply. **Checkpoint: OBT 05 – Sign In With Google (Tue, Oct 20)** |
| Week 2 | Oct 21–27 | Feed, Create, Edit, Delete working with real data on two phones. Ask the Feed with citations and streaming. AI Writing Helper. Admin login and Posts page. Test signed release APK built and its SHA-1 registered. **Checkpoint: OBT 06 – Live Feed (Tue, Oct 27)** |
| Week 3 | Oct 28–Nov 3 | AI Feed Summary with caching. Admin Dashboard with AI Insights and Users page. AI Safety Test Table. Testing and polish. **Feature freeze Fri, Oct 30 (Checkpoint: OBT 07 – Ask the Feed).** Documentation, slides, rehearsal. |
| Defense | Nov 6 | Final defense. Nov 1 and Nov 2 are holidays. |

**Fallbacks:** if Google Sign-In is not working by the Week 1 checkpoint, temporarily use email/password login so CRUD work can continue, and keep fixing Google Sign-In. If streaming is not working by Oct 27, use a typing indicator with a word-by-word reveal.

## 12. Deliverables

Submit to **Canvas > Mobile Programming > Classwork > Final Examination** on or before **November 3, 2026, 11:00 PM**:

1. **Documentation** (`.docx` and `.pdf`), named `IT3A- Finals Project -MP- <Group #><App Title>`. Use the Canvas documentation guidelines. Contents:
   - Title Page, Table of Contents, List of Figures, List of Tables
   - **Chapter 1 – Introduction:** Background, Objectives, Scope and Delimitation, Significance
   - **Chapter 2 – App Design:** Conceptual Model, Screen Design and Navigation Map (mobile and admin web), Firestore Data Model, Definition of Terms
   - **Chapter 3 – Implementation and Testing:** Login, Feed, Create/Edit/Delete (with AI Writing Helper), Profile, Ask the Feed, AI Feed Summary, Admin Web App, Firestore Security Rules, Key Code Snippets (Google Sign-In, Firestore CRUD, Shared AI Helper), AI Safety Test Table, Test Results checklist, Screenshots, Roles and Responsibilities
2. **Presentation** (`.pptx`), named `Mobile Programming- Finals Project - <Group #><App Title>`. Needs a menu and navigation buttons. Covers: title and student names, Chapter 1 summary (except Objectives, which are shown in full), Chapter 2 diagrams and data model, Chapter 3 screens, AI features, AI Safety Test Table, and the admin web app.
3. **Signed release APK** (or a Google Drive link).
4. **GitHub repository link** with the mobile app and `admin-web` folder.
5. **Firebase Hosting URL**, if the admin web app is deployed.

Print two sets of documentation in **blue plastic sliding folders**.

## 13. Defense Requirements

- Arrive 15 minutes early. Wear the school uniform. Speak in English only.
- Presentation length: **6–8 minutes** for the top rubric score. Do not go past 10 minutes.
- Have a stable internet connection and a **screen recording backup** of the demo. Bring a laptop with the admin web app ready to run.
- Order of presentation: app title and members → Background summary → objectives (copied as is) → scope and delimitation → intended users → app demo.

**App demo order:**

Google Sign-In → Feed on two phones → Create Post with AI Writing Helper → Edit Post → Delete Post → Profile → Ask the Feed chatbot → AI Feed Summary → post a prompt-injection test and show the AI is not hijacked → Admin web app (login → dashboard with AI Insights → delete a post → disable a user) → show the disabled user's notice on the phone → force-close and reopen (still signed in) → Logout → show the Firestore rules.

If you build the Reddit feature, show channels and voting during the Feed step.

## 14. Panelist Feature Checklist

- [ ] 1. Google Sign-In login
- [ ] 2. Stays signed in after app restart
- [ ] 3. Feed updates in real time on two phones
- [ ] 4. Create Post
- [ ] 5. Edit own Post
- [ ] 6. Delete own Post (with confirmation)
- [ ] 7. AI Writing Helper (Improve / Shorten / Translate)
- [ ] 8. Profile screen with own posts
- [ ] 9. Ask the Feed: answers about posts with tappable citations
- [ ] 10. Streaming AI replies
- [ ] 11. AI Feed Summary (cached, shows last updated)
- [ ] 12. Prompt-injection post does not hijack the AI
- [ ] 13. Friendly AI error / rate-limit message
- [ ] 14. Logout
- [ ] 15. Admin web: Google login (non-admin is denied)
- [ ] 16. Admin web: Dashboard totals and AI Insights (topics and mood)
- [ ] 17. Admin web: delete a post (disappears from the phone in real time)
- [ ] 18. Admin web: disable / enable a user (disabled user cannot post)
- [ ] 19. Firestore Security Rules shown

## 15. Grading Summary

| Part | Weight | Notes |
| --- | --- | --- |
| Documentation | 40% (/40) | Format, Chapters 1–3, appearance |
| Actual presentation | 60% (/60) | Time limit, content, language, understanding, enthusiasm, creativity, roles. Bonus up to +4 |
| PowerPoint / Canva | 25 points | Organization, content, multimedia design, overall appearance, punctuality (5 each) |

Any form of cheating means an automatic grade of zero. Students who miss the app demo presentation get an INCOMPLETE and must present individually.
