# App Overview (for users)

## Welcome & Identity
- Splash: Black splash with the app logo and subtitle “by Triki Ghofrane” shown at launch (Expo splash).
- Branding: App name “Anas plus”; dark theme with red accents; custom app icon matches the splash.

## Access & Account
- Login/Register with email + password; validation for email format and password strength.
- Logout clears stored token and user info; basic profile data saved locally for greetings/navigation.

## Home & Navigation
- Home: welcome hero, stats, city filters and search; quick actions (map, bookings, workouts); upcoming sessions; social links; floating shortcuts to progress, programmes, and logout.
- Map: branch map view with navigation into branch details.

## Branches & Sessions
- Branch detail: hero image, open/closed status from availabilities, quick actions (equipment/map/booking), today’s schedule, weekly schedule (women/kids/free highlights), coaches carousel, hours, contact actions, and map overlay.
- Group sessions: view by branch, see today/weekly schedules, special sessions summary modal; open session detail from lists.
- Bookings: load user bookings, see upcoming/past, open session detail via home quick action/modal; badge on home bell shows count of upcoming sessions only.

## Training Content
- Workouts: list and view workouts with exercises/media; add/remove/reorder exercises; mark progress where supported.
- Programmes: browse, search, filter, sort; create programmes (title/objective/description/duration); attach workouts with order/week-day; view by week/day; add/remove workouts.
- Machines/Movements/Exercises: view machine details, movement details, and exercise details with media.

## Coaches & Progress
- Coach detail: view profile, availability indicator, specialties/media (per screen).
- Branch coaches: carousel of coaches with presence status and quick navigation.
- Progress: dedicated user progress screen; profile screen to view/edit basic info.

## Social & Parameters
- Pull public parameters (app name, hero image, opening hours, social links) for display on home.
- Open Instagram/Facebook from home social buttons.

## Connectivity & Storage
- API via axios with token interceptor; covers auth, branches, sessions/bookings, programmes, workouts, machines, parameters.
- AsyncStorage holds auth token and user id/name/email for personalization.
remove the passed
