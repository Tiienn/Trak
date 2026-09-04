# Play Store listing copy

Source of truth for the Google Play listing. Update Play Console →
Grow users → Store presence → Store listings when this changes.

## Short description (80 char max)

```
Point your camera at a meal and get instant calorie and macro estimates.
```

72 chars. Unchanged — still accurate, and deliberately avoids price claims
(Play rejects promotional wording like "free" in the short description).

## Full description

```
Trak points your camera at a meal and estimates the calories, protein, carbs, and fat in seconds — no manual food-database searching.

Trak is designed for adults aged 18 and over.

HOW IT WORKS
- Photo scan: snap a plate, Trak identifies the food and estimates the nutrition
- Barcode scan: packaged foods use real label data, not a guess
- Chat logging: type "2 eggs and a slice of toast" and it's logged — or ask questions like "how much protein do I have left today?"

Every photo estimate is cross-checked against Open Food Facts and web nutrition data where possible, and each scan shows a plain-English note on how the estimate was made — portion size assumed, cooking method, hidden oils. If Trak's numbers consistently run high or low for how you eat, a bias slider in settings corrects future estimates.

BEYOND CALORIES
- Weight, water, and exercise tracking
- Daily supplement and vitamin checklist with streaks
- Weekly insights: trends, gaps, and what to focus on next
- Reminders for meals, hydration, and weigh-ins
- Optional Android Health Connect sync
- A daily calorie-guessing game if you want logging to feel less like a chore

HONEST ABOUT LIMITS
Photo estimates are estimates, not lab measurements — treat them as directionally useful, not exact. Barcode scans use real label data. Trak is not a medical device and doesn't replace advice from a doctor or dietitian.

PRICING
Trak starts with a 7-day free trial with full access. No payment details are needed to begin.

After the trial, these stay free — no subscription, no time limit:
- Barcode scanning, quick-add, and manual meal entry
- Water, weight, and exercise tracking
- History, weekly insights, supplements, reminders, and games

A subscription unlocks the three AI features that cost real money to run:
- AI photo scanning
- Chat and Ask coaching
- Body Analysis progress-photo check-ins

Fair-use safeguards allow up to 150 combined AI photo and Chat/Ask requests, plus 3 Body Analysis attempts, per day.

Subscriptions are billed through Google Play or the Apple App Store and renew automatically until cancelled. The exact price and any eligible trial are shown before you confirm, and you can cancel any time in your store's subscription settings. No ads, ever.
```

## Why the pricing section changed

The previous version claimed "Trak is free — scanning, chat, tracking, all of
it… No ads, nothing paywalled." Once AI photo scan, Chat/Ask, and Body Analysis require a
subscription that statement is false, which is a Play policy problem
(misleading listing) and a reliable source of 1-star reviews and refund
requests from users who read it before installing.

The replacement is deliberately specific about what stays free so the paywall
never reads as a bait-and-switch.

## Still to do outside the listing

- Configure the 7-day free trial as an offer on the Play Console base plan
  (Monetize → Products → Subscriptions → base plan → Offers). Code cannot
  create this; without it Google will charge immediately with no trial.
- Confirm the same 7-day trial is configured in App Store Connect.
- In Google Play's Target audience and content settings, select only "18 and over" and enable Restrict minor access.
- In App Store Connect, review the age questionnaire and override the rating so it matches Trak's 18+ minimum age.
