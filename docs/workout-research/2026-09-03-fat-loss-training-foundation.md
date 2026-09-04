# Fat-loss training foundation

Status: approved and implemented on 2026-09-03.

Date reviewed: 2026-09-03

## Scope

This review addresses six gaps in Trak's support for people whose active goal is to lose weight:

1. beginner and no-equipment strength training;
2. progressive walking and aerobic training;
3. low-impact options for users with higher body mass or joint limitations;
4. resistance training during an energy deficit;
5. adaptive weekly scheduling and adherence;
6. plateaus and the transition to weight maintenance.

This is an evidence review, not a promise that exercise alone will cause a particular amount of weight loss. Trak should present exercise as support for health, fitness, energy expenditure, function, and muscle retention. It should not prescribe a calorie-burn target or imply that a completed workout compensates for food.

## Evidence summary

### Activity target is a destination, not the starting dose

- Adults should work toward 150–300 minutes of moderate aerobic activity per week, or the vigorous equivalent, plus muscle-strengthening activity on at least two days.
- Inactive or low-fitness adults benefit from small amounts and should progress gradually. The US guidelines specifically describe 5–15 minutes of light-to-moderate walking, two or three times per week, as a low-risk entry point for many low-fitness adults, including adults with overweight or obesity.
- The amount needed for weight control varies substantially. More than 300 moderate minutes may help some people with substantial loss or maintenance, but it is not an automatic prescription for every user.
- Moderate intensity is best expressed with the talk test: breathing and heart rate are noticeably faster while conversation remains possible.

### Strength training remains essential during weight loss

- Dietary weight loss can reduce fat-free mass as well as fat mass.
- A 2025 meta-analysis of 25 randomized trials found that adding resistance exercise to dietary weight loss protected fat-free mass, increased fat-mass loss, and improved strength compared with diet alone, without meaningfully changing total scale-weight loss.
- A larger 2022 meta-analysis likewise supports resistance training as part of a multi-component intervention for adults with overweight or obesity.
- A small 2025 randomized pilot found that home resistance training improved strength and sit-to-stand performance during dietary weight loss, although it did not produce a detectable body-composition advantage. This supports accessibility and function, but it is not sufficient evidence for claiming that one specific home routine preserves muscle.
- Trak should therefore recommend at least two balanced strength sessions when feasible. Three or four sessions are options based on preference, time, training history, and recovery—not requirements created solely by experience level or the fat-loss goal.

### Low-impact does not mean low value

- Walking is a practical default, but it should not be the only path. Cycling, elliptical work, swimming, water walking, and low-impact aerobics can all accumulate moderate activity.
- For a user with pain or a mobility limitation, Trak should recommend only compatible modalities and allow the user's symptom response and clinician guidance to override generic rankings.
- Aquatic exercise has evidence for improving pain and function in adults with overweight or obesity and lower-limb osteoarthritis, although the optimal dose remains uncertain.
- Running, jumping, and near-maximal intervals should not be default recommendations for an inactive user.

### Adherence is a first-class recommendation input

- Lack of time, pain, limited enjoyment, environmental constraints, and unrealistic expectations are recurring barriers to adherence.
- Enjoyment, self-efficacy, and social support are associated with greater activity. Evidence for any single ideal session frequency, duration, or intensity is inconsistent.
- Trak should prefer a modality the user likes and can repeat over a theoretically higher-calorie modality they avoid.
- Missed sessions should cause rescheduling or a smaller next step, not punishment or a compensatory workout.

### Daily movement complements workouts

- Public-health guidance recommends moving more and sitting less. Short walking or simple movement breaks improve post-meal glucose and insulin responses acutely compared with uninterrupted sitting.
- These effects do not establish long-term weight loss. Trak may offer optional movement-break prompts, but they should not count as structured cardio unless the user records sufficient duration and intensity.

### Maintenance needs its own phase

- Physical activity remains important after weight loss. NIDDK advises that some people may need about 300 moderate minutes per week to help prevent regain, while emphasizing individual variation and sustainable habits.
- Trak should never increase exercise from one short-term scale reading. Weight fluctuates for reasons unrelated to fat change.
- A plateau response should first check a multi-week trend, completion data, current intake plan, sleep/recovery, and whether the plan is still realistic. Change one controllable lever at a time and preserve strength training.

## Proposed user inputs

Add these only when the active goal is `lose`, reusing data already known by Trak whenever possible:

- current activity baseline: inactive, some weekly activity, or consistently active;
- cardio modes the user enjoys and can access;
- current comfortable continuous walking/cardio time: under 5, 5–14, 15–29, or 30+ minutes;
- days per week available and time per day;
- whether standing from a chair and walking on level ground are comfortable;
- joint pain, balance concerns, and clinician-imposed restrictions;
- preference for home, outdoors, gym, pool, or mixed training;
- optional daily-movement preference, without making step tracking mandatory.

Do not infer cardiovascular safety from body weight, age, or experience alone.

## Proposed cardio catalogue additions

Each activity should retain a modality, intensity, duration range, location/equipment requirements, contraindication tags, and internal evidence/source references.

| Activity | Default level | Starting prescription | Progression | Important limits |
| --- | --- | --- | --- | --- |
| Comfortable walk | Beginner | 5–15 min, light to moderate | Add time before pace; build toward a conversational brisk walk | Prefer level, predictable surface for low fitness or balance concerns |
| Brisk walk | Beginner | 10–30 min, moderate talk-test effort | Extend duration, then optionally add mild incline | Do not force brisk pace when pain or gait changes appear |
| Indoor march / low-impact aerobics | Beginner | 5–20 min, light to moderate | Longer uninterrupted bouts or slightly larger movements | Stable floor, clear space; avoid choreography when balance is limited |
| Stationary cycling | Beginner | 10–30 min, light to moderate | Add minutes, then resistance | Bike fit matters; symptoms still override the recommendation |
| Elliptical | Beginner/intermediate | 10–30 min, moderate | Add minutes, then resistance | Requires equipment and sufficient balance/familiarity |
| Swimming / water walking | Beginner | 10–30 min, light to moderate | Add pool time or continuous laps | Requires water competence, access, and appropriate supervision |
| Low-impact intervals | Intermediate | 5 min easy, then 4–8 rounds of 1 min purposeful / 1–2 min easy, then cool down | Add rounds before intensity | Only after the user tolerates steady work; never near-maximal by default |

The existing generic `Moderate steady cardio` item should become a fallback category rather than competing with every specific modality. The existing vigorous interval item should remain gated and should not be the default fat-loss recommendation.

## Proposed home strength catalogue additions

These are balanced entry-level movements, not a branded routine. Trak should normally select one movement from each available pattern rather than prescribe all variations together.

| Exercise | Primary / secondary muscles | Entry prescription | Progression | Safety and limitations |
| --- | --- | --- | --- | --- |
| Chair sit-to-stand | Quads, glutes / hamstrings, core | 2 sets of 6–12, 60–90 sec rest, stop with about 2–3 good reps available | More reps, lower stable seat, slower lowering, then external load | Stable chair against a wall; reduce depth or exclude if painful |
| Wall push-up | Chest, triceps / front delts, core | 2 x 6–15, 60–90 sec | Step feet farther back, then use a lower incline | Neutral body line; use a secure surface |
| Incline push-up | Chest, triceps / front delts, core | 2 x 6–15, 60–90 sec | Lower the secure incline, then floor variation | Not the first option for wrist or shoulder aggravation |
| Glute bridge | Glutes / hamstrings, trunk | 2 x 8–15, 60–90 sec | Pause at top, more reps, then load or single-leg regression ladder | Avoid forcing lumbar extension; exclude if floor transfers are unsuitable |
| Supported split squat | Quads, glutes / hamstrings, calves | 2 x 5–10 each side, 60–90 sec | More range, reps, then load | Use stable hand support; not an entry choice with significant balance or knee-pain concerns |
| Standing calf raise with support | Calves | 2 x 8–15, 45–75 sec | More reps, pause, single-leg, then load | Stable support; controlled range |
| Backpack row | Upper back, lats / rear delts, biceps | 2 x 8–15, 60–90 sec | Add reps, then small amounts of securely packed load | Household-load option, not true no-equipment; keep load secure and spine controlled |
| Resistance-band row | Upper back, lats / rear delts, biceps | 2 x 8–15, 60–90 sec | More reps, slower lowering, then stronger band | Anchor must be designed and secured for exercise |
| Bird dog | Trunk / glutes, shoulders | 2 x 5–10 each side with controlled holds | Longer reach or pauses without trunk rotation | Reduce range for balance or back discomfort |

Dead Bug remains in the catalogue. Trak should not recommend improvised door-mounted towel rows because anchor failure is avoidable. A true no-equipment plan cannot provide meaningful progressive pulling resistance as well as a band, backpack, or gym setup; the app should state that limitation honestly.

### Strength effort and progression

- Beginners should learn stable, controlled repetitions before being reminded to train to failure.
- For these entry movements, default to approximately 2–3 repetitions in reserve. The existing failure reminder may apply later to safe, familiar exercises, but not to every set and not to unstable or balance-limited movements.
- When every prescribed set reaches the top of its rep range with controlled technique and no concerning pain, progress one variable: range, reps, leverage, or load.
- Do not progress load and total volume simultaneously.

## Proposed adaptive weekly planner

### Starting bands

1. **Inactive or under 5 comfortable minutes:** 5–10 minutes of light-to-moderate cardio on 2–3 days, plus one or two short strength sessions as tolerated.
2. **Some activity or 5–14 comfortable minutes:** 10–20 minutes on 3 days, plus two strength sessions.
3. **Comfortable for 15–29 minutes:** 15–30 minutes on 3–5 days, plus two or three strength sessions according to availability and recovery.
4. **Consistently active for 30+ minutes:** distribute enough preferred moderate activity to work toward 150 minutes, retain at least two strength days, and use vigorous work only when appropriate.

These bands are conservative Trak product rules derived from start-small guidance; they are not clinical dose-response thresholds.

### Weekly progression heuristic

- Progress only after the user completes most of the planned work and reports no worsening pain, unusual exhaustion, or safety symptom.
- Change one variable in the next week: add approximately 5 minutes to one or two sessions, or add one short session. Do not raise duration, frequency, and intensity together.
- Hold the plan when adherence is mixed but the sessions were tolerable.
- Reduce duration/intensity or change modality when completion is poor because the plan was too difficult, pain increased, or recovery deteriorated.
- Return gradually after illness or a meaningful break.
- Recovery and adherence override the race to 150 minutes.

### Example schedules

**Inactive beginner, home, 15 minutes available**

- Monday: 10-minute walk.
- Wednesday: 12–15-minute full-body strength circuit.
- Friday: 10-minute walk.
- Sunday: optional 5–10-minute comfortable movement.

**Active beginner, 30 minutes available**

- Monday: full-body strength, 25–30 minutes.
- Tuesday: preferred moderate cardio, 20–30 minutes.
- Thursday: full-body strength, 25–30 minutes.
- Saturday: preferred moderate cardio, 25–30 minutes.
- Other days: optional easy movement; no requirement to compensate for a missed session.

**Gym user already meeting the baseline**

- Retain two or three balanced strength sessions.
- Distribute moderate cardio around recovery and preference.
- Do not automatically add more cardio when 150 equivalent minutes is reached. Offer an optional maintenance/performance progression only when recovery and adherence are good.

## Proposed plateau and maintenance rules

- Do not label a plateau from fewer than three weeks of comparable weight-trend data.
- Do not react when logging is sparse or weigh-ins are too inconsistent to establish a trend.
- First response: reinforce completed behaviors, confirm that the plan is being followed, and surface nutrition/sleep review without diagnosing or prescribing an aggressive calorie deficit.
- If activity is below the user's current plan, make the next session easier to complete rather than increasing the target.
- If adherence and recovery are good, offer one small change: one short moderate session, slightly longer existing sessions, or a modest daily-movement goal.
- Preserve at least two strength days when feasible.
- When the user reaches maintenance, retain preferred strength and cardio habits; present 150–300 minutes as a health range and higher volume as individualized, not mandatory.

## Safety gates

- Stop exercise and seek medical evaluation for exertional chest pain or pressure, fainting/lightheadedness, or severe/unusual shortness of breath. Emergency symptoms require local emergency care.
- Users with known heart disease, uncontrolled blood pressure, diabetes complications, major mobility limitations, pregnancy/postpartum considerations, or clinician restrictions need advice tailored by a qualified health professional.
- New or worsening joint pain, swelling, altered gait, or loss of function should block progression and trigger a lower-impact alternative or professional assessment.
- Muscle effort and temporary breathlessness can be normal; sharp pain, neurological symptoms, and escalating symptoms are not progression signals.
- Trak must not present BMI or the user's size as a reason to assume incapacity. Recommendations should use current ability, symptoms, preference, and restrictions.

## What should not be adopted

- “Fat-burning” exercises or a special fat-loss lifting routine.
- Estimated exercise calories as a target, reward, or permission to eat.
- HIIT as the default because it is time-efficient.
- Jumping/running prescriptions for every user with a fat-loss goal.
- A universal requirement for four strength sessions or 300 cardio minutes.
- Daily scale changes as the trigger for more exercise.
- Training every strength set to failure, particularly for beginners and unstable home movements.
- Step counts that override structured activity or become an all-or-nothing success measure.
- Claims that one modality specifically removes abdominal fat.

## Proposed implementation order after approval

1. Add baseline ability, cardio preference, and pain/balance inputs.
2. Add specific cardio modalities and the entry-level home strength catalogue.
3. Replace the immediate 150-minute chase with baseline-aware weekly progression.
4. Build a multi-day scheduler that coordinates strength, cardio, available days, and recovery.
5. Add optional movement-break support.
6. Add conservative plateau and maintenance states after Trak has enough completion and weight-trend data.

All recommendations remain non-scoring. Only completed training updates Workout Time, Weekly Cardio, and Weekly Muscle Score under the existing accounting rules.

## Implemented decision record

- Added an account-scoped fat-loss activity profile with current activity, comfortable cardio time, preferred modalities, balance/chair comfort, optional movement breaks, and loss/maintenance phase.
- Added the proposed specific cardio modalities and accessible home-strength movements. Existing generic cardio remains as a backward-compatible fallback.
- Fat-loss cardio now uses a staged 30-, 90-, or 150-minute target according to the explicit activity baseline. The 150-minute public-health baseline remains the destination for active users, not an immediate minimum for an inactive beginner.
- Two strength exposures are the default weekly support target. Additional strength frequency remains optional and is governed by time, recovery, preference, and the existing muscle-balance logic.
- Preferred modalities receive recommendation priority; balance concerns, chair comfort, existing limitation text, equipment, location, recent leg training, and vigorous-session history continue to filter choices.
- Completed cardio sessions can add only five minutes beyond the user's stated comfortable duration. Duration, frequency, and intensity are not increased together.
- Added a flexible weekly structure that combines two full-body strength exposures with baseline-appropriate cardio frequency. It is presented as a sequence rather than fixed calendar obligations.
- Added an optional movement-break cue that earns no points and does not inflate Weekly Cardio.
- Added a conservative three-week weight-trend message. It recommends reviewing completion, logging, sleep, and recovery before changing one small lever; it never automatically adds exercise.
- Kept failure coaching gated: beginners and unfamiliar home movements retain 2–3 clean reps in reserve, while the existing technical-failure cue remains limited to suitable familiar exercises.

## Sources

- US Department of Health and Human Services, *Physical Activity Guidelines for Americans, 2nd edition*: https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf
- CDC, *Physical Activity and Your Weight and Health*: https://www.cdc.gov/healthy-weight-growth/physical-activity/
- CDC, *Steps for Getting Started With Physical Activity*: https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html
- NIDDK, *Staying Active at Any Size*: https://www.niddk.nih.gov/health-information/weight-management/staying-active-at-any-size
- NIDDK, *Eating & Physical Activity to Lose or Maintain Weight*: https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity
- WHO, *Guidelines on physical activity and sedentary behaviour*: https://www.who.int/publications/i/item/9789240015128
- Lopez et al. (2022), resistance training and body composition in adults with overweight or obesity: https://pubmed.ncbi.nlm.nih.gov/35191588/
- Murphy et al. (2025), resistance exercise during dietary weight loss: https://pubmed.ncbi.nlm.nih.gov/40909191/
- Binmahfoz et al. (2025), home resistance training during weight loss pilot RCT: https://pubmed.ncbi.nlm.nih.gov/40760444/
- Burgess et al. (2017), determinants of lifestyle-intervention adherence: https://pubmed.ncbi.nlm.nih.gov/28296261/
- Mclaughlin et al. (2023), correlates of activity in adults with overweight or obesity: https://pubmed.ncbi.nlm.nih.gov/37549689/
- Gale et al. (2026), activity breaks and postprandial glucose/insulin: https://pubmed.ncbi.nlm.nih.gov/42070794/
- Liu et al. (2026), aquatic exercise for lower-limb osteoarthritis in adults with overweight or obesity: https://pubmed.ncbi.nlm.nih.gov/42389754/
- American Heart Association, gradual progression and warning symptoms: https://newsroom.heart.org/news/slow-steady-increase-in-exercise-intensity-is-best-for-heart-health-much-more-is-not-always-much-better
