/* global addonWidgetId */
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "getStudySetup" }]*/

/**
 *  Overview:
 *
 *  - constructs a well-formated `studySetup` by use by `browser.study.setup`
 *  - mostly declarative, except that some fields are field at runtime
 *    asynchronously.
 *
 *  Advanced feaures:
 *  - testing overrides from preferences
 *  - expiration time
 *  - some user defined endings.
 *  - study defined 'shouldAllowEnroll' logic.
 */

/** Base for studySetup, as used by `browser.study.setup`.
 *
 * Will be augmented by 'getstudySetup'
 */
const studySetup = {
  // telemetryEnvirment.setActiveExperiment
  activeExperimentName: browser.runtime.id,

  // uses shield|pioneer pipeline, watches those permissions
  studyType: "shield",

  // telemetry
  telemetry: {
    send: true, // assumed false. Actually send pings?
    removeTestingFlag: false, // Marks pings as testing, set true for actual release
  },

  // endings with urls
  endings: {
    /** standard endings */
    "user-disable": {
      baseUrl: "http://www.example.com/?reason=user-disable",
    },
    ineligible: {
      baseUrl: "http://www.example.com/?reason=ineligible",
    },
    expired: {
      baseUrl: "http://www.example.com/?reason=expired",
    },
    dataPermissionsRevoked: {
      baseUrl: null,
      study_state: "ended-neutral",
    },

    /** User defined endings */
    "some-study-defined-ending": {
      study_state: "ended-neutral",
      baseUrl: null,
    },
  },

  // logging
  logLevel: 10,

  /* Study branches and sample weights, overweighing feature branches */
  weightedVariations: [
    {
      name: "feature-active",
      weight: 1.5,
    },
    {
      name: "feature-passive",
      weight: 1.5,
    },
    {
      name: "control",
      weight: 1,
    },
  ],

  //
  expire: {
    days: 14,
  },

  // Optional: testing overrides.
  // Set from prefs in getstudySetup
  testing: {
    variation: null,
    firstRunTimestamp: null,
  },
};

/** Determine, based on common and study-specific criteria, if enroll (first run)
 * should proceed.
 *
 * False values imply that during first run, we should endStudy(`ineligible`)
 *
 * Add your own enrollment criteria as you see fit.
 *
 * (Guards against Normandy or other deployment mistakes or inadequacies)
 *
 * This implementation caches in localstore to speed up second run.
 *
 */
async function shouldAllowEnroll() {
  // Cached answer.  Used on 2nd run
  let allowed = await browser.storage.local.get("allowedToEnroll");
  if (allowed) return true;

  /* First run, we must calculate the answer.
     If false, the study will endStudy with 'ineligible' during `setup`
  */
  // could have other reasons to be eligible, such addons, prefs
  const dataPermissions = await browser.study.dataPermissions();
  allowed = dataPermissions.shield;

  // cache the answer
  await browser.storage.local.set({ allowedToEnroll: allowed });
  return allowed;
}

/** Augment studySetup with a few async values
 *
 */
async function getStudySetup() {
  const id = browser.runtime.id;
  const prefs = {
    variation: `shield.${id}.variation`,
    firstRunTimestamp: `shield.${id}.firstRunTimestamp`,
  };
  prefs;
  studySetup.allowEnroll = await shouldAllowEnroll();
  studySetup.testing = {
    // variation: await browser.prefs.getStringPref(prefs.variation);
    // firstRunTimestamp: await browser.prefs.getStringPref(prefs.firstRunTimestamp);
  };
  return studySetup;
}
